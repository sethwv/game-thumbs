// ------------------------------------------------------------------------------
// leaguecover.js
// Route to generate league cover images with gradient background
// Cover size is 1080W x 1440H by default
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { findLeague } = require('../leagues');
const { generateLeagueCover } = require('../helpers/leagueImageGenerator');
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

            // Generate the league cover
            const coverBuffer = await generateLeagueCover(leagueLogoUrl, {
                width: 1080,
                height: 1440,
                leagueLogoUrlAlt: leagueLogoUrlAlt
            });

            // Send successful response
            res.set('Content-Type', 'image/png');
            res.send(coverBuffer);

            // Cache successful result (don't let caching errors affect the response)
            try {
                require('../helpers/imageCache').addToCache(req, res, coverBuffer);
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
            logger.error('League cover generation failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};
