// ------------------------------------------------------------------------------
// TheSportsDBProvider.js
// TheSportsDB API provider implementation
// Handles team resolution and data fetching from TheSportsDB v1 free API
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, generateSlug } = require('../helpers/teamMatchingUtils');
const { extractDominantColors } = require('../helpers/colorExtractor');
const logger = require('../helpers/logger');

// Custom error class for team not found errors
class TeamNotFoundError extends Error {
    constructor(teamIdentifier, league, teamList) {
        const teamNames = teamList.map(t => t.strTeam).join(', ');
        super(`Team not found: '${teamIdentifier}' in ${league.shortName.toUpperCase()}. Available teams: ${teamNames}`);
        this.name = 'TeamNotFoundError';
        this.teamIdentifier = teamIdentifier;
        this.league = league.shortName;
        this.availableTeams = teamList;
        this.teamCount = teamList.length;
    }
}

class TheSportsDBProvider extends BaseProvider {
    constructor() {
        super();
        this.teamCache = new Map();
        this.colorCache = new Map();
        this.CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 hours
        // Use premium API key from env var if available, otherwise use free tier
        this.API_KEY = process.env.THESPORTSDB_API_KEY || '3';
    }

    getProviderId() {
        return 'thesportsdb';
    }

    getSupportedLeagues() {
        const { leagues } = require('../leagues');
        return Object.keys(leagues).filter(key => leagues[key].providerId === this.getProviderId());
    }

