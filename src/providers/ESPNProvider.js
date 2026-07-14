// ------------------------------------------------------------------------------
// ESPNProvider.js
// ESPN sports data provider implementation
// Handles team resolution and data fetching from ESPN APIs
// ------------------------------------------------------------------------------

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, findTeamByAlias, applyTeamOverrides, normalizeCompact } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
const logger = require('../helpers/logger');
const fsCache = require('../helpers/fsCache');
const { TeamNotFoundError } = require('../helpers/errors');
const { REQUEST_TIMEOUT } = require('../helpers/requestConfig');

const ESPN_CORE_API = 'https://sports.core.api.espn.com/v2';

// Bounded scan of ESPN's small, stable group IDs (conferences/divisions/special
// groupings) to find whichever one is named "All-Star" for a given league.
// These IDs are league-specific but always small (single digits to low teens
// in every league checked), so this stays cheap without hardcoding any of them.
const ALL_STAR_GROUP_PROBE_LIMIT = 20;
const ALL_STAR_NAME_PATTERN = /all[\s-]?star/i;

// ESPN accumulates a "team" object for every historical All-Star format a league
// has used (conference vs. conference, rookie/sophomore challenges, one-off
// captain-drafted rosters, etc.) under the same group, with no reliable field
// marking which one is current. After filtering to permanent (isActive: false)
// entries and de-duping by abbreviation, a clean pairing (e.g. AL/NL, AFC/NFC)
// collapses to a small set; a league with many disjoint historical formats
// (e.g. NBA's yearly re-captained rosters) won't, so it's skipped rather than
// guessing which pair is "current."
const MAX_ALL_STAR_TEAMS_PER_LEAGUE = 4;

// Bump whenever fetchTeamData's cached shape changes (e.g. new fields merged
// in, like the All-Star pseudo-teams) so a stale pre-deploy entry sitting in
// the persistent .cache volume gets bypassed instead of served for up to
// CACHE_DURATION after a deploy.
const TEAM_DATA_CACHE_VERSION = 'v2';

// A failed All-Star group/season-type probe (e.g. one transient ESPN
// rate-limit/timeout during the 20-way concurrent scan) shouldn't be
// remembered as long as a successful one — keep negative results in a
// short-lived in-memory cache instead of the 24h fsCache so they self-heal.
const ALL_STAR_NEGATIVE_CACHE_DURATION_MS = 15 * 60 * 1000;

class ESPNProvider extends BaseProvider {
    constructor() {
        super();
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        this.REQUEST_TIMEOUT = REQUEST_TIMEOUT;

        // Sport/League cache for unconfigured league fallback
        this.sportLeagueMap = new Map(); // Map<sport, Set<leagueSlug>>
        this.cacheInitialized = false;
        this.CACHE_DIR = path.join(process.cwd(), '.cache', 'providers');
        this.SPORT_LEAGUE_CACHE_FILE = path.join(this.CACHE_DIR, 'espn-sport-league.json');

        // In-memory negative-result cache for All-Star group/season-type discovery
        // (see ALL_STAR_NEGATIVE_CACHE_DURATION_MS). Map<cacheKey, timestampMs>.
        this._allStarNegativeCache = new Map();
    }

    getProviderId() {
        return 'espn';
    }

