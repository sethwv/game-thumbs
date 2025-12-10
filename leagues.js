// ------------------------------------------------------------------------------
// leagues.js
// League lookup and matching logic
// League definitions are loaded from leagues.json (built-in)
// and merged with all .json files in json/leagues/ directory (user-provided)
// ------------------------------------------------------------------------------

const { loadAndMergeJSON } = require('./helpers/jsonMerger');

// Load base leagues.json + all files from json/leagues/ directory
const leaguesRaw = loadAndMergeJSON('leagues.json', 'json/leagues', 'leagues');

// Add shortName to each league from its key
const leagues = {};
for (const key in leaguesRaw) {
    leagues[key] = {
        ...leaguesRaw[key],
        shortName: leaguesRaw[key].shortName || key.toUpperCase()
    };
}

// ------------------------------------------------------------------------------

function findLeague(identifier) {
    if (!identifier) return null;
    
    const searchTerm = (identifier?.shortName ?? identifier)
        .normalize('NFD')               // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .toLowerCase();
    // Normalize by removing non-alphanumeric characters for flexible matching
    const normalizedSearch = searchTerm.replace(/[^a-z0-9]/g, '');
    
    for (const key in leagues) {
        const league = leagues[key];
        
        // Normalize league properties for comparison
        const normalizeForComparison = (str) => str
            ?.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        
        // Helper to get fully normalized (alphanumeric-only) version
        const normalizeAlphanumeric = (str) => normalizeForComparison(str)?.replace(/[^a-z0-9]/g, '');
        
        // Match by shortName (primary identifier) - try exact match first, then normalized
        const shortName = normalizeForComparison(league.shortName);
        if (shortName === searchTerm || normalizeAlphanumeric(league.shortName) === normalizedSearch) {
            return league;
        }
        
        // Match by full name - try exact match first, then normalized
        const fullName = normalizeForComparison(league.name);
        if (fullName === searchTerm || normalizeAlphanumeric(league.name) === normalizedSearch) {
            return league;
        }
        
        // Match by league key - try exact match first, then normalized
        const leagueKey = normalizeForComparison(key);
        if (leagueKey === searchTerm || normalizeAlphanumeric(key) === normalizedSearch) {
            return league;
        }
        
        // Match by common aliases (provider-agnostic)
        // Compare normalized versions (without special characters)
        if (league.aliases && league.aliases.some(alias => 
            normalizeForComparison(alias) === searchTerm || normalizeAlphanumeric(alias) === normalizedSearch
        )) {
            return league;
        }
    }
    
    return null;
}

// ------------------------------------------------------------------------------

function getAllLeagues() {
    return leagues;
}

// ------------------------------------------------------------------------------

module.exports = {
    leagues,
    findLeague,
    getAllLeagues,
};

// ------------------------------------------------------------------------------
