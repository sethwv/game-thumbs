// ------------------------------------------------------------------------------
// raw.js
// Route to return the raw json data for a league or team
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { findLeague } = require('../leagues');

module.exports = {
    paths: [
        "/:league/raw",
        "/:league/:team/raw",
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team } = req.params;

        try {
            const leagueObj = findLeague(league);
            if (!leagueObj) {
                return res.status(400).json({ error: `Unsupported league: ${league}` });
            }

            // If no team specified, return league data
            if (!team) {
                return res.json({
                    league: leagueObj.shortName || league.toUpperCase(),
                    name: leagueObj.name,
                    aliases: leagueObj.aliases || [],
                    providers: leagueObj.providers || [],
                    logoUrl: leagueObj.logoUrl || null,
                    logoUrlDark: leagueObj.logoUrlDark || null,
                    feederLeagues: leagueObj.feederLeagues || [],
                    fallbackLeague: leagueObj.fallbackLeague || null
                });
            }

            // Otherwise, return team data
            const resolvedTeam = await providerManager.resolveTeam(leagueObj, team);
            res.json(resolvedTeam);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};