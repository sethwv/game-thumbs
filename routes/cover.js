// ------------------------------------------------------------------------------
// cover.js
// Route to generate game cover images
// Cover size is 1080W x 1440H by default
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateCover } = require('../helpers/thumbnailGenerator');
const { findLeague } = require('../leagues');

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
            const leagueObj = findLeague(league);
            if (!leagueObj) {
                return res.status(400).json({ error: `Unsupported league: ${league}` });
            }

            const resolvedTeam1 = await providerManager.resolveTeam(leagueObj, team1);
            const resolvedTeam2 = await providerManager.resolveTeam(leagueObj, team2);

            // Get league logo URL if needed
            let leagueInfo = null;
            if (coverOptions.league) {
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                leagueInfo = { logoUrl: leagueLogoUrl };
            }

            const coverBuffer = await generateCover(resolvedTeam1, resolvedTeam2, {
                ...coverOptions,
                league: leagueInfo
            });
            res.set('Content-Type', 'image/png');
            res.send(coverBuffer);
            require('../helpers/imageCache').addToCache(req, res, coverBuffer);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};