// ------------------------------------------------------------------------------
// raw.js
// Route to return the raw json data for a team
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { findLeague } = require('../leagues');

module.exports = {
    paths: [
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

            const resolvedTeam = await providerManager.resolveTeam(leagueObj, team);
            res.json(resolvedTeam);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};