    getConfigKey() {
        return ['espn', 'espnConfig'];
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
                    // Exact slug match scores 1000; startsWith scores 800 (lower priority so a
                    // more-specific exact match elsewhere can still beat it)
                    if (teamSlug && bestScore < 1000) {
                        const compactSlug = teamSlug.replace(/[^a-z0-9]/g, '');
                        const slugWithoutState = teamSlug
                            .replace(/-?state\b/gi, '')
                            .replace(/-?st\.?\b/gi, '')
                            .replace(/--+/g, '-')
                            .replace(/^-|-$/g, '');
                        const compactSlugNoState = slugWithoutState.replace(/[^a-z0-9]/g, '');

                        if (compactInput === compactSlug || compactInput === compactSlugNoState) {
                            bestMatch = team;
                            bestScore = 1000;
                            continue;
                        }
                        if (bestScore < 800 && (
                            compactInput.startsWith(compactSlug) ||
                            compactInput.startsWith(compactSlugNoState)
                        )) {
                            bestScore = 800;
                            bestMatch = team;
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
                    if (bestScore < 1000 && (
                        compactInput === compactCityNick ||
                        compactInput === compactCityNickNoState
                    )) {
                        bestMatch = team;
                        bestScore = 1000;
                        continue;
                    }
                    if (bestScore < 800 && (
                        compactInput.startsWith(compactCityNick) ||
                        compactInput.startsWith(compactCityNickNoState)
                    )) {
                        bestScore = 800;
                        bestMatch = team;
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
                // Check filesystem cache for previously extracted colors
                const colorCacheKey = `colors_${league.shortName}_${teamObj.id}`;
                const cachedColors = fsCache.getJSON('espn-colors', colorCacheKey, this.CACHE_DURATION);
                
                if (cachedColors) {
                    // Use cached colors
                    if (!primaryColor) primaryColor = cachedColors.primary;
                    if (!alternateColor) alternateColor = cachedColors.alternate;
                } else {
                    // Extract colors from logo
                    try {
                        const extractedColors = await extractDominantColors(logoUrl, 2);
                        const extractedPrimary = extractedColors[0];
                        const extractedAlternate = extractedColors[1];
                        
                        // Cache the extracted colors to filesystem
                        fsCache.setJSON('espn-colors', colorCacheKey, {
                            primary: extractedPrimary,
                            alternate: extractedAlternate
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

            // Individually-fetched teams (see fetchExtraTeams) return `groups` as a
            // single object rather than the array the bulk teams list returns.
            const teamGroups = Array.isArray(teamObj.groups)
                ? teamObj.groups
                : (teamObj.groups ? [teamObj.groups] : []);

            const teamData = {
                id: teamObj.id,
                slug: teamObj.slug,
                city: teamObj.location,
                name: teamObj.nickname,
                fullName: teamObj.displayName,
                abbreviation: teamObj.abbreviation,
                conference: teamGroups.find(g => g.id)?.name,
                division: teamGroups.find(g => g.parent?.id)?.name,
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
        fsCache.clearSubdir('espn');
        fsCache.clearSubdir('espn-colors');
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
        const cacheKey = `${league.shortName}_teams_${TEAM_DATA_CACHE_VERSION}`;

        // Return cached data from filesystem if still valid
        const cached = fsCache.getJSON('espn', cacheKey, this.CACHE_DURATION);
        if (cached) {
            return cached;
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

            let teams = response.data.sports?.[0]?.leagues?.[0]?.teams || [];

            // Some leagues have permanent teams ESPN excludes from the bulk list
            // (e.g. MLB's American/National All-Stars, NFL's AFC/NFC Pro Bowl teams).
            // Discover them dynamically via ESPN's own "All-Star" group rather than
            // a hardcoded ID list, and merge them in so they resolve through the
            // same matching/color-extraction logic as any real team.
            const allStarTeams = await this.discoverAllStarTeams(league, espnSport, espnSlug);
            teams = teams.concat(allStarTeams);

            // Cache to filesystem
            fsCache.setJSON('espn', cacheKey, teams);

            return teams;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching teams for ${league.shortName}`);
        }
    }

    /**
     * Discover a league's permanent All-Star pseudo-teams (e.g. MLB's AL/NL,
     * NFL's AFC/NFC, MLS's/Liga MX's All-Star Game sides) purely from ESPN's
     * own data, with no per-league configuration. Tries the group-based
     * strategy first (works for leagues that model All-Star as a standings
     * "group", e.g. MLB/NFL); if that finds nothing, falls back to the
     * season-type strategy (works for leagues that model it as a season
     * "type"/event instead, e.g. soccer's MLS/Liga MX All-Star Game).
     * @param {object} league - League object (used for cache-keying league data)
     * @param {string} espnSport - ESPN sport slug
     * @param {string} espnSlug - ESPN league slug
     * @returns {Promise<Array>} Team entries in the same { team: {...} } shape as the bulk list
     */
    async discoverAllStarTeams(league, espnSport, espnSlug) {
        try {
            const leagueData = await this.fetchLeagueData(league);
            const seasonYear = leagueData?.season?.year;
            if (!seasonYear) {
                return [];
            }

            const groupTeams = await this.discoverAllStarTeamsFromGroup(espnSport, espnSlug, seasonYear, leagueData.season);
            if (groupTeams.length > 0) {
                return groupTeams;
            }

            return await this.discoverAllStarTeamsFromSeasonType(espnSport, espnSlug, seasonYear);
        } catch (error) {
            logger.warn('Failed to discover ESPN All-Star teams', { espnSport, espnSlug, error: error.message });
            return [];
        }
    }

    /**
     * Discover All-Star pseudo-teams via ESPN's "group" concept (divisions,
     * conferences, and, in some leagues, one named "All-Star"); finds that
     * group and fetches its member teams, then narrows them down to this
     * season's actual pairing/lineup using two strategies:
     *  1. Permanent (isActive: false), stably-abbreviated entries (e.g. MLB's
     *     AL/NL, NFL's AFC/NFC) — the group already collapses to a small set.
     *  2. Otherwise, leagues whose All-Star format is redrafted/relabeled every
     *     year (e.g. NBA's captain-picked teams, NHL's occasional "4 Nations"-
     *     style one-offs) pile up years of disjoint entries under the same
     *     group with no reliable "current" marker — so instead this picks out
     *     whichever entries have a `nextEvent` landing inside the *current*
     *     season's date window, which is exactly this year's participants
     *     regardless of naming scheme or team count.
     * @param {string} espnSport - ESPN sport slug
     * @param {string} espnSlug - ESPN league slug
     * @param {number} seasonYear - Current season year
     * @param {object} [season] - Current season object (for its startDate/endDate window)
     * @returns {Promise<Array>} Team entries in the same { team: {...} } shape as the bulk list
     */
    async discoverAllStarTeamsFromGroup(espnSport, espnSlug, seasonYear, season) {
        const groupId = await this.findAllStarGroupId(espnSport, espnSlug);
        if (!groupId) {
            return [];
        }

        const groupTeamsUrl = `${ESPN_CORE_API}/sports/${espnSport}/leagues/${espnSlug}/seasons/${seasonYear}/types/2/groups/${groupId}/teams?limit=100&lang=en&region=us`;
        const groupTeamsResponse = await axios.get(groupTeamsUrl, {
            timeout: this.REQUEST_TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const teamIds = (groupTeamsResponse.data.items || [])
            .map(item => item.$ref?.match(/\/teams\/(\d+)/)?.[1])
            .filter(Boolean);

        if (teamIds.length === 0) {
            return [];
        }

        const fetchedTeams = await this.fetchTeamsByIds(espnSport, espnSlug, teamIds);

        // Strategy 1: permanent conference/all-star pseudo-teams are consistently
        // isActive: false; one-off captain-drafted rosters seen alongside them
        // (e.g. NFL's "Team Rice"/"Team Irvin") are isActive: true, so this drops
        // those.
        const permanentTeams = fetchedTeams.filter(({ team }) => team.isActive === false);

        // De-dupe by abbreviation, keeping the lowest (oldest/original) team ID
        // per abbreviation, since ESPN re-issues fresh team IDs for the same
        // concept (e.g. a duplicate AFC/NFC pair) across the years.
        const byAbbreviation = new Map();
        for (const entry of permanentTeams) {
            const key = (entry.team.abbreviation || entry.team.displayName || '').toUpperCase();
            const existing = byAbbreviation.get(key);
            if (!existing || Number(entry.team.id) < Number(existing.team.id)) {
                byAbbreviation.set(key, entry);
            }
        }

        const deduped = Array.from(byAbbreviation.values());
        if (deduped.length > 0 && deduped.length <= MAX_ALL_STAR_TEAMS_PER_LEAGUE) {
            return deduped;
        }

        // Strategy 2: a league with many distinct historical All-Star formats
        // (e.g. NBA's yearly re-captained rosters) won't collapse via Strategy 1;
        // instead identify this year's actual entries by their most recent
        // scheduled game falling inside the current season's window.
        const seasonStart = season?.startDate ? new Date(season.startDate) : null;
        const seasonEnd = season?.endDate ? new Date(season.endDate) : null;
        if (seasonStart && seasonEnd) {
            const currentTeams = fetchedTeams.filter(({ team }) => {
                const eventDate = team.nextEvent?.[0]?.date ? new Date(team.nextEvent[0].date) : null;
                return eventDate && eventDate >= seasonStart && eventDate <= seasonEnd;
            });
            if (currentTeams.length > 0 && currentTeams.length <= MAX_ALL_STAR_TEAMS_PER_LEAGUE) {
                return currentTeams;
            }
        }

        // Neither strategy found a clean, current set; skip rather than guessing.
        return [];
    }

    /**
     * Find the group ID ESPN uses for a league's "All-Star" grouping by
     * scanning its small set of stable group IDs (divisions/conferences/etc.)
     * @param {string} espnSport - ESPN sport slug
     * @param {string} espnSlug - ESPN league slug
     * @returns {Promise<number|null>} The group ID, or null if not found
     */
    async findAllStarGroupId(espnSport, espnSlug) {
        const cacheKey = `${espnSport}_${espnSlug}_allstar_group`;
        const cached = fsCache.getJSON('espn', cacheKey, this.CACHE_DURATION);
        if (cached !== null) {
            return cached.groupId;
        }
        if (this._hasFreshAllStarNegativeCache(cacheKey)) {
            return null;
        }

        const ids = Array.from({ length: ALL_STAR_GROUP_PROBE_LIMIT }, (_, i) => i + 1);
        const results = await Promise.all(ids.map(async (id) => {
            try {
                const url = `${ESPN_CORE_API}/sports/${espnSport}/leagues/${espnSlug}/groups/${id}?lang=en&region=us`;
                const response = await axios.get(url, {
                    timeout: this.REQUEST_TIMEOUT,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const group = response.data;
                if (group && !group.error && ALL_STAR_NAME_PATTERN.test(group.name || group.abbreviation || '')) {
                    return id;
                }
                return null;
            } catch (error) {
                return null;
            }
        }));

        const matches = results.filter(id => id !== null);
        const groupId = matches.length > 0 ? Math.min(...matches) : null;

        if (groupId !== null) {
            fsCache.setJSON('espn', cacheKey, { groupId });
        } else {
            this._allStarNegativeCache.set(cacheKey, Date.now());
        }
        return groupId;
    }

    /**
     * Discover All-Star pseudo-teams via ESPN's "season type" concept
     * (Regular Season, Playoffs, and, in leagues like soccer's MLS/Liga MX,
     * one named "All-Star Game"). Finds that season type's date window, looks
     * up the scoreboard event(s) within it whose name matches "All-Star", and
     * takes their competitor teams as the pseudo-teams. Used as a fallback
     * for leagues where All-Star isn't modeled as a "group" (e.g. soccer,
     * where the pseudo-teams also report isActive: true rather than false).
     * @param {string} espnSport - ESPN sport slug
     * @param {string} espnSlug - ESPN league slug
     * @param {number} seasonYear - Current season year
     * @returns {Promise<Array>} Team entries in the same { team: {...} } shape as the bulk list
     */
    async discoverAllStarTeamsFromSeasonType(espnSport, espnSlug, seasonYear) {
        const seasonType = await this.findAllStarSeasonType(espnSport, espnSlug, seasonYear);
        if (!seasonType?.startDate || !seasonType?.endDate) {
            return [];
        }

        // Pad by a day on each side to absorb timezone edges between the season
        // type's UTC window and the scoreboard's local event date.
        const toDateParam = (isoDate, offsetDays) => {
            const date = new Date(isoDate);
            date.setUTCDate(date.getUTCDate() + offsetDays);
            return date.toISOString().slice(0, 10).replace(/-/g, '');
        };
        const dateRange = `${toDateParam(seasonType.startDate, -1)}-${toDateParam(seasonType.endDate, 1)}`;

        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnSlug}/scoreboard?dates=${dateRange}`;
        const scoreboardResponse = await axios.get(scoreboardUrl, {
            timeout: this.REQUEST_TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const teamIds = new Set();
        for (const event of scoreboardResponse.data.events || []) {
            if (!ALL_STAR_NAME_PATTERN.test(event.name || '')) {
                continue;
            }
            for (const competition of event.competitions || []) {
                for (const competitor of competition.competitors || []) {
                    if (competitor.team?.id) {
                        teamIds.add(competitor.team.id);
                    }
                }
            }
        }

        if (teamIds.size === 0 || teamIds.size > MAX_ALL_STAR_TEAMS_PER_LEAGUE) {
            return [];
        }

        return await this.fetchTeamsByIds(espnSport, espnSlug, Array.from(teamIds));
    }

    /**
     * Find the season type ESPN uses for a league's "All-Star Game" by
     * scanning its small set of stable season type IDs (regular season,
     * playoffs, etc.)
     * @param {string} espnSport - ESPN sport slug
     * @param {string} espnSlug - ESPN league slug
     * @param {number} seasonYear - Current season year
     * @returns {Promise<object|null>} The season type object, or null if not found
     */
    async findAllStarSeasonType(espnSport, espnSlug, seasonYear) {
        const cacheKey = `${espnSport}_${espnSlug}_${seasonYear}_allstar_type`;
        const cached = fsCache.getJSON('espn', cacheKey, this.CACHE_DURATION);
        if (cached !== null) {
            return cached.seasonType;
        }
        if (this._hasFreshAllStarNegativeCache(cacheKey)) {
            return null;
        }

        // Season types are 0-indexed (0 = "Combined", 1 = "Regular Season", ...).
        const ids = Array.from({ length: ALL_STAR_GROUP_PROBE_LIMIT }, (_, i) => i);
        const results = await Promise.all(ids.map(async (id) => {
            try {
                const url = `${ESPN_CORE_API}/sports/${espnSport}/leagues/${espnSlug}/seasons/${seasonYear}/types/${id}?lang=en&region=us`;
                const response = await axios.get(url, {
                    timeout: this.REQUEST_TIMEOUT,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const type = response.data;
                if (type && !type.error && ALL_STAR_NAME_PATTERN.test(type.name || type.abbreviation || '')) {
                    return type;
                }
                return null;
            } catch (error) {
                return null;
            }
        }));

        const seasonType = results.find(type => type !== null) || null;

        if (seasonType !== null) {
            fsCache.setJSON('espn', cacheKey, { seasonType });
        } else {
            this._allStarNegativeCache.set(cacheKey, Date.now());
        }
        return seasonType;
    }

    /**
     * Check whether a negative All-Star group/season-type discovery result is
     * still within its short in-memory TTL (see ALL_STAR_NEGATIVE_CACHE_DURATION_MS).
     * @param {string} cacheKey
     * @returns {boolean}
     */
    _hasFreshAllStarNegativeCache(cacheKey) {
        const cachedAt = this._allStarNegativeCache.get(cacheKey);
        return cachedAt !== undefined && (Date.now() - cachedAt) < ALL_STAR_NEGATIVE_CACHE_DURATION_MS;
    }

    /**
     * Fetch individual teams by ID
     * @param {string} espnSport - ESPN sport slug
     * @param {string} espnSlug - ESPN league slug
     * @param {(string|number)[]} teamIds - Team IDs to fetch
     * @returns {Promise<Array>} Team entries in the same { team: {...} } shape as the bulk list
     */
    async fetchTeamsByIds(espnSport, espnSlug, teamIds) {
        const results = await Promise.all(teamIds.map(async (id) => {
            try {
                const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnSlug}/teams/${id}`;
                const response = await axios.get(url, {
                    timeout: this.REQUEST_TIMEOUT,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                return response.data.team ? { team: response.data.team } : null;
            } catch (error) {
                logger.warn('Failed to fetch ESPN team by id', { espnSport, espnSlug, id, error: error.message });
                return null;
            }
        }));

        return results.filter(Boolean);
    }

    async fetchLeagueData(league) {
        const cacheKey = `${league.shortName}_league`;

        // Return cached data from filesystem if still valid
        const cached = fsCache.getJSON('espn', cacheKey, this.CACHE_DURATION);
        if (cached) {
            return cached;
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
            
            // Cache to filesystem
            fsCache.setJSON('espn', cacheKey, response.data);
            
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