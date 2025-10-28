// ------------------------------------------------------------------------------
// ESPNProvider.js
// ESPN sports data provider implementation
// Handles team resolution and data fetching from ESPN APIs
// ------------------------------------------------------------------------------

const https = require('https');
const path = require('path');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScore } = require('../helpers/teamMatchingUtils');

class ESPNProvider extends BaseProvider {
    constructor() {
        super();
        this.teamCache = new Map();
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    }

    getProviderId() {
        return 'espn';
    }

    getSupportedLeagues() {
        return [
            'nba', 'wnba', 'nfl', 'ufl', 'mlb', 'nhl', 
            'epl', 'mls', 'uefa', 'ncaaf', 'ncaam', 'ncaaw'
        ];
    }

    async resolveTeam(league, teamIdentifier) {
        if (!league || !teamIdentifier) {
            throw new Error('Both league and team identifier are required');
        }

        if (!league.espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN configuration`);
        }

        try {
            const teams = await this.fetchTeamData(league);

            // Find best matching team using weighted scoring
            let bestMatch = null;
            let bestScore = 0;

            for (const team of teams) {
                // Convert ESPN team format to standardized format for matching
                const teamObj = team.team || {};
                const standardizedTeam = {
                    fullName: teamObj.displayName,
                    shortDisplayName: teamObj.shortDisplayName,
                    name: teamObj.nickname,
                    city: teamObj.location,
                    abbreviation: teamObj.abbreviation
                };
                
                const score = getTeamMatchScore(teamIdentifier, standardizedTeam);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = team;
                }
            }

            if (!bestMatch || bestScore === 0) {
                throw new Error(`Team not found: ${teamIdentifier} in ${league.shortName.toUpperCase()}`);
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

            return {
                id: teamObj.id,
                city: teamObj.location,
                name: teamObj.nickname,
                fullName: teamObj.displayName,
                abbreviation: teamObj.abbreviation,
                conference: teamObj.groups?.find(g => g.id)?.name,
                division: teamObj.groups?.find(g => g.parent?.id)?.name,
                logo: defaultLogo?.href || teamObj.logos?.[0]?.href,
                logoAlt: darkLogo?.href,
                color: teamObj.color ? `#${teamObj.color}` : null,
                alternateColor: teamObj.alternateColor ? `#${teamObj.alternateColor}` : null
            };
        } catch (error) {
            throw new Error(`Failed to resolve team: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        if (!league.espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN configuration`);
        }

        // Handle special cases for NCAA
        if (['ncaaf', 'ncaam', 'ncaaw'].includes(league.shortName.toLowerCase())) {
            return path.resolve(__dirname, '../assets/ncaa.png');
        }

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
            console.warn(`Failed to get league logo for ${league.shortName}:`, error.message);
            // Fallback to ESPN CDN logo
            return `https://a.espncdn.com/i/teamlogos/leagues/500/${league.shortName.toLowerCase()}.png`;
        }
    }

    clearCache() {
        this.teamCache.clear();
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

        const { espnSport, espnSlug } = league.espnConfig;
        const teamApiUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnSlug}/teams?limit=1000`;
        
        return new Promise((resolve, reject) => {
            https.get(teamApiUrl, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        const teams = parsed.sports?.[0]?.leagues?.[0]?.teams || [];

                        // Cache the data
                        this.teamCache.set(cacheKey, {
                            data: teams,
                            timestamp: Date.now()
                        });

                        resolve(teams);
                    } catch (error) {
                        reject(new Error(`Failed to parse API response: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`API request failed: ${error.message}`));
            });
        });
    }

    async fetchLeagueData(league) {
        const cacheKey = `${league.shortName}_league`;
        const cached = this.teamCache.get(cacheKey);

        // Return cached data if still valid
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        const { espnSport, espnSlug } = league.espnConfig;
        const leagueApiUrl = `https://sports.core.api.espn.com/v2/sports/${espnSport}/leagues/${espnSlug}`;
        
        return new Promise((resolve, reject) => {
            https.get(leagueApiUrl, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);

                        // Cache the data
                        this.teamCache.set(cacheKey, {
                            data: parsed,
                            timestamp: Date.now()
                        });

                        resolve(parsed);
                    } catch (error) {
                        reject(new Error(`Failed to parse league API response: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`League API request failed: ${error.message}`));
            });
        });
    }


}

module.exports = ESPNProvider;

// ------------------------------------------------------------------------------