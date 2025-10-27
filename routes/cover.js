// ------------------------------------------------------------------------------
// cover.js
// Route to generate game cover images
// Cover size is 1080W x 1440H by default
// ------------------------------------------------------------------------------

const { resolveTeam } = require('../helpers/ESPNTeamResolver');
const { generateCover } = require('../helpers/thumbnailGenerator');

module.exports = {
    paths: [
        "/:league/:team1/:team2/cover",
        "/:league/:team1/:team2/cover.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { logo, style } = req.query;

        const coverOptions = {
            width: 1080,
            height: 1440,
            style: parseInt(style) || 1,
            league: logo === 'false' ? null : league
        };

        try {
            const resolvedTeam1 = await resolveTeam(league, team1);
            const resolvedTeam2 = await resolveTeam(league, team2);

            const coverBuffer = await generateCover(resolvedTeam1, resolvedTeam2, coverOptions);
            res.set('Content-Type', 'image/png');
            res.send(coverBuffer);
            require('../helpers/imageCache').addToCache(req, res, coverBuffer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};