// ------------------------------------------------------------------------------
// teamMatchingUtils.js
// Generic utilities for team name matching and normalization
// Provider-agnostic functions that can be used by any sports data provider
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Text Normalization Functions
// ------------------------------------------------------------------------------

/**
 * Normalize a string for matching by converting to lowercase and standardizing spaces
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')  // Convert dashes, underscores, etc. to spaces
        .replace(/\s+/g, ' ')           // Collapse multiple spaces
        .trim();
}

/**
 * Create a compact version without any spaces for flexible matching
 * @param {string} str - String to make compact
 * @returns {string} Compact string with only alphanumeric characters
 */
function normalizeCompact(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9]/g, '');     // Remove all non-alphanumeric chars
}

// ------------------------------------------------------------------------------
// Location Abbreviation System
// ------------------------------------------------------------------------------

// Common US sports city/location abbreviations
const LOCATION_ABBREVIATIONS = {
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
    'sj': ['san jose', 'sj'],
    'dc': ['washington', 'dc'],
    'chi': ['chicago', 'chi'],
    'det': ['detroit', 'det'],
    'atl': ['atlanta', 'atl'],
    'mia': ['miami', 'mia'],
    'dal': ['dallas', 'dal'],
    'hou': ['houston', 'hou'],
    'den': ['denver', 'den'],
    'sea': ['seattle', 'sea']
};

/**
 * Expand location abbreviations in the input to provide multiple matching variations
 * @param {string} input - User input that might contain location abbreviations
 * @returns {string[]} Array of possible expanded variations
 */
