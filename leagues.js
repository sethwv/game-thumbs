// ------------------------------------------------------------------------------
// leagues.js
// League lookup and matching logic
// League definitions are stored in leagues.json
// ------------------------------------------------------------------------------

const leagues = require('./leagues.json');

// ------------------------------------------------------------------------------

function findLeague(identifier) {
    if (!identifier) return null;
    
    const searchTerm = (identifier?.shortName ?? identifier).toLowerCase();
    // Normalize by removing non-alphanumeric characters for flexible matching
    const normalizedSearch = searchTerm.replace(/[^a-z0-9]/g, '');
    
    for (const key in leagues) {
        const league = leagues[key];
        
        // Match by shortName (primary identifier)
        if (league.shortName?.toLowerCase() === searchTerm) {
            return league;
        }
        
        // Match by full name
        if (league.name?.toLowerCase() === searchTerm) {
            return league;
        }
        
        // Match by league key
        if (key.toLowerCase() === searchTerm) {
            return league;
        }
        
        // Match by common aliases (provider-agnostic)
        // Compare normalized versions (without special characters)
        if (league.aliases && league.aliases.some(alias => 
            alias.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSearch
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
