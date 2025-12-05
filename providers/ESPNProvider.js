// ------------------------------------------------------------------------------
// ESPNProvider.js
// ESPN sports data provider implementation
// Handles team resolution and data fetching from ESPN APIs
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, findTeamByAlias, applyTeamOverrides } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
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
    }

    getProviderId() {
        return 'espn';
    }

    getSupportedLeagues() {
        // return [
        //     'nba', 'wnba', 'nfl', 'ufl', 'mlb', 'nhl', 
        //     'epl', 'mls', 'uefa', 'ncaaf', 'ncaam', 'ncaaw'
        // ];
        const { leagues } = require('../leagues');
        return Object.keys(leagues).filter(key => leagues[key].providerId === this.getProviderId());
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
            if (aliasMatch) {
                // Use the alias match as the best match
                var bestMatch = aliasMatch;
                var bestScore = 1000; // High score for alias matches
            } else {
                // Find best matching team using weighted scoring
                var bestMatch = null;
                var bestScore = 0;

                for (const team of teams) {
                    // Convert ESPN team format to standardized format for matching
                    const teamObj = team.team || {};
                    
                    // Extract team slug for override lookup
                    let teamSlug = teamObj.slug || teamObj.id;
                    if (teamSlug && teamSlug.includes('.')) {
                        teamSlug = teamSlug.split('.')[1];
                    }
                    teamSlug = teamSlug?.replace(/_/g, '-');
                    
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
            throw new Error(`API request failed: ${error.message}`);
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
            throw new Error(`League API request failed: ${error.message}`);
        }
    }


}

module.exports = ESPNProvider;

// ------------------------------------------------------------------------------