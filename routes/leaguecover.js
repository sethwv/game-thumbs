// ------------------------------------------------------------------------------
// leaguecover.js
// Route to generate league cover images with gradient background
// Cover size is 1080W x 1440H by default
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { findLeague } = require('../leagues');
const { generateLeagueCover } = require('../generators/genericImageGenerator');
const { sendCachedOrGenerate, handleImageRouteError } = require('../helpers/routeUtils');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/leaguecover",
        "/:league/leaguecover.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league } = req.params;

        try {
            const leagueObj = await findLeague(league);
            if (!leagueObj) {
                logger.warn('Unsupported league requested', {
                    League: league,
                    URL: req.url,
                    IP: req.ip
                });
                return res.status(400).json({ error: `Unsupported league: ${league}` });
            }

            // Get both league logo URLs (light and dark variants for contrast checking)
            const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
            const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);

            if (!leagueLogoUrl) {
                return res.status(404).json({ error: 'League logo not found' });
            }

            // Generate the league cover
            const coverBuffer = await generateLeagueCover(leagueLogoUrl, {
                width: 1080,
                height: 1440,
                leagueLogoUrlAlt: leagueLogoUrlAlt
            });

            // Send successful response
            sendCachedOrGenerate(req, res, coverBuffer);
        } catch (error) {
            handleImageRouteError(error, req, res, 'League cover generation failed');
        }
    }
};
