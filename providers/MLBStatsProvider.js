// ------------------------------------------------------------------------------
// MLBStatsProvider.js
// MLB StatsAPI provider implementation
// Handles team resolution for MiLB, KBO, NPB, and other baseball leagues
// via the free MLB StatsAPI (statsapi.mlb.com)
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, generateSlug, findTeamByAlias, applyTeamOverrides } = require('../helpers/teamUtils');
const { rasterizeLogo, extractPalette } = require('../helpers/svgUtils');
const logger = require('../helpers/logger');
const fsCache = require('../helpers/fsCache');

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

// Custom error class for team not found errors
class TeamNotFoundError extends Error {
    constructor(teamIdentifier, league, teamList) {
        const teamNames = teamList.map(t => t.name).join(', ');
        super(`Team not found: '${teamIdentifier}' in ${league.shortName.toUpperCase()}. Available teams: ${teamNames}`);
        this.name = 'TeamNotFoundError';
        this.teamIdentifier = teamIdentifier;
        this.league = league.shortName;
        this.availableTeams = teamList;
        this.teamCount = teamList.length;
    }
}

class MLBStatsProvider extends BaseProvider {
    constructor() {
        super();
        this.TEAM_CACHE_DURATION = 24 * 60 * 60 * 1000;     // 24 hours
        this.LOGO_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.BASE_URL = 'https://statsapi.mlb.com/api/v1';
        this.LOGO_BASE_URL = 'https://www.mlbstatic.com/team-logos';
    }

    getProviderId() {
        return 'mlbstats';
    }

