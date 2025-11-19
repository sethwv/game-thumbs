// ------------------------------------------------------------------------------
// teamOverrides.js
// Handles team-specific overrides from teams.json
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

let teamOverrides = {};

function loadTeamOverrides() {
    try {
        const teamsPath = path.join(__dirname, '..', 'teams.json');
        const teamsData = fs.readFileSync(teamsPath, 'utf8');
        teamOverrides = JSON.parse(teamsData);
    } catch (error) {
        console.warn('Failed to load teams.json:', error.message);
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
    const { normalize } = require('./teamMatchingUtils');
    const normalizedInput = normalize(input);
    const leagueOverrides = getLeagueOverrides(leagueKey);
    
    // Check each team's aliases
    for (const team of teams) {
        const teamId = team.espnId || team.id;
        const teamOverride = leagueOverrides[teamId];
        
        if (teamOverride?.aliases) {
            for (const alias of teamOverride.aliases) {
                if (normalize(alias) === normalizedInput) {
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
