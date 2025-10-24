// ------------------------------------------------------------------------------
// ESPNTeamResolver.js
// This helper resolves team names to standardized formats using ESPN's API
// input requires a league and team name, abbreviation, or city
// ------------------------------------------------------------------------------

const https = require('https');

const teamCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Common location abbreviations
const locationAbbreviations = {
    'la': ['los angeles', 'la'],
    'ny': ['new york', 'ny'],
    'nyc': ['new york', 'nyc'],
    'sf': ['san francisco', 'sf'],
    'tb': ['tampa bay', 'tb'],
    'gc': ['golden state', 'gc'],
    'gs': ['golden state', 'gs'],
    'okc': ['oklahoma city', 'okc'],
    'no': ['new orleans', 'no'],
    'sa': ['san antonio', 'sa'],
    'phx': ['phoenix', 'phx'],
    'por': ['portland', 'por'],
    'sac': ['sacramento', 'sac'],
    'min': ['minnesota', 'min'],
    'nj': ['new jersey', 'nj'],
    'stl': ['st louis', 'stl'],
    'kc': ['kansas city', 'kc'],
    'sd': ['san diego', 'sd'],
    'sj': ['san jose', 'sj']
};

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
        .replace(/[^a-z0-9\s]/g, ' ')  // Convert dashes, underscores, etc. to spaces
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .trim();
}

// Create a version without any spaces for more flexible matching
function normalizeCompact(str) {
    return str.toLowerCase()
        .replace(/[^a-z0-9]/g, '');     // Remove all non-alphanumeric chars
}

// Expand location abbreviations in the input
function expandLocationAbbreviations(input) {
    const normalized = normalize(input);
    const words = normalized.split(' ');
    
    // Check if the first word(s) might be a location abbreviation
    for (let i = Math.min(2, words.length); i > 0; i--) {
        const possibleAbbrev = words.slice(0, i).join('');
        if (locationAbbreviations[possibleAbbrev]) {
            const expansions = locationAbbreviations[possibleAbbrev];
            const restOfName = words.slice(i).join(' ');
            // Return all possible variations
            return expansions.map(loc => restOfName ? `${loc} ${restOfName}` : loc);
        }
    }
    
    // Also check compact form (e.g., "ladodgers")
    const compact = normalizeCompact(input);
    for (const [abbrev, expansions] of Object.entries(locationAbbreviations)) {
        if (compact.startsWith(abbrev)) {
            const restOfName = compact.substring(abbrev.length);
            return expansions.map(loc => {
                const compactLoc = normalizeCompact(loc);
                return restOfName ? `${compactLoc}${restOfName}` : compactLoc;
            });
        }
    }
    
    return [normalized];
}

function getMatchScore(input, team) {
    const normalizedInput = normalize(input);
    const compactInput = normalizeCompact(input);
    const expandedInputs = expandLocationAbbreviations(input);
    
    // All leagues now use ESPN API format
    const teamObj = team.team || {};
    const displayName = normalize(teamObj.displayName || '');
    const shortDisplayName = normalize(teamObj.shortDisplayName || '');
    const abbreviation = normalize(teamObj.abbreviation || '');
    const location = normalize(teamObj.location || '');
    const nickname = normalize(teamObj.nickname || '');
    
    // Compact versions for flexible matching
    const compactDisplayName = normalizeCompact(teamObj.displayName || '');
    const compactShortDisplayName = normalizeCompact(teamObj.shortDisplayName || '');
    const compactAbbreviation = normalizeCompact(teamObj.abbreviation || '');
    const compactLocation = normalizeCompact(teamObj.location || '');
    const compactNickname = normalizeCompact(teamObj.nickname || '');

    let maxScore = 0;
    
    // Check all expanded variations of the input
    for (const expandedInput of expandedInputs) {
        const compactExpanded = normalizeCompact(expandedInput);
        
        // Weighted scoring: higher score = better match
        // 1000 = Perfect match (highest priority)
        // 500-999 = Good match
        // 100-499 = Partial match
        // 0 = No match
        
        // 1. Abbreviation (highest priority - most specific)
        if (expandedInput === abbreviation && abbreviation) {
            maxScore = Math.max(maxScore, 1000);
        }
        if (compactExpanded === compactAbbreviation && compactAbbreviation) {
            maxScore = Math.max(maxScore, 1000);
        }
        
        // 2. Team nickname (e.g., "Lakers", "Celtics")
        if (expandedInput === nickname && nickname) {
            maxScore = Math.max(maxScore, 900);
        }
        if (compactExpanded === compactNickname && compactNickname) {
            maxScore = Math.max(maxScore, 900);
        }
        
        // 3. Short display name (e.g., "LA Lakers")
        if (expandedInput === shortDisplayName && shortDisplayName) {
            maxScore = Math.max(maxScore, 850);
        }
        if (compactExpanded === compactShortDisplayName && compactShortDisplayName) {
            maxScore = Math.max(maxScore, 850);
        }
        
        // 4. Full display name (e.g., "Los Angeles Lakers")
        if (expandedInput === displayName && displayName) {
            maxScore = Math.max(maxScore, 800);
        }
        if (compactExpanded === compactDisplayName && compactDisplayName) {
            maxScore = Math.max(maxScore, 800);
        }
        
        // 5. Location/City (e.g., "Los Angeles")
        if (expandedInput === location && location) {
            maxScore = Math.max(maxScore, 700);
        }
        if (compactExpanded === compactLocation && compactLocation) {
            maxScore = Math.max(maxScore, 700);
        }
        
        // 6. Partial matches (lower priority)
        if (nickname && expandedInput.includes(nickname)) {
            maxScore = Math.max(maxScore, 400);
        }
        if (compactNickname && compactExpanded.includes(compactNickname)) {
            maxScore = Math.max(maxScore, 400);
        }
        
        if (nickname && nickname.includes(expandedInput)) {
            maxScore = Math.max(maxScore, 300);
        }
        if (compactNickname && compactNickname.includes(compactExpanded)) {
            maxScore = Math.max(maxScore, 300);
        }
        
        if (displayName && displayName.includes(expandedInput)) {
            maxScore = Math.max(maxScore, 200);
        }
        if (compactDisplayName && compactDisplayName.includes(compactExpanded)) {
            maxScore = Math.max(maxScore, 200);
        }
        
        if (location && location.includes(expandedInput)) {
            maxScore = Math.max(maxScore, 100);
        }
        if (compactLocation && compactLocation.includes(compactExpanded)) {
            maxScore = Math.max(maxScore, 100);
        }
    }
    
    return maxScore;
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

function clearCache() {
    teamCache.clear();
}

module.exports = {
    resolveTeam,
    clearCache
};