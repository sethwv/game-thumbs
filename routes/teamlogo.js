// ------------------------------------------------------------------------------
// teamlogo.js
// Route to return the raw team logo image
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { findLeague } = require('../leagues');
const { downloadImage } = require('../helpers/imageUtils');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/:team/teamlogo",
        "/:league/:team/teamlogo.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team } = req.params;
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

            const resolvedTeam = await providerManager.resolveTeam(leagueObj, team);

            // Determine which logo URL to use based on variant parameter
            let logoUrl;
            if (variant === 'dark' && resolvedTeam.logoAlt) {
                logoUrl = resolvedTeam.logoAlt;
            } else if (variant === 'light' || !variant) {
                logoUrl = resolvedTeam.logo;
            } else {
                // If variant specified but not 'dark' or 'light', return error
                if (variant) {
                    return res.status(400).json({ 
                        error: `Invalid variant: ${variant}. Use 'light' or 'dark'` 
                    });
                }
                logoUrl = resolvedTeam.logo;
            }

            if (!logoUrl) {
                return res.status(404).json({ error: 'Logo not found for team' });
            }

            // Download the image
            const logoBuffer = await downloadImage(logoUrl);

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
                Team: team,
                URL: req.url,
                IP: req.ip
            };

            // For TeamNotFoundError, use a cleaner console message
            if (error.name === 'TeamNotFoundError') {
                errorDetails.Error = `Team not found: '${error.teamIdentifier}' in ${error.league}`;
                errorDetails['Available Teams'] = `${error.teamCount} teams available`;
            }

            // Logger will handle stack trace automatically (file: always, console: dev only)
            logger.error('Team logo fetch failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};
