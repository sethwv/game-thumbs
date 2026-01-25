// ------------------------------------------------------------------------------
// ESPNProvider.js
// ESPN sports data provider implementation
// Handles team resolution and data fetching from ESPN APIs
// ------------------------------------------------------------------------------

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, findTeamByAlias, applyTeamOverrides } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
const { normalizeCompact } = require('../helpers/teamUtils');
const logger = require('../helpers/logger');

// Custom error class for team not found errors
class TeamNotFoundError extends Error {
    constructor(teamIdentifier, league, teamList) {
        const teamNames = teamList.map(t => t.shortDisplayName || t.displayName).join(', ');
        super(`Team not found: '${teamIdentifier}' in ${league.shortName.toUpperCase()}. Available teams: ${teamNames}`);
        this.name = 'TeamNotFoundError';
        this.teamIdentifier = teamIdentifier;
        this.league = league.shortName;
        this.availableTeams = teamList;
        this.teamCount = teamList.length;
    }
}

class ESPNProvider extends BaseProvider {
    constructor() {
        super();
        this.teamCache = new Map();
        this.colorCache = new Map(); // Cache for extracted colors
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        this.REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10); // 10 seconds
        this.MAX_COLOR_CACHE_SIZE = 1000; // Prevent unbounded memory growth
        
