// ------------------------------------------------------------------------------
// logo.js
// Route to generate game logo images
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateLogo } = require('../helpers/logoGenerator');
const { findLeague } = require('../leagues');


module.exports = {
    paths: [
        "/:league/:team1/:team2/logo",
        "/:league/:team1/:team2/logo.png"
    ],
    method: "get",
    handler: async (req, res) => {
    const { league, team1, team2 } = req.params;
    const { size, logo, style, useLight, trim } = req.query;

    const logoOptions = {
        width: 1024,
        height: 1024,
        style: parseInt(style) || 1,
        league: logo === 'true' ? league : null,
        useLight: useLight === 'true',
        trim: trim === 'true'
    };        const validSizes = [256, 512, 1024, 2048];
        const sizeValue = parseInt(size);
        if (validSizes.includes(sizeValue)) {
            logoOptions.width = sizeValue;
            logoOptions.height = sizeValue;
        }

        try {
            const leagueObj = findLeague(league);
            if (!leagueObj) {
                return res.status(400).json({ error: `Unsupported league: ${league}` });
            }

            const resolvedTeam1 = await providerManager.resolveTeam(leagueObj, team1);
            const resolvedTeam2 = await providerManager.resolveTeam(leagueObj, team2);

            // Get league logo URL if needed
            let leagueInfo = null;
            if (logoOptions.league) {
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                leagueInfo = { logoUrl: leagueLogoUrl };
            }

            const logoBuffer = await generateLogo(resolvedTeam1, resolvedTeam2, {
                ...logoOptions,
                league: leagueInfo
            });
            res.set('Content-Type', 'image/png');
            res.send(logoBuffer);
            require('../helpers/imageCache').addToCache(req, res, logoBuffer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};