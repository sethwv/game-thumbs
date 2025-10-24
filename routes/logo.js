// ------------------------------------------------------------------------------
// logo.js
// Route to generate game logo images
// ------------------------------------------------------------------------------

const { resolveTeam } = require('../helpers/ESPNTeamResolver');
const { generateLogo } = require('../helpers/logoGenerator');


module.exports = {
    paths: [
        "/:league/:team1/:team2/logo",
        "/:league/:team1/:team2/logo.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { size, logo, style, useLight } = req.query;

        const logoOptions = {
            width: 1024,
            height: 1024,
            style: parseInt(style) || 1,
            league: logo === 'true' ? league : null,
            useLight: useLight === 'true'
        };

        const validSizes = [256, 512, 1024, 2048];
        const sizeValue = parseInt(size);
        if (validSizes.includes(sizeValue)) {
            logoOptions.width = sizeValue;
            logoOptions.height = sizeValue;
        }

        try {
            const resolvedTeam1 = await resolveTeam(league, team1);
            const resolvedTeam2 = await resolveTeam(league, team2);

            const logoBuffer = await generateLogo(resolvedTeam1, resolvedTeam2, logoOptions);
            res.set('Content-Type', 'image/png');
            res.send(logoBuffer);
            require('../helpers/imageCache').addToCache(req, res, logoBuffer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};