    getLeagueConfig(league) {
        // Check for config in providers array (preferred)
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && (providerConfig.theSportsDB || providerConfig.theSportsDBConfig)) {
                    return providerConfig.theSportsDB || providerConfig.theSportsDBConfig;
                }
            }
        }
        
        // DEPRECATED: Check for direct config (for backward compatibility)
        if (league.theSportsDB || league.theSportsDBConfig) {
            return league.theSportsDB || league.theSportsDBConfig;
        }
        
        return null;
    }

    async resolveTeam(league, teamIdentifier) {
        if (!league || !teamIdentifier) {
            throw new Error('Both league and team identifier are required');
        }

        const theSportsDBConfig = this.getLeagueConfig(league);
        if (!theSportsDBConfig) {
            throw new Error(`League ${league.shortName} is missing TheSportsDB configuration`);
        }

        try {
            const teams = await this.fetchTeamData(league);

            let bestMatch = null;
            let bestScore = 0;

            // Check for custom alias match first (highest priority)
            const { findTeamByAlias } = require('../helpers/teamOverrides');
            
            // Create slug identifiers for TheSportsDB teams (for alias matching)
            const teamsWithSlugs = teams.map(t => ({
                ...t,
                id: t.idTeam,
                espnId: generateSlug(t.strTeam) // Generate kebab-case slug from team name
            }));
            
            const aliasMatch = findTeamByAlias(teamIdentifier, league.shortName.toLowerCase(), teamsWithSlugs);

            if (aliasMatch) {
                // Found via custom alias - use this team directly
                bestMatch = teams.find(t => t.idTeam === aliasMatch.idTeam);
                bestScore = 100; // Perfect match via alias
            }

            // If no alias match, find best matching team using weighted scoring
            if (!bestMatch) {
                for (const team of teams) {
                    // Extract team slug for override lookup
                    const teamSlug = generateSlug(team.strTeam);
                    
                    const standardizedTeam = {
                        fullName: team.strTeam,
                        name: team.strTeam,
                        city: team.strLocation || '',
                        abbreviation: team.strAlternate || team.strTeam.substring(0, 3).toUpperCase()
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
                throw new TeamNotFoundError(teamIdentifier, league, teams);
            }

            // Extract colors from logo if not provided by API
            // Handle colors that may or may not have # prefix
            let primaryColor = null;
            let alternateColor = null;
            
            if (bestMatch.strColour1 && bestMatch.strColour1.trim()) {
                primaryColor = bestMatch.strColour1.startsWith('#') ? bestMatch.strColour1 : `#${bestMatch.strColour1}`;
            }
            if (bestMatch.strColour2 && bestMatch.strColour2.trim()) {
                alternateColor = bestMatch.strColour2.startsWith('#') ? bestMatch.strColour2 : `#${bestMatch.strColour2}`;
            }
            
            const logoUrl = bestMatch.strBadge || bestMatch.strLogo;
            
            if ((!primaryColor || !alternateColor) && logoUrl) {
                // Check cache first
                const colorCacheKey = `colors_${bestMatch.idTeam}`;
                const cachedColors = this.colorCache.get(colorCacheKey);
                
                if (cachedColors && Date.now() - cachedColors.timestamp < this.CACHE_DURATION) {
                    if (!primaryColor) primaryColor = cachedColors.primary;
                    if (!alternateColor) alternateColor = cachedColors.alternate;
                } else {
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
                        logger.warn('Failed to extract colors', { team: bestMatch.strTeam, error: error.message });
                        if (!primaryColor) primaryColor = '#000000';
                        if (!alternateColor) alternateColor = '#ffffff';
                    }
                }
            }
            
            // Final fallback if still no colors
            if (!primaryColor) primaryColor = '#000000';
            if (!alternateColor) alternateColor = '#ffffff';

            // Generate slug from team name for override matching and raw endpoint
            const teamSlug = generateSlug(bestMatch.strTeam);

            // Build standardized format
            let teamData = {
                id: bestMatch.idTeam,
                slug: teamSlug, // Generated slug for TheSportsDB teams
                city: bestMatch.strLocation || '',
                name: bestMatch.strTeam,
                fullName: bestMatch.strTeam,
                abbreviation: bestMatch.strAlternate || bestMatch.strTeam.substring(0, 3).toUpperCase(),
                conference: bestMatch.strDivision || null,
                division: bestMatch.strDivision || null,
                logo: logoUrl,
                logoAlt: bestMatch.strBadge || bestMatch.strLogo,
                color: primaryColor,
                alternateColor: alternateColor
            };

            // Apply team overrides if any exist
            const { applyTeamOverrides } = require('../helpers/teamOverrides');
            teamData = applyTeamOverrides(teamData, league.shortName.toLowerCase(), teamSlug);

            return teamData;
        } catch (error) {
            // Re-throw TeamNotFoundError as-is
            if (error instanceof TeamNotFoundError) {
                throw error;
            }
            throw new Error(`Failed to resolve team: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        const theSportsDBConfig = this.getLeagueConfig(league);
        if (!theSportsDBConfig) {
            throw new Error(`League ${league.shortName} is missing TheSportsDB configuration`);
        }

        // Check if league has custom logo URLs defined
        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        if (league.logoUrl) {
            return league.logoUrl;
        }

        // Otherwise, fetch from TheSportsDB API
        try {
            const leagueData = await this.fetchLeagueData(league);
            
            // TheSportsDB provides logo and badge
            return leagueData.strBadge || leagueData.strLogo || leagueData.strPoster;
        } catch (error) {
            logger.warn('Failed to get league logo', { league: league.shortName, error: error.message });
            // Return null if no fallback available
            return null;
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

        const theSportsDBConfig = this.getLeagueConfig(league);
        if (!theSportsDBConfig) {
            throw new Error(`League ${league.shortName} is missing TheSportsDB configuration`);
        }
        const { leagueName } = theSportsDBConfig;
        
        if (!leagueName) {
            throw new Error(`League ${league.shortName} requires leagueName in TheSportsDB configuration`);
        }
        
        const encodedLeague = encodeURIComponent(leagueName);
        const teamApiUrl = `https://www.thesportsdb.com/api/v1/json/${this.API_KEY}/search_all_teams.php?l=${encodedLeague}`;
        
        try {
            const response = await axios.get(teamApiUrl, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            const teams = response.data.teams || [];
            
            if (teams.length === 0) {
                throw new Error(`No teams found for league: ${leagueName}`);
            }
            
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

        const theSportsDBConfig = this.getLeagueConfig(league);
        if (!theSportsDBConfig) {
            throw new Error(`League ${league.shortName} is missing TheSportsDB configuration`);
        }
        const { leagueId } = theSportsDBConfig;
        const leagueApiUrl = `https://www.thesportsdb.com/api/v1/json/${this.API_KEY}/lookupleague.php?id=${leagueId}`;
        
        try {
            const response = await axios.get(leagueApiUrl, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            const league = response.data.leagues?.[0];
            
            if (!league) {
                throw new Error('League not found');
            }
            
            // Cache the data
            this.teamCache.set(cacheKey, {
                data: league,
                timestamp: Date.now()
            });
            
            return league;
        } catch (error) {
            throw new Error(`League API request failed: ${error.message}`);
        }
    }
}

module.exports = TheSportsDBProvider;

// ------------------------------------------------------------------------------
