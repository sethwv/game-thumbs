// ------------------------------------------------------------------------------
// errors.js
// Shared error classes used across providers and routes
// ------------------------------------------------------------------------------

class TeamNotFoundError extends Error {
    constructor(teamIdentifier, league, availableTeams = []) {
        // Build message from available teams
        let teamNames;
        if (Array.isArray(availableTeams) && availableTeams.length > 0) {
            // Handle different team data shapes from different providers
            teamNames = availableTeams.map(t => {
                if (typeof t === 'string') return t;
                return t.name || t.strTeam || t.displayName || t.shortDisplayName ||
                    (t.city && t.nickname ? `${t.city} ${t.nickname}` : null) ||
                    t.fullName || 'Unknown';
            });
        } else if (typeof availableTeams === 'object' && !Array.isArray(availableTeams)) {
            // FlagCDNProvider passes an object keyed by country name
            teamNames = Object.keys(availableTeams);
        } else {
            teamNames = [];
        }

        const displayNames = teamNames.slice(0, 20).join(', ');
        const remaining = teamNames.length > 20 ? ` and ${teamNames.length - 20} more` : '';
        const leagueName = typeof league === 'string' ? league :
            (league?.shortName?.toUpperCase() || league?.name || 'unknown');

        super(`Team not found: '${teamIdentifier}' in ${leagueName}. Available teams: ${displayNames}${remaining}`);
        this.name = 'TeamNotFoundError';
        this.teamIdentifier = teamIdentifier;
        this.league = typeof league === 'string' ? league : (league?.shortName || league?.name);
        this.availableTeams = availableTeams;
        this.teamCount = teamNames.length;
    }
}

module.exports = { TeamNotFoundError };
