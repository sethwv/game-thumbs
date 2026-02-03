// ------------------------------------------------------------------------------
// teamUtils.js
// Team utilities including matching, normalization, overrides, and aliases
// Provider-agnostic functions that can be used by any sports data provider
// ------------------------------------------------------------------------------

const { loadAndMergeJSON } = require('./jsonMerger');
const logger = require('./logger');

// ------------------------------------------------------------------------------
// Team Overrides Management
// ------------------------------------------------------------------------------

let teamOverrides = {};

function loadTeamOverrides() {
    try {
        // Load base teams.json + all files from json/teams/ directory
        teamOverrides = loadAndMergeJSON('teams.json', 'json/teams', 'teams');
    } catch (error) {
        logger.warn('Failed to load team overrides:', { error: error.message });
        teamOverrides = {};
    }
}

// Load on module initialization
loadTeamOverrides();

function getLeagueOverrides(leagueKey) {
    return teamOverrides[leagueKey] || {};
}

function applyTeamOverrides(team, leagueKey, teamIdentifier) {
    const leagueOverrides = getLeagueOverrides(leagueKey);
    const teamOverride = leagueOverrides[teamIdentifier];
    
    if (!teamOverride) {
        return team;
    }
    
    // Create a copy of the team
    const overriddenTeam = { ...team };
    
    // Apply overrides (merge with existing data)
    if (teamOverride.override) {
        Object.assign(overriddenTeam, teamOverride.override);
    }
    
    return overriddenTeam;
}

function getTeamAliases(leagueKey, teamIdentifier) {
    const leagueOverrides = getLeagueOverrides(leagueKey);
    const teamOverride = leagueOverrides[teamIdentifier];
    
    return teamOverride?.aliases || [];
}

/**
 * Check if a team identifier represents a custom team
 * @param {string} leagueKey - League identifier
 * @param {string} teamIdentifier - Team identifier to check
 * @returns {boolean} True if this is a custom team
 */
function isCustomTeam(leagueKey, teamIdentifier) {
    const leagueOverrides = getLeagueOverrides(leagueKey);
    const teamOverride = leagueOverrides[teamIdentifier];
    
    return teamOverride?.custom === true;
}

/**
 * Get custom team data for a team that doesn't exist in provider data
 * @param {string} leagueKey - League identifier
 * @param {string} teamIdentifier - Team identifier
 * @returns {Object|null} Custom team object or null if not a custom team
 */
async function getCustomTeam(leagueKey, teamIdentifier) {
    const leagueOverrides = getLeagueOverrides(leagueKey);
    const teamOverride = leagueOverrides[teamIdentifier];
    
    if (!teamOverride || !teamOverride.custom || !teamOverride.override) {
        return null;
    }
    
    // Build a standardized team object from the override data
    const override = teamOverride.override;
    const customTeam = {
        name: override.name || teamIdentifier,
        abbreviation: override.abbreviation || teamIdentifier.toUpperCase().substring(0, 3),
        color: override.color || null,
        alternateColor: override.alternateColor || null,
        logo: override.logoUrl || override.logo || null,
        ...override // Include any additional fields
    };
    
    // Ensure logo field is set correctly (in case override has logoUrl)
    if (override.logoUrl && !customTeam.logo) {
        customTeam.logo = override.logoUrl;
    }
    
    // Extract colors from logo if not provided
    if ((!customTeam.color || !customTeam.alternateColor) && customTeam.logo) {
        try {
            const { extractDominantColors } = require('./colorUtils');
            const extractedColors = await extractDominantColors(customTeam.logo, 2);
            if (!customTeam.color) customTeam.color = extractedColors[0] || '#000000';
            if (!customTeam.alternateColor) customTeam.alternateColor = extractedColors[1] || '#FFFFFF';
        } catch (error) {
            logger.warn('Failed to extract colors for custom team', { team: customTeam.name, error: error.message });
            // Fall back to defaults if extraction fails
            if (!customTeam.color) customTeam.color = '#000000';
            if (!customTeam.alternateColor) customTeam.alternateColor = '#FFFFFF';
        }
    } else if (!customTeam.color || !customTeam.alternateColor) {
        // No logo to extract from, use defaults
        if (!customTeam.color) customTeam.color = '#000000';
        if (!customTeam.alternateColor) customTeam.alternateColor = '#FFFFFF';
    }
    
    return customTeam;
}

function findTeamByAlias(input, leagueKey, teams) {
    const normalizedInput = normalizeCompact(input);
    
    // Check each team's aliases
    for (const team of teams) {
        // Extract slug from team object (try multiple properties)
        let teamSlug = team.slug || team.espnId || team.id;
        if (teamSlug && teamSlug.includes('.')) {
            teamSlug = teamSlug.split('.')[1];
        }
        // Normalize underscores to hyphens
        teamSlug = teamSlug?.replace(/_/g, '-');
        
        // Check aliases across ALL leagues (not just the current one)
        // This ensures fallback leagues can still use aliases defined for the original league
        for (const [league, leagueTeams] of Object.entries(teamOverrides)) {
            const teamOverride = leagueTeams[teamSlug];
            
            if (teamOverride?.aliases) {
                for (const alias of teamOverride.aliases) {
                    // Use compact normalization to match with or without spaces
                    if (normalizeCompact(alias) === normalizedInput) {
                        return team;
                    }
                }
            }
        }
    }
    
    return null;
}

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
    return str
        .normalize('NFD')               // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .toLowerCase()
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
    return str
        .normalize('NFD')               // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');     // Remove all non-alphanumeric chars
}

