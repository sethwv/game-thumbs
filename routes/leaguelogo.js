// ------------------------------------------------------------------------------
// leaguelogo.js
// Route to return the raw league logo image
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { findLeague } = require('../leagues');
const { downloadImage } = require('../helpers/imageUtils');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/leaguelogo",
        "/:league/leaguelogo.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league } = req.params;
        const { variant } = req.query;

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

            // Determine which logo variant to fetch
            const darkLogoPreferred = variant === 'dark';
            
            // Validate variant parameter if provided
            if (variant && variant !== 'light' && variant !== 'dark') {
                return res.status(400).json({ 
                    error: `Invalid variant: ${variant}. Use 'light' or 'dark'` 
                });
            }

            // Get league logo URL
            const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, darkLogoPreferred);

            if (!leagueLogoUrl) {
                return res.status(404).json({ error: 'League logo not found' });
            }

            // Download the image
            const logoBuffer = await downloadImage(leagueLogoUrl);

            // Send successful response
            res.set('Content-Type', 'image/png');
            res.send(logoBuffer);

            // Cache successful result (don't let caching errors affect the response)
            try {
                require('../helpers/imageCache').addToCache(req, res, logoBuffer);
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
            logger.error('League logo fetch failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};
