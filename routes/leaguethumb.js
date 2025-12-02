// ------------------------------------------------------------------------------
// leaguethumb.js
// Route to generate league thumbnail images with gradient background
// Thumb size is 1440W x 1080H by default
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { findLeague } = require('../leagues');
const { generateLeagueThumb } = require('../helpers/genericImageGenerator');
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
            const leagueObj = findLeague(league);
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
            res.set('Content-Type', 'image/png');
            res.send(thumbnailBuffer);

            // Cache successful result (don't let caching errors affect the response)
            try {
                require('../helpers/imageCache').addToCache(req, res, thumbnailBuffer);
            } catch (cacheError) {
                logger.error('Failed to cache image', {
                    Error: cacheError.message,
                    URL: req.url
                });
            }
        } catch (error) {
            const errorDetails = {
                Error: error.message,
                League: league,
                URL: req.url,
                IP: req.ip
            };

            // Logger will handle stack trace automatically (file: always, console: dev only)
            logger.error('League thumbnail generation failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};