function expandLocationAbbreviations(input) {
    if (!input) return [''];
    
    const normalized = normalize(input);
    const words = normalized.split(' ');

    // Check if the first word(s) might be a location abbreviation
    for (let i = Math.min(2, words.length); i > 0; i--) {
        const possibleAbbrev = words.slice(0, i).join('');
        if (LOCATION_ABBREVIATIONS[possibleAbbrev]) {
            const expansions = LOCATION_ABBREVIATIONS[possibleAbbrev];
            const restOfName = words.slice(i).join(' ');
            // Return all possible variations
            return expansions.map(loc => restOfName ? `${loc} ${restOfName}` : loc);
        }
    }

    // Also check compact form (e.g., "ladodgers")
    const compact = normalizeCompact(input);
    for (const [abbrev, expansions] of Object.entries(LOCATION_ABBREVIATIONS)) {
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

// ------------------------------------------------------------------------------
// Generic Team Matching Functions
// ------------------------------------------------------------------------------

/**
 * Check if a prefix matches any variation of a team's city
 * e.g., "losangeles" matches city "LA" because LA can expand to "Los Angeles"
 */
function isCityVariation(prefix, teamCity) {
    if (!prefix || !teamCity) return false;
    
    const compactPrefix = normalizeCompact(prefix);
    const compactCity = normalizeCompact(teamCity);
    
    // Direct match
    if (compactPrefix === compactCity) return true;
    
    // Check if team city is an abbreviation or expansion that matches the prefix
    for (const [abbrev, expansions] of Object.entries(LOCATION_ABBREVIATIONS)) {
        const compactAbbrev = normalizeCompact(abbrev);
        
        // If team city matches this abbreviation
        if (compactCity === compactAbbrev) {
            // Check if prefix matches any expansion
            for (const expansion of expansions) {
                if (compactPrefix === normalizeCompact(expansion)) {
                    return true;
                }
            }
        }
        
        // If team city matches any expansion
        for (const expansion of expansions) {
            if (compactCity === normalizeCompact(expansion)) {
                // Check if prefix matches the abbreviation or other expansions
                if (compactPrefix === compactAbbrev) {
                    return true;
                }
                for (const otherExpansion of expansions) {
                    if (compactPrefix === normalizeCompact(otherExpansion)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

/**
 * Check for exact matches between input and team fields
 */
function checkExactMatches(expandedInput, compactInput, normalized) {
    const exactMatchFields = [
        { norm: normalized.abbreviation, compact: normalized.compactAbbreviation, score: 1000 },
        { norm: normalized.name, compact: normalized.compactName, score: 900 },
        { norm: normalized.shortDisplayName, compact: normalized.compactShortDisplayName, score: 850 },
        { norm: normalized.fullName, compact: normalized.compactFullName, score: 800 },
        { norm: normalized.city, compact: normalized.compactCity, score: 700 }
    ];
    
    for (const field of exactMatchFields) {
        if ((field.norm && expandedInput === field.norm) || (field.compact && compactInput === field.compact)) {
            return field.score;
        }
    }
    return 0;
}

/**
 * Check for city+team concatenation patterns (e.g., "losangelesclippers")
 */
function checkConcatenationMatch(compactInput, teamCity, normalized) {
    const MIN_LENGTH = 4;
    const teamNames = [normalized.compactShortDisplayName, normalized.compactName];
    
    for (const teamName of teamNames) {
        if (!teamName || teamName.length < MIN_LENGTH) continue;
        
        // Direct: city + team name (e.g., "laclippers")
        if (normalized.compactCity && compactInput === normalized.compactCity + teamName) {
            return 950;
        }
        
        // City variation + team name (e.g., "losangelesclippers" where city is "LA")
        if (compactInput.endsWith(teamName)) {
            const prefix = compactInput.substring(0, compactInput.length - teamName.length);
            if (isCityVariation(prefix, teamCity)) {
                return 950;
            }
        }
    }
    
    return 0;
}

/**
 * Check for partial substring matches
 */
function checkPartialMatches(expandedInput, compactInput, normalized) {
    const MIN_LENGTH = 4;
    let score = 0;
    
    // Helper to check if input contains field or vice versa
    const checkSubstring = (field, compactField, containsScore, isContainedScore) => {
        let s = 0;
        if (field && field.length >= MIN_LENGTH && expandedInput.includes(field)) s = Math.max(s, containsScore);
        if (compactField && compactField.length >= MIN_LENGTH && compactInput.includes(compactField)) s = Math.max(s, containsScore);
        if (field && expandedInput.length >= MIN_LENGTH && field.includes(expandedInput)) s = Math.max(s, isContainedScore);
        if (compactField && compactInput.length >= MIN_LENGTH && compactField.includes(compactInput)) s = Math.max(s, isContainedScore);
        return s;
    };
    
    // Team name/shortDisplayName (score: 400 if input contains, 300 if contains input)
    score = Math.max(score, checkSubstring(normalized.name, normalized.compactName, 400, 300));
    score = Math.max(score, checkSubstring(normalized.shortDisplayName, normalized.compactShortDisplayName, 400, 300));
    
    // Full name (score: 200)
    if (normalized.fullName && expandedInput.length >= MIN_LENGTH && normalized.fullName.includes(expandedInput)) {
        score = Math.max(score, 200);
    }
    if (normalized.compactFullName && compactInput.length >= MIN_LENGTH && normalized.compactFullName.includes(compactInput)) {
        score = Math.max(score, 200);
    }
    
    // City (score: 100, but only if not followed by another team name)
    if (normalized.compactCity && normalized.compactCity.length >= MIN_LENGTH && compactInput.includes(normalized.compactCity)) {
        const cityIndex = compactInput.indexOf(normalized.compactCity);
        const textAfterCity = compactInput.substring(cityIndex + normalized.compactCity.length);
        if (textAfterCity.length < 3) { // Not followed by substantial text
            score = Math.max(score, 100);
        }
    }
    
    return score;
}

/**
 * Calculate match score between user input and a standardized team object
 * @param {string} input - User search input
 * @param {Object} team - Standardized team object with properties:
 *   - fullName: Full display name (e.g., "Los Angeles Lakers")
 *   - name: Team nickname (e.g., "Lakers") 
 *   - city: Team city/location (e.g., "Los Angeles")
 *   - abbreviation: Team abbreviation (e.g., "LAL")
 *   - shortDisplayName: Short name (e.g., "LA Lakers") [optional]
 * @returns {number} Match score (0-1000, higher = better match)
 */
function getTeamMatchScore(input, team) {
    if (!input || !team) return 0;
    
    // Pre-normalize all team properties
    const normalized = {
        fullName: normalize(team.fullName || ''),
        shortDisplayName: normalize(team.shortDisplayName || ''),
        abbreviation: normalize(team.abbreviation || ''),
        city: normalize(team.city || ''),
        name: normalize(team.name || ''),
        compactFullName: normalizeCompact(team.fullName || ''),
        compactShortDisplayName: normalizeCompact(team.shortDisplayName || ''),
        compactAbbreviation: normalizeCompact(team.abbreviation || ''),
        compactCity: normalizeCompact(team.city || ''),
        compactName: normalizeCompact(team.name || '')
    };
    
    let maxScore = 0;
    const expandedInputs = expandLocationAbbreviations(input);

    for (const expandedInput of expandedInputs) {
        const compactInput = normalizeCompact(expandedInput);
        
        maxScore = Math.max(maxScore,
            checkExactMatches(expandedInput, compactInput, normalized),
            checkConcatenationMatch(compactInput, team.city, normalized),
            checkPartialMatches(expandedInput, compactInput, normalized)
        );
    }

    return maxScore;
}

/**
 * Find the best matching team from an array of teams
 * @param {string} input - User search input
 * @param {Object[]} teams - Array of standardized team objects
 * @returns {Object|null} Best matching team object, or null if no good match found
 */
function findBestTeamMatch(input, teams) {
    if (!input || !teams || teams.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const team of teams) {
        const score = getTeamMatchScore(input, team);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = team;
        }
    }

    // Only return matches with a reasonable score (avoid weak matches)
    return bestScore > 0 ? bestMatch : null;
}

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

module.exports = {
    // Text normalization
    normalize,
    normalizeCompact,
    
    // Location abbreviations
    LOCATION_ABBREVIATIONS,
    expandLocationAbbreviations,
    
    // Team matching
    getTeamMatchScore,
    findBestTeamMatch
};

// ------------------------------------------------------------------------------