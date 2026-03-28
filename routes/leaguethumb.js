// ------------------------------------------------------------------------------
// leaguethumb.js
// Route to generate league thumbnail images with gradient background
// Thumb size is 1440W x 1080H by default
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { findLeague } = require('../leagues');
const { generateLeagueThumb } = require('../generators/genericImageGenerator');
const { sendCachedOrGenerate, handleImageRouteError } = require('../helpers/routeUtils');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/leaguethumb",
        "/:league/leaguethumb.png"
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

            // Generate the league thumbnail
            const thumbnailBuffer = await generateLeagueThumb(leagueLogoUrl, {
                width: 1440,
                height: 1080,
                leagueLogoUrlAlt: leagueLogoUrlAlt
            });

            // Send successful response
            sendCachedOrGenerate(req, res, thumbnailBuffer);
        } catch (error) {
            handleImageRouteError(error, req, res, 'League thumbnail generation failed');
        }
    }
};
