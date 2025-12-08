// ------------------------------------------------------------------------------
// HockeyTechProvider.js
// HockeyTech API provider implementation
// Handles team resolution and data fetching from HockeyTech LeagueStat API
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, generateSlug } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
const logger = require('../helpers/logger');

// Custom error class for team not found errors
class TeamNotFoundError extends Error {
    constructor(teamIdentifier, league, teamList) {
        const teamNames = teamList.map(t => `${t.city} ${t.nickname}`).join(', ');
        super(`Team not found: '${teamIdentifier}' in ${league.shortName.toUpperCase()}. Available teams: ${teamNames}`);
        this.name = 'TeamNotFoundError';
        this.teamIdentifier = teamIdentifier;
        this.league = league.shortName;
        this.availableTeams = teamList;
        this.teamCount = teamList.length;
    }
}

class HockeyTechProvider extends BaseProvider {
    constructor() {
        super();
        this.teamCache = new Map();
        this.colorCache = new Map();
        this.CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 hours
        this.BASE_URL = 'https://lscluster.hockeytech.com/feed/';
        // Use API key from env var if available, otherwise use public key
        this.API_KEY = process.env.HOCKEYTECH_API_KEY || 'f1aa699db3d81487';
    }

    getProviderId() {
        return 'hockeytech';
    }

    getSupportedLeagues() {
        const { leagues } = require('../leagues');
        return Object.keys(leagues).filter(key => {
            const league = leagues[key];
            if (league.providers && Array.isArray(league.providers)) {
                return league.providers.some(p => p.hockeyTech || p.hockeyTechConfig);
            }
            return false;
        });
    }

    getLeagueConfig(league) {
        // Check for config in providers array (preferred)
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && (providerConfig.hockeyTech || providerConfig.hockeyTechConfig)) {
                    return providerConfig.hockeyTech || providerConfig.hockeyTechConfig;
                }
            }
        }
        
        // DEPRECATED: Check for direct config (for backward compatibility)
        if (league.hockeyTech || league.hockeyTechConfig) {
            return league.hockeyTech || league.hockeyTechConfig;
        }
        
        return null;
    }

    async resolveTeam(league, teamIdentifier) {
        try {
            const teams = await this.fetchTeamData(league);
            const teamSlug = generateSlug(teamIdentifier);

            // Find best matching team using the team matching utility
            const teamMatches = teams.map(team => ({
                team,
                score: getTeamMatchScoreWithOverrides(
                    teamIdentifier,
                    {
                        city: team.city,
                        name: team.nickname,
                        fullName: team.name,
                        abbreviation: team.code
                    },
                    league.shortName
                )
            }));

            // Sort by match score
            teamMatches.sort((a, b) => b.score - a.score);

            const bestMatch = teamMatches[0];

            // Require a minimum match score
            if (!bestMatch || bestMatch.score < 0.3) {
                throw new TeamNotFoundError(teamIdentifier, league, teams);
            }

            const team = bestMatch.team;

            // Extract colors from logo if not cached
            let colors = this.colorCache.get(team.team_logo_url);
            if (!colors) {
                try {
                    const extractedColors = await extractDominantColors(team.team_logo_url, 2);
                    colors = {
                        primary: extractedColors[0] || null,
                        secondary: extractedColors[1] || null
                    };
                    this.colorCache.set(team.team_logo_url, colors);
                } catch (colorError) {
                    logger.warn('Failed to extract colors from logo', {
                        team: team.name,
                        league: league.shortName,
                        error: colorError.message
                    });
                    colors = { primary: null, secondary: null };
                }
            }

            // Return standardized team object
            return {
                id: team.id,
                city: team.city,
                name: team.nickname,
                fullName: team.name,
                abbreviation: team.code,
                conference: null, // HockeyTech uses divisions, not conferences
                division: team.division_long_name || team.division_short_name || null,
                logo: team.team_logo_url,
                logoAlt: null, // HockeyTech doesn't provide alternate logos
                color: colors.primary,
                alternateColor: colors.secondary,
                providerId: this.getProviderId(),
                providerData: {
                    divisionId: team.division_id,
                    divisionShortName: team.division_short_name
                }
            };

        } catch (error) {
            if (error instanceof TeamNotFoundError) {
                throw error;
            }
            throw new Error(`HockeyTech API error for ${league.shortName}: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        // HockeyTech doesn't provide league logos through their API
        // Return local assets if configured in leagues.json
        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        return league.logoUrl || null;
    }

    clearCache() {
        this.teamCache.clear();
        this.colorCache.clear();
        logger.info('HockeyTech provider cache cleared');
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

        const hockeyTechConfig = this.getLeagueConfig(league);
        if (!hockeyTechConfig) {
            throw new Error(`League ${league.shortName} is missing HockeyTech configuration`);
        }

        const { clientCode, seasonId, apiKey } = hockeyTechConfig;
        
        if (!clientCode) {
            throw new Error(`League ${league.shortName} requires clientCode in HockeyTech configuration`);
        }
        
        // Use league-specific API key if configured, otherwise use default
        const key = apiKey || this.API_KEY;
        
        // seasonId is optional - API will use current season if not provided
        const params = {
            feed: 'modulekit',
            view: 'teamsbyseason',
            key: key,
            client_code: clientCode,
            lang_code: 'en',
            fmt: 'json'
        };

        if (seasonId) {
            params.season_id = seasonId;
        }

        try {
            const response = await axios.get(this.BASE_URL, {
                params,
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            const teams = response.data?.SiteKit?.Teamsbyseason || [];
            
            if (teams.length === 0) {
                throw new Error(`No teams found for league: ${clientCode}`);
            }
            
            // Cache the data
            this.teamCache.set(cacheKey, {
                data: teams,
                timestamp: Date.now()
            });
            
            return teams;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching teams for ${clientCode}`)
        }
    }
}

module.exports = HockeyTechProvider;

// ------------------------------------------------------------------------------