        // Sport/League cache for unconfigured league fallback
        this.sportLeagueMap = new Map(); // Map<sport, Set<leagueSlug>>
        this.cacheInitialized = false;
        this.CACHE_DIR = path.join(process.cwd(), '.cache', 'providers');
        this.SPORT_LEAGUE_CACHE_FILE = path.join(this.CACHE_DIR, 'espn-sport-league.json');
    }

    getProviderId() {
        return 'espn';
    }

    getLeagueConfig(league) {
        // Check for config in providers array (preferred)
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && (providerConfig.espn || providerConfig.espnConfig)) {
                    return providerConfig.espn || providerConfig.espnConfig;
                }
            }
        }
        
        // DEPRECATED: Check for direct config (for backward compatibility)
        if (league.espn || league.espnConfig) {
            return league.espn || league.espnConfig;
        }
        
        return null;
    }

    async resolveTeam(league, teamIdentifier) {
        if (!league || !teamIdentifier) {
            throw new Error('Both league and team identifier are required');
        }

        const compactInput = normalizeCompact(teamIdentifier);

        const espnConfig = this.getLeagueConfig(league);
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN configuration`);
        }

        try {
            const teams = await this.fetchTeamData(league);

            // First, check if the input matches any custom aliases
            const teamsWithIds = teams.map(team => ({
                ...team,
                espnId: team.team?.slug || team.team?.id
            }));
            
            const aliasMatch = findTeamByAlias(teamIdentifier, league.shortName.toLowerCase(), teamsWithIds);
            
            let bestMatch = null;
            let bestScore = 0;
            
            if (aliasMatch) {
                // Use the alias match as the best match
                bestMatch = aliasMatch;
                bestScore = 1000; // High score for alias matches
            } else {
                // Find best matching team using weighted scoring
                for (const team of teams) {
                    // Convert ESPN team format to standardized format for matching
                    const teamObj = team.team || {};
                    
                    // Extract team slug for override lookup
                    let teamSlug = teamObj.slug || teamObj.id;
                    if (teamSlug && teamSlug.includes('.')) {
                        teamSlug = teamSlug.split('.')[1];
                    }
                    teamSlug = teamSlug?.replace(/_/g, '-');

                    // Fast-path: compare compact input to slug variants (handles missing "state/st")
                    if (teamSlug) {
                        const compactSlug = teamSlug.replace(/[^a-z0-9]/g, '');
                        const slugWithoutState = teamSlug
                            .replace(/-?state\b/gi, '')
                            .replace(/-?st\.?\b/gi, '')
                            .replace(/--+/g, '-')
                            .replace(/^-|-$/g, '');
                        const compactSlugNoState = slugWithoutState.replace(/[^a-z0-9]/g, '');

                        if (
                            compactInput === compactSlug ||
                            compactInput === compactSlugNoState ||
                            compactInput.startsWith(compactSlug) ||
                            compactInput.startsWith(compactSlugNoState)
                        ) {
                            bestMatch = team;
                            bestScore = 1000;
                            continue;
                        }
                    }

                    // Secondary fast-path: compact city + nickname with state removed (e.g., "ferrisbulldogs")
                    const compactCity = normalizeCompact(teamObj.location || '');
                    const compactNick = normalizeCompact(teamObj.nickname || '');
                    const cityNoState = compactCity
                        .replace(/state$/g, '')
                        .replace(/st$/g, '')
                        .replace(/st\.$/g, '');
                    const compactCityNick = compactCity + compactNick;
                    const compactCityNickNoState = cityNoState + compactNick;
                    if (
                        compactInput === compactCityNick ||
                        compactInput === compactCityNickNoState ||
                        compactInput.startsWith(compactCityNick) ||
                        compactInput.startsWith(compactCityNickNoState)
                    ) {
                        bestMatch = team;
                        bestScore = 1000;
                        continue;
                    }
                    
                    const standardizedTeam = {
                        fullName: teamObj.displayName,
                        shortDisplayName: teamObj.shortDisplayName,
                        name: teamObj.nickname,
                        city: teamObj.location,
                        abbreviation: teamObj.abbreviation
                    };
                    
                    const score = getTeamMatchScoreWithOverrides(
                        teamIdentifier,
                        standardizedTeam,
                        teamSlug,
                        league.shortName.toLowerCase()
                    );
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = team;
                    }
                }
            }

            if (!bestMatch || bestScore === 0) {
                // Generate list of acceptable team identifiers
                const teamList = teams.map(team => {
                    const teamObj = team.team || {};
                    return {
                        displayName: teamObj.displayName,
                        shortDisplayName: teamObj.shortDisplayName,
                        abbreviation: teamObj.abbreviation,
                        location: teamObj.location,
                        nickname: teamObj.nickname
                    };
                }).sort((a, b) => a.displayName.localeCompare(b.displayName));

                throw new TeamNotFoundError(teamIdentifier, league, teamList);
            }

            // Return standardized format
            const teamObj = bestMatch.team;

            // Find logo with rel: ["full", "default"]
            const defaultLogo = teamObj.logos?.find(logo =>
                logo.rel?.includes('full') && logo.rel?.includes('default')
            );

            // Find logo with rel: ["full", "dark"]
            const darkLogo = teamObj.logos?.find(logo =>
                logo.rel?.includes('full') && logo.rel?.includes('dark')
            );

            const logoUrl = defaultLogo?.href || teamObj.logos?.[0]?.href;
            
            // Extract colors from logo if not provided by API
            let primaryColor = teamObj.color ? `#${teamObj.color}` : null;
            let alternateColor = teamObj.alternateColor ? `#${teamObj.alternateColor}` : null;
            
            if ((!primaryColor || !alternateColor) && logoUrl) {
                // Check cache first
                const colorCacheKey = `colors_${teamObj.id}`;
                const cachedColors = this.colorCache.get(colorCacheKey);
                
                if (cachedColors && Date.now() - cachedColors.timestamp < this.CACHE_DURATION) {
                    // Use cached colors
                    if (!primaryColor) primaryColor = cachedColors.primary;
                    if (!alternateColor) alternateColor = cachedColors.alternate;
                } else {
                    // Prevent unbounded memory growth in color cache
                    if (this.colorCache.size >= this.MAX_COLOR_CACHE_SIZE) {
                        const entriesToRemove = Math.floor(this.MAX_COLOR_CACHE_SIZE * 0.1);
                        const keys = Array.from(this.colorCache.keys());
                        for (let i = 0; i < entriesToRemove; i++) {
                            this.colorCache.delete(keys[i]);
                        }
                    }
                    
                    // Extract colors from logo
                    try {
                        const extractedColors = await extractDominantColors(logoUrl, 2);
                        const extractedPrimary = extractedColors[0];
                        const extractedAlternate = extractedColors[1];
                        
                        // Cache the extracted colors
                        this.colorCache.set(colorCacheKey, {
                            primary: extractedPrimary,
                            alternate: extractedAlternate,
                            timestamp: Date.now()
                        });
                        
                        if (!primaryColor) primaryColor = extractedPrimary;
                        if (!alternateColor) alternateColor = extractedAlternate;
                    } catch (error) {
                        logger.warn('Failed to extract colors', { team: teamObj.displayName, error: error.message });
                        // Fall back to black and white if extraction fails
                        if (!primaryColor) primaryColor = '#000000';
                        if (!alternateColor) alternateColor = '#ffffff';
                    }
                }
            }
            
            // Final fallback if still no colors
            if (!primaryColor) primaryColor = '#000000';
            if (!alternateColor) alternateColor = '#ffffff';

            const teamData = {
                id: teamObj.id,
                slug: teamObj.slug,
                city: teamObj.location,
                name: teamObj.nickname,
                fullName: teamObj.displayName,
                abbreviation: teamObj.abbreviation,
                conference: teamObj.groups?.find(g => g.id)?.name,
                division: teamObj.groups?.find(g => g.parent?.id)?.name,
                logo: logoUrl,
                logoAlt: darkLogo?.href,
                color: primaryColor,
                alternateColor: alternateColor
            };

            // Apply overrides from teams.json
            let teamIdentifierForOverride = teamObj.slug || teamObj.id;
            // Extract slug without league prefix (e.g., 'eng.nottm_forest' -> 'nottm-forest')
            if (teamIdentifierForOverride && teamIdentifierForOverride.includes('.')) {
                teamIdentifierForOverride = teamIdentifierForOverride.split('.')[1];
            }
            // Normalize underscores to hyphens
            teamIdentifierForOverride = teamIdentifierForOverride?.replace(/_/g, '-');
            return applyTeamOverrides(teamData, league.shortName.toLowerCase(), teamIdentifierForOverride);
        } catch (error) {
            // Re-throw TeamNotFoundError as-is to preserve error type
            if (error instanceof TeamNotFoundError) {
                throw error;
            }
            throw new Error(`Failed to resolve team: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        const espnConfig = this.getLeagueConfig(league);
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN configuration`);
        }

        // Check if league has custom logo URLs defined
        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        if (league.logoUrl) {
            return league.logoUrl;
        }

        // Otherwise, fetch from ESPN API
        try {
            const leagueData = await this.fetchLeagueData(league);
            
            const defaultLogo = leagueData.logos?.find(logo =>
                logo.rel?.includes('full') && logo.rel?.includes('default')
            )?.href;
            
            const darkLogo = leagueData.logos?.find(logo =>
                logo.rel?.includes('full') && logo.rel?.includes('dark')
            )?.href;

            return darkLogoPreferred ? (darkLogo || defaultLogo) : (defaultLogo || darkLogo) 
                || `https://a.espncdn.com/i/teamlogos/leagues/500/${league.shortName.toLowerCase()}.png`;
        } catch (error) {
            logger.warn('Failed to get league logo', { league: league.shortName, error: error.message });
            // Fallback to ESPN CDN logo
            return `https://a.espncdn.com/i/teamlogos/leagues/500/${league.shortName.toLowerCase()}.png`;
        }
    }

    clearCache() {
        this.teamCache.clear();
        this.colorCache.clear();
    }

    // ------------------------------------------------------------------------------
    // Sport/League cache for unconfigured league fallback
    // ------------------------------------------------------------------------------

    /**
     * Initialize the sport/league cache by fetching all ESPN sports and their leagues
     */
    async initializeSportLeagueCache() {
        if (this.cacheInitialized) {
            logger.info('ESPN sport/league cache already initialized');
            return;
        }

        // Try to load from cache file first
        const cached = await this.loadSportLeagueCacheFromFile();
        if (cached) {
            this.sportLeagueMap = cached.sportLeagueMap;
            this.cacheInitialized = true;
            const totalLeagues = Array.from(this.sportLeagueMap.values()).reduce((sum, set) => sum + set.size, 0);
            logger.info(`ESPN sport/league cache loaded from file: ${this.sportLeagueMap.size} sports, ${totalLeagues} leagues`);
            return;
        }

        logger.info('Initializing ESPN sport/league cache...');
        
        // Fetch all available sports from ESPN Core API
        const sports = await this.fetchAllSports();
        
        if (sports.length === 0) {
            logger.warn('No sports discovered from ESPN API');
            this.cacheInitialized = true;
            return;
        }

        let totalLeagues = 0;

        for (const sport of sports) {
            try {
                const leagues = await this.fetchLeaguesForSport(sport);
                if (leagues.size > 0) {
                    this.sportLeagueMap.set(sport, leagues);
                    totalLeagues += leagues.size;
                }
            } catch (error) {
                logger.warn(`Failed to fetch leagues for sport: ${sport}`, { error: error.message });
            }
        }

        this.cacheInitialized = true;
        
        // Save to cache file
        await this.saveSportLeagueCacheToFile();
        
        logger.info(`ESPN sport/league cache initialized: ${sports.length} sports, ${totalLeagues} leagues`);
    }

    /**
     * Load sport/league cache from file
     * @returns {Promise<Object|null>} Cached data or null if not available
     */
    async loadSportLeagueCacheFromFile() {
        try {
            const data = await fs.readFile(this.SPORT_LEAGUE_CACHE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            
            // Convert arrays back to Sets
            const sportLeagueMap = new Map();
            for (const [sport, leagues] of Object.entries(parsed.sportLeagueMap)) {
                sportLeagueMap.set(sport, new Set(leagues));
            }
            
            return { sportLeagueMap };
        } catch (error) {
            // File doesn't exist or is invalid
            return null;
        }
    }

    /**
     * Save sport/league cache to file
     */
    async saveSportLeagueCacheToFile() {
        try {
            await fs.mkdir(this.CACHE_DIR, { recursive: true });
            
            // Convert Sets to arrays for JSON serialization
            const sportLeagueObj = {};
            for (const [sport, leagues] of this.sportLeagueMap.entries()) {
                sportLeagueObj[sport] = Array.from(leagues);
            }
            
            const cacheData = {
                sportLeagueMap: sportLeagueObj,
                timestamp: Date.now()
            };
            
            await fs.writeFile(this.SPORT_LEAGUE_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
        } catch (error) {
            logger.warn('Failed to write sport/league cache file', { error: error.message });
        }
    }

    /**
     * Fetch all available sports from ESPN Core API
     * @returns {Promise<string[]>} Array of sport slugs
     */
    async fetchAllSports() {
        const sports = [];

        try {
            const url = 'https://sports.core.api.espn.com/v2/sports?limit=1000';
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'game-thumbs-api/1.0'
                }
            });

            // ESPN Core API returns sports in items array with $ref URLs
            // Format: http://sports.core.api.espn.com/v2/sports/baseball?lang=en&region=us
            if (response.data?.items) {
                for (const item of response.data.items) {
                    const sportUrl = item.$ref;
                    if (sportUrl) {
                        // Extract slug between /sports/ and ?
                        const match = sportUrl.match(/\/sports\/([^?]+)/);
                        if (match && match[1]) {
                            sports.push(match[1]);
                        }
                    }
                }
            }

        } catch (error) {
            logger.error('Failed to fetch sports from ESPN Core API', { error: error.message });
        }

        return sports;
    }

    /**
     * Fetch all leagues for a specific sport from ESPN API
     * @param {string} sport - ESPN sport slug
     * @returns {Set<string>} Set of league slugs
     */
    async fetchLeaguesForSport(sport) {
        const leagues = new Set();

        try {
            // Use ESPN Core API with high limit to get all leagues
            const url = `https://sports.core.api.espn.com/v2/sports/${sport}/leagues?limit=1000`;
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'game-thumbs-api/1.0'
                }
            });

            // ESPN Core API returns leagues in items array with $ref URLs
            // Format: http://sports.core.api.espn.com/v2/sports/football/leagues/nfl?lang=en&region=us
            if (response.data?.items) {
                for (const item of response.data.items) {
                    const leagueUrl = item.$ref;
                    if (leagueUrl) {
                        // Extract slug between /leagues/ and ?
                        const match = leagueUrl.match(/\/leagues\/([^?]+)/);
                        if (match && match[1]) {
                            leagues.add(match[1]);
                        }
                    }
                }
            }

        } catch (error) {
            logger.warn(`Failed to fetch leagues for sport: ${sport}`, { error: error.message });
        }

        return leagues;
    }

    /**
     * Check if this provider can handle an unconfigured league
     * @param {string} leagueSlug - League slug to check
     * @returns {{ canHandle: boolean, sport?: string }} Object indicating if provider can handle the league
     */
    canHandleUnconfiguredLeague(leagueSlug) {
        if (!this.cacheInitialized) {
            logger.warn('ESPN cache not initialized yet, cannot check unconfigured league', { league: leagueSlug });
            return { canHandle: false };
        }

        // Search for the league in the sport/league cache
        for (const [sport, leagues] of this.sportLeagueMap.entries()) {
            if (leagues.has(leagueSlug)) {
                return { canHandle: true, sport };
            }
        }

        return { canHandle: false };
    }

    /**
     * Get configuration for an unconfigured league
     * @param {string} leagueSlug - League slug
     * @param {string} sport - ESPN sport slug
     * @returns {object} Temporary league configuration object
     */
    getUnconfiguredLeagueConfig(leagueSlug, sport) {
        return {
            shortName: leagueSlug.toUpperCase(),
            name: leagueSlug.toUpperCase(),
            providerId: 'espn',
            providers: [
                {
                    espn: {
                        espnSport: sport,
                        espnSlug: leagueSlug
                    }
                }
            ],
            _isESPNFallback: true
        };
    }

    // ------------------------------------------------------------------------------
    // Private helper methods
    // ------------------------------------------------------------------------------

    async fetchTeamData(league) {
        const cacheKey = `${league.shortName}_teams`;
        const cached = this.teamCache.get(cacheKey);

        // Return cached data if still valid
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        const espnConfig = this.getLeagueConfig(league);
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN configuration`);
        }
        const { espnSport, espnSlug } = espnConfig;
        const teamApiUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnSlug}/teams?limit=1000`;
        
        try {
            const response = await axios.get(teamApiUrl, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            const teams = response.data.sports?.[0]?.leagues?.[0]?.teams || [];
            
            // Cache the data
            this.teamCache.set(cacheKey, {
                data: teams,
                timestamp: Date.now()
            });
            
            return teams;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching teams for ${league.shortName}`);
        }
    }

    async fetchLeagueData(league) {
        const cacheKey = `${league.shortName}_league`;
        const cached = this.teamCache.get(cacheKey);

        // Return cached data if still valid
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        const espnConfig = this.getLeagueConfig(league);
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN configuration`);
        }
        const { espnSport, espnSlug } = espnConfig;
        const leagueApiUrl = `https://sports.core.api.espn.com/v2/sports/${espnSport}/leagues/${espnSlug}`;
        
        try {
            const response = await axios.get(leagueApiUrl, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            // Cache the data
            this.teamCache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            
            return response.data;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching league data for ${league.shortName}`);
        }
    }


}

// Export singleton instance for use across the app (e.g., leagues.js)
// and the class for ProviderManager to instantiate
const sharedInstance = new ESPNProvider();
module.exports = sharedInstance;
module.exports.ESPNProvider = ESPNProvider;
module.exports.default = sharedInstance;

// ------------------------------------------------------------------------------