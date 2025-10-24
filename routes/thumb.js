// ------------------------------------------------------------------------------
// thumb.js
// Route to generate game thumbnail images
// Thumb size is 1440W x 1080H by default
// ------------------------------------------------------------------------------

const { resolveTeam } = require('../helpers/ESPNTeamResolver');
const { generateThumbnail } = require('../helpers/thumbnailGenerator');

module.exports = {
    paths: [
        "/:league/:team1/:team2/thumb",
        "/:league/:team1/:team2/thumb.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { logo, style } = req.query;

        const thumbnailOptions = {
            width: 1440,
            height: 1080,
            style: parseInt(style) || 1,
            league: logo === 'true' ? league : null
        };

        try {
            const resolvedTeam1 = await resolveTeam(league, team1);
            const resolvedTeam2 = await resolveTeam(league, team2);

            const thumbnailBuffer = await generateThumbnail(resolvedTeam1, resolvedTeam2, thumbnailOptions);
            res.set('Content-Type', 'image/png');
            res.send(thumbnailBuffer);
            require('../helpers/imageCache').addToCache(req, res, thumbnailBuffer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};