    /**
     * Get MLBStats-specific config from a league's providers array
     * @param {Object} league - League object
     * @returns {Object|null} Config with sportId, or null
     */
    getLeagueConfig(league) {
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && providerConfig.mlbStats) {
                    return providerConfig.mlbStats;
                }
            }
        }
        return null;
    }

    /**
     * Resolve a team by league and identifier
     * @param {Object} league - League object with mlbStats config
     * @param {string} teamIdentifier - Team name, abbreviation, or other identifier
     * @returns {Promise<Object>} Standardized team object
     */
    async resolveTeam(league, teamIdentifier) {
        try {
            const teams = await this.fetchTeamData(league);

            // Build team objects with slugs for alias matching
            const teamsWithSlugs = teams.map(t => ({
                ...t,
                slug: generateSlug(t.name)
            }));

            // Check alias match first
            const aliasMatch = findTeamByAlias(teamIdentifier, league.shortName.toLowerCase(), teamsWithSlugs);

            let bestMatch = null;
            let bestScore = 0;

            if (aliasMatch) {
                bestMatch = teams.find(t => t.id === aliasMatch.id);
                bestScore = 1000;
            } else {
                // Score each team against the input
                for (const team of teams) {
                    const teamSlug = generateSlug(team.name);
                    const standardizedTeam = {
                        fullName: team.name,
                        name: team.teamName,
                        city: team.locationName || team.shortName || '',
                        abbreviation: team.abbreviation
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

            // Require a minimum match score (300 out of 1000)
            if (!bestMatch || bestScore < 300) {
                throw new TeamNotFoundError(teamIdentifier, league, teams);
            }

            // Fetch and process logo (SVG -> PNG + color extraction)
            const logoData = await this.fetchAndProcessLogo(bestMatch.id);

            const teamSlug = generateSlug(bestMatch.name);
            const teamData = {
                id: bestMatch.id,
                slug: teamSlug,
                city: bestMatch.locationName || bestMatch.shortName || '',
                name: bestMatch.teamName,
                fullName: bestMatch.name,
                abbreviation: bestMatch.abbreviation,
                conference: bestMatch.league?.name || null,
                division: bestMatch.division?.name || null,
                logo: logoData.svgUrl,  // HTTP URL (like other providers)
                _logoPng: logoData.pngBase64,  // Internal data URL for image generation
                logoAlt: null,
                color: logoData.color,
                alternateColor: logoData.alternateColor,
                providerId: this.getProviderId(),
                providerData: {
                    parentOrgName: bestMatch.parentOrgName || null,
                    parentOrgId: bestMatch.parentOrgId || null,
                    sportId: bestMatch.sport?.id || null
                }
            };

            return applyTeamOverrides(teamData, league.shortName.toLowerCase(), teamSlug);

        } catch (error) {
            if (error.name === 'TeamNotFoundError') throw error;
            throw new Error(`MLBStats API error for ${league.shortName}: ${error.message}`);
        }
    }

    /**
     * Get league logo URL
     * MLBStats API does not provide league-level logos, so use local assets
     * @param {Object} league - League object
     * @param {boolean} darkLogoPreferred - Whether dark logo is preferred
     * @returns {Promise<string|null>} League logo URL
     */
    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        return league.logoUrl || null;
    }

    clearCache() {
        fsCache.clearSubdir('mlbstats');
        fsCache.clearSubdir('mlbstats-logos');
        logger.info('MLBStats provider cache cleared');
    }

    /**
     * Initialize cache by pre-fetching team lists for all configured leagues
     */
    async initializeCache() {
        const { getAllLeagues } = require('../leagues');
        const leagues = getAllLeagues();
        const fetchPromises = [];

        for (const league of Object.values(leagues)) {
            const config = this.getLeagueConfig(league);
            if (config) {
                fetchPromises.push(
                    this.fetchTeamData(league)
                        .then(teams => ({ success: true, league: league.shortName, count: teams.length }))
                        .catch(error => ({ success: false, league: league.shortName, error: error.message }))
                );
            }
        }

        if (fetchPromises.length > 0) {
            logger.info(`Initializing MLBStats cache for ${fetchPromises.length} league(s)`);
            const results = await Promise.allSettled(fetchPromises);
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success).length;

            if (failed > 0) {
                logger.warn(`MLBStats cache initialized: ${successful} succeeded, ${failed} failed`);
            } else {
                logger.info(`MLBStats cache initialized: ${successful} leagues`);
            }
        }
    }

    // --------------------------------------------------------------------------
    // Private helper methods
    // --------------------------------------------------------------------------

    /**
     * Fetch team data from MLB StatsAPI
     * @param {Object} league - League object with mlbStats config
     * @returns {Promise<Object[]>} Array of team objects from the API
     */
    async fetchTeamData(league) {
        const cacheKey = `${league.shortName}_teams`;

        // Return cached data from filesystem if still valid
        const cached = fsCache.getJSON('mlbstats', cacheKey, this.TEAM_CACHE_DURATION);
        if (cached) {
            return cached;
        }

        const config = this.getLeagueConfig(league);
        if (!config) {
            throw new Error(`League ${league.shortName} is missing MLBStats configuration`);
        }

        const { sportId, season } = config;
        const currentYear = new Date().getFullYear();
        const seasonsToTry = season ? [season] : [currentYear, currentYear - 1, currentYear - 2];

        let lastError = null;
        for (const seasonParam of seasonsToTry) {
            const url = `${this.BASE_URL}/teams?sportId=${sportId}&season=${seasonParam}`;

            try {
                const response = await axios.get(url, {
                    timeout: REQUEST_TIMEOUT,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                const teams = response.data?.teams || [];
                if (teams.length === 0) {
                    lastError = new Error(`No teams available for sportId ${sportId}, season ${seasonParam}`);
                    continue; // Try next season
                }

                fsCache.setJSON('mlbstats', cacheKey, teams);

                // Log if we had to fall back to a previous season
                if (seasonParam !== seasonsToTry[0]) {
                    // logger.info(`Using ${seasonParam} season data for ${league.shortName} (${currentYear} not available)`);
                }

                return teams;
            } catch (error) {
                // If 404, try next season in the list
                if (error.response?.status === 404) {
                    lastError = error;
                    continue;
                }
                // For other errors, throw immediately
                throw this.handleHttpError(error, `Fetching teams for ${league.shortName}`);
            }
        }

        // If we exhausted all seasons, throw the last error
        if (lastError) {
            throw this.handleHttpError(lastError, `Fetching teams for ${league.shortName} (tried seasons: ${seasonsToTry.join(', ')})`);
        } else {
            throw new Error(`No team data available for ${league.shortName} (sportId: ${sportId}) across seasons: ${seasonsToTry.join(', ')}`);
        }
    }

    /**
     * Fetch SVG logo from mlbstatic.com, rasterize to PNG, and extract colors
     * @param {number} teamId - MLB StatsAPI team ID
     * @returns {Promise<{pngBase64: string|null, color: string|null, alternateColor: string|null}>}
     */
    async fetchAndProcessLogo(teamId) {
        // Check filesystem cache for logo data
        const cached = fsCache.getJSON('mlbstats-logos', `logo_${teamId}`, this.LOGO_CACHE_DURATION);
        if (cached) {
            return cached;
        }

        const svgUrl = `${this.LOGO_BASE_URL}/${teamId}.svg`;
        try {
            const response = await axios.get(svgUrl, {
                responseType: 'arraybuffer',
                timeout: REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const svgBuffer = Buffer.from(response.data);
            const { pngBuffer, canvas } = await rasterizeLogo(svgBuffer);
            const palette = extractPalette(canvas);

            const result = {
                svgUrl: svgUrl,
                pngBase64: `data:image/png;base64,${pngBuffer.toString('base64')}`,
                color: palette.color,
                alternateColor: palette.alternateColor
            };

            // Cache to filesystem (no canvas retention)
            fsCache.setJSON('mlbstats-logos', `logo_${teamId}`, result);
            return result;
        } catch (error) {
            logger.warn('Failed to fetch/process MLBStats logo', {
                teamId,
                error: error.message
            });
            return { svgUrl: null, pngBase64: null, color: null, alternateColor: null };
        }
    }
}

// Export singleton instance (ProviderManager and express.js share the same instance)
const sharedInstance = new MLBStatsProvider();
module.exports = sharedInstance;
module.exports.MLBStatsProvider = MLBStatsProvider;
