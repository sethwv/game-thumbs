// ------------------------------------------------------------------------------
// raw.js
// Route to return the raw json data for a team
// ------------------------------------------------------------------------------

const { resolveTeam } = require('../providers/ESPN');

module.exports = {
    paths: [
        "/:league/:team/raw",
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team } = req.params;

        try {
            const resolvedTeam = await resolveTeam(league, team);
            res.json(resolvedTeam);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};