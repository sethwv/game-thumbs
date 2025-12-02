// ------------------------------------------------------------------------------
// teamOverrides.js
// Handles team-specific overrides from teams.json (built-in)
// and merged with all .json files in json/teams/ directory (user-provided)
// ------------------------------------------------------------------------------

const { loadAndMergeJSON } = require('./jsonMerger');
const logger = require('./logger');

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

function findTeamByAlias(input, leagueKey, teams) {
    const { normalizeCompact } = require('./teamMatchingUtils');
    const normalizedInput = normalizeCompact(input);
    const leagueOverrides = getLeagueOverrides(leagueKey);
    
    // Check each team's aliases
    for (const team of teams) {
        // Extract slug from espnId (e.g., 'eng.nottm_forest' -> 'nottm-forest')
        let teamSlug = team.espnId || team.id;
        if (teamSlug && teamSlug.includes('.')) {
            teamSlug = teamSlug.split('.')[1];
        }
        // Normalize underscores to hyphens
        teamSlug = teamSlug?.replace(/_/g, '-');
        
        const teamOverride = leagueOverrides[teamSlug];
        
        if (teamOverride?.aliases) {
            for (const alias of teamOverride.aliases) {
                // Use compact normalization to match with or without spaces
                if (normalizeCompact(alias) === normalizedInput) {
                    return team;
                }
            }
        }
    }
    
    return null;
}

module.exports = {
    loadTeamOverrides,
    getLeagueOverrides,
    applyTeamOverrides,
    getTeamAliases,
    findTeamByAlias
};