/**
 * Generate a slug from a team name (kebab-case)
 * Used for team identifiers in teams.json and raw endpoint
 * @param {string} str - Team name to slugify
 * @returns {string} Lowercase kebab-case slug (e.g., "manchester-united")
 */
function generateSlug(str) {
    if (!str) return '';
    return str
        .normalize('NFD')               // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')   // Remove special chars, keep spaces and hyphens
        .replace(/\s+/g, '-')           // Convert spaces to hyphens
        .replace(/-+/g, '-')            // Collapse multiple hyphens
        .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
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

    // Handle city names that include trailing "state"/"st" but input omits it
    const strippedVariants = [
        compactCity.replace(/state$/, ''),
        compactCity.replace(/st$/, ''),
        compactCity.replace(/st\.$/, '')
    ].filter(v => v && v.length >= 3);
    if (strippedVariants.some(v => compactPrefix === v || compactPrefix.startsWith(v))) {
        return true;
    }
    
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
    const teamNames = [normalized.compactShortDisplayName, normalized.compactName, normalized.compactAbbreviation];
    
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
        
        // Special case: Check if the team name/abbreviation itself starts with a location code
        // (e.g., "LAFC" starts with "LA", so "losangelesfc" should match)
        if (teamName.length >= 3) {
            for (const [abbrev, expansions] of Object.entries(LOCATION_ABBREVIATIONS)) {
                if (teamName.startsWith(abbrev)) {
                    const restOfTeamName = teamName.substring(abbrev.length);
                    // Check if input matches expanded location + rest of team name
                    for (const expansion of expansions) {
                        const compactExpansion = normalizeCompact(expansion);
                        if (compactInput === compactExpansion + restOfTeamName) {
                            return 950;
                        }
                    }
                }
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
    // For name fields, prevent short generic words from matching when followed by substantial text
    const checkSubstring = (field, compactField, containsScore, isContainedScore, checkTrailingText = false) => {
        let s = 0;
        
        // Check if input contains field
        if (field && field.length >= MIN_LENGTH && expandedInput.includes(field)) {
            if (checkTrailingText) {
                // Don't match if field is followed by substantial text (likely a different team)
                const fieldIndex = expandedInput.indexOf(field);
                const textAfterField = expandedInput.substring(fieldIndex + field.length);
                // Skip if field is followed by 4+ more chars (prevents "Missouri St" from matching "MissouriSTMiners")
                if (textAfterField.length >= 4) {
                    s = 0;
                } else {
                    s = Math.max(s, containsScore);
                }
            } else {
                s = Math.max(s, containsScore);
            }
        }
        
        if (compactField && compactField.length >= MIN_LENGTH && compactInput.includes(compactField)) {
            if (checkTrailingText) {
                const fieldIndex = compactInput.indexOf(compactField);
                const textAfterField = compactInput.substring(fieldIndex + compactField.length);
                // Skip if field is followed by 4+ more chars
                if (textAfterField.length >= 4) {
                    s = 0;
                } else {
                    s = Math.max(s, containsScore);
                }
            } else {
                s = Math.max(s, containsScore);
            }
        }
        
        if (field && expandedInput.length >= MIN_LENGTH && field.includes(expandedInput)) s = Math.max(s, isContainedScore);
        if (compactField && compactInput.length >= MIN_LENGTH && compactField.includes(compactInput)) s = Math.max(s, isContainedScore);
        return s;
    };
    
    // Team name/shortDisplayName (score: 400 if input contains, 300 if contains input)
    // Use trailing text check to prevent "Ohio" from matching "OhioWesleyanBattlingBishops"
    score = Math.max(score, checkSubstring(normalized.name, normalized.compactName, 400, 300, true));
    score = Math.max(score, checkSubstring(normalized.shortDisplayName, normalized.compactShortDisplayName, 400, 300, true));
    
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
 * Get match score for a team, checking both overridden and original abbreviations
 * @param {string} input - User search input
 * @param {Object} team - Standardized team object
 * @param {string} teamSlug - Team slug for override lookup (optional)
 * @param {string} leagueKey - League key for override lookup (optional)
 * @returns {number} Best match score considering overrides
 */
function getTeamMatchScoreWithOverrides(input, team, teamSlug, leagueKey) {
    let bestScore = 0;
    
    // If we have league/team info, check for overridden abbreviation
    if (teamSlug && leagueKey) {
        const leagueOverrides = getLeagueOverrides(leagueKey);
        const teamOverride = leagueOverrides[teamSlug];
        const overriddenAbbreviation = teamOverride?.override?.abbreviation;
        
        // Check with overridden abbreviation first (full priority)
        if (overriddenAbbreviation) {
            const teamWithOverride = { ...team, abbreviation: overriddenAbbreviation };
            bestScore = getTeamMatchScore(input, teamWithOverride);
        }
    }
    
    // Check with original abbreviation at 90% priority
    const originalScore = getTeamMatchScore(input, team) * 0.9;
    bestScore = Math.max(bestScore, originalScore);
    
    return bestScore;
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
    generateSlug,
    
    // Location abbreviations
    LOCATION_ABBREVIATIONS,
    expandLocationAbbreviations,
    
    // Team matching
    getTeamMatchScore,
    getTeamMatchScoreWithOverrides,
    findBestTeamMatch,
    
    // Team overrides
    loadTeamOverrides,
    getLeagueOverrides,
    applyTeamOverrides,
    getTeamAliases,
    findTeamByAlias,
    
    // Custom teams
    isCustomTeam,
    getCustomTeam
};

// ------------------------------------------------------------------------------