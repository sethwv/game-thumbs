// ------------------------------------------------------------------------------
// ESPNTeamResolver.js
// This helper resolves team names to standardized formats using ESPN's API
// input requires a league and team name, abbreviation, or city
// ------------------------------------------------------------------------------

const https = require('https');

const teamCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function fetchTeamData(league) {
    const cacheKey = `${league}_teams`;
    const cached = teamCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    // API endpoints for different leagues (using ESPN API for consistent logo support)
    const apiEndpoints = {
        nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams',
        nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',
        mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams',
        nhl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams',
        ncaaf: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=200',
        ncaab: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=400'
    };

    const endpoint = apiEndpoints[league.toLowerCase()];
    if (!endpoint) {
        throw new Error(`Unsupported league: ${league}`);
    }

    return new Promise((resolve, reject) => {
        https.get(endpoint, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let teams;

                    // Parse ESPN API response format (all leagues now use ESPN)
                    teams = parsed.sports?.[0]?.leagues?.[0]?.teams || [];

                    // Cache the data
                    teamCache.set(cacheKey, {
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

function normalize(str) {
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getMatchScore(input, team) {
    const normalizedInput = normalize(input);
    
    // All leagues now use ESPN API format
    const teamObj = team.team || {};
    const displayName = normalize(teamObj.displayName || '');
    const shortDisplayName = normalize(teamObj.shortDisplayName || '');
    const abbreviation = normalize(teamObj.abbreviation || '');
    const location = normalize(teamObj.location || '');
    const nickname = normalize(teamObj.nickname || '');

    // Weighted scoring: higher score = better match
    // 1000 = Perfect match (highest priority)
    // 500-999 = Good match
    // 100-499 = Partial match
    // 0 = No match
    
    // 1. Abbreviation (highest priority - most specific)
    if (normalizedInput === abbreviation && abbreviation) {
        return 1000;
    }
    
    // 2. Team nickname (e.g., "Lakers", "Celtics")
    if (normalizedInput === nickname && nickname) {
        return 900;
    }
    
    // 3. Short display name (e.g., "LA Lakers")
    if (normalizedInput === shortDisplayName && shortDisplayName) {
        return 850;
    }
    
    // 4. Full display name (e.g., "Los Angeles Lakers")
    if (normalizedInput === displayName && displayName) {
        return 800;
    }
    
    // 5. Location/City (e.g., "Los Angeles")
    if (normalizedInput === location && location) {
        return 700;
    }
    
    // 6. Partial matches (lower priority)
    if (nickname && normalizedInput.includes(nickname)) {
        return 400;
    }
    
    if (nickname && nickname.includes(normalizedInput)) {
        return 300;
    }
    
    if (displayName && displayName.includes(normalizedInput)) {
        return 200;
    }
    
    if (location && location.includes(normalizedInput)) {
        return 100;
    }
    
    // No match
    return 0;
}

function matchesTeam(input, team) {
    return getMatchScore(input, team) > 0;
}

async function resolveTeam(league, name) {
    if (!league || !name) {
        throw new Error('Both league and name are required');
    }

    try {
        const teams = await fetchTeamData(league);
        
        // Find best matching team using weighted scoring
        let bestMatch = null;
        let bestScore = 0;
        
        for (const team of teams) {
            const score = getMatchScore(name, team);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = team;
            }
        }

        if (!bestMatch || bestScore === 0) {
            throw new Error(`Team not found: ${name} in ${league.toUpperCase()}`);
        }

        // Return standardized format (all leagues now use ESPN API format)
        const teamObj = bestMatch.team;
        return {
            id: teamObj.id,
            city: teamObj.location,
            name: teamObj.nickname,
            fullName: teamObj.displayName,
            abbreviation: teamObj.abbreviation,
            conference: teamObj.groups?.find(g => g.id)?.name,
            division: teamObj.groups?.find(g => g.parent?.id)?.name,
            logo: teamObj.logos?.[0]?.href,
            color: teamObj.color ? `#${teamObj.color}` : null,
            alternateColor: teamObj.alternateColor ? `#${teamObj.alternateColor}` : null
        };
    } catch (error) {
        throw new Error(`Failed to resolve team: ${error.message}`);
    }
}

function clearCache() {
    teamCache.clear();
}

module.exports = {
    resolveTeam,
    clearCache
};