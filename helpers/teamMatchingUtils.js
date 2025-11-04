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
    
    const expandedInputs = expandLocationAbbreviations(input);

    // Normalize all team properties
    const fullName = normalize(team.fullName || '');
    const shortDisplayName = normalize(team.shortDisplayName || '');
    const abbreviation = normalize(team.abbreviation || '');
    const city = normalize(team.city || '');
    const name = normalize(team.name || '');

    // Compact versions for flexible matching
    const compactFullName = normalizeCompact(team.fullName || '');
    const compactShortDisplayName = normalizeCompact(team.shortDisplayName || '');
    const compactAbbreviation = normalizeCompact(team.abbreviation || '');
    const compactCity = normalizeCompact(team.city || '');
    const compactName = normalizeCompact(team.name || '');

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

        // 2. Team name/nickname (e.g., "Lakers", "Celtics")
        if (expandedInput === name && name) {
            maxScore = Math.max(maxScore, 900);
        }
        if (compactExpanded === compactName && compactName) {
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
        if (expandedInput === fullName && fullName) {
            maxScore = Math.max(maxScore, 800);
        }
        if (compactExpanded === compactFullName && compactFullName) {
            maxScore = Math.max(maxScore, 800);
        }

        // 5. City/Location (e.g., "Los Angeles")
        if (expandedInput === city && city) {
            maxScore = Math.max(maxScore, 700);
        }
        if (compactExpanded === compactCity && compactCity) {
            maxScore = Math.max(maxScore, 700);
        }

        // 6. Partial matches (lower priority)
        if (name && expandedInput.includes(name)) {
            maxScore = Math.max(maxScore, 400);
        }
        if (compactName && compactExpanded.includes(compactName)) {
            maxScore = Math.max(maxScore, 400);
        }

        if (name && name.includes(expandedInput)) {
            maxScore = Math.max(maxScore, 300);
        }
        if (compactName && compactName.includes(compactExpanded)) {
            maxScore = Math.max(maxScore, 300);
        }

        if (fullName && fullName.includes(expandedInput)) {
            maxScore = Math.max(maxScore, 200);
        }
        if (compactFullName && compactFullName.includes(compactExpanded)) {
            maxScore = Math.max(maxScore, 200);
        }

        if (city && city.includes(expandedInput)) {
            maxScore = Math.max(maxScore, 100);
        }
        if (compactCity && compactCity.includes(compactExpanded)) {
            maxScore = Math.max(maxScore, 100);
        }
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