// ------------------------------------------------------------------------------
// thumb.js
// Route to generate game thumbnail images
// ------------------------------------------------------------------------------

const { resolveTeam } = require('../helpers/ESPNTeamResolver');
const { generateThumbnail } = require('../helpers/thumbnailGenerator');

module.exports = {
    // path: "/:league/:team1/:team2/thumb",
    paths: [
        "/:league/:team1/:team2/thumb",
        "/:league/:team1/:team2/thumb.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { size, logo, style } = req.query;

        const thumbnailOptions = {
            width: 1920,
            height: 1080,
            style: parseInt(style) || 1,
            league: logo === 'true' ? league : null
        };

        const validResolutions = [360, 720, 1080, 2160];
        const resolutionValue = parseInt(size);
        if (validResolutions.includes(resolutionValue)) {
            thumbnailOptions.width = resolutionValue * 16 / 9;
            thumbnailOptions.height = resolutionValue;
        }

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