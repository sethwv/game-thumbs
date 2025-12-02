// ------------------------------------------------------------------------------
// leagues.js
// League lookup and matching logic
// League definitions are stored in leagues.json
// ------------------------------------------------------------------------------

const leaguesRaw = require('./leagues.json');

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
        
        // Match by shortName (primary identifier)
        if (normalizeForComparison(league.shortName) === searchTerm) {
            return league;
        }
        
        // Match by full name
        if (normalizeForComparison(league.name) === searchTerm) {
            return league;
        }
        
        // Match by league key
        if (normalizeForComparison(key) === searchTerm) {
            return league;
        }
        
        // Match by common aliases (provider-agnostic)
        // Compare normalized versions (without special characters)
        if (league.aliases && league.aliases.some(alias => 
            normalizeForComparison(alias)?.replace(/[^a-z0-9]/g, '') === normalizedSearch
        )) {
            return league;
        }
    }
    
    return null;
}

// ------------------------------------------------------------------------------

module.exports = {
    leagues,
    findLeague,
};

// ------------------------------------------------------------------------------
