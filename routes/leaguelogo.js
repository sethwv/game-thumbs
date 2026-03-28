// ------------------------------------------------------------------------------
// leaguelogo.js
// Route to return the raw league logo image
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { findLeague } = require('../leagues');
const { downloadImage } = require('../helpers/imageUtils');
const { sendCachedOrGenerate, handleImageRouteError } = require('../helpers/routeUtils');
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
            const leagueObj = await findLeague(league);
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
            sendCachedOrGenerate(req, res, logoBuffer);
        } catch (error) {
            handleImageRouteError(error, req, res, 'League logo fetch failed');
        }
    }
};
