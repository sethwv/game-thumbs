// ------------------------------------------------------------------------------
// teamlogo.js
// Route to return the raw team logo image
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { findLeague } = require('../leagues');
const { downloadImage } = require('../helpers/imageUtils');
const { sendCachedOrGenerate, handleImageRouteError } = require('../helpers/routeUtils');
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
            const leagueObj = await findLeague(league);
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
                return res.status(400).json({ 
                    error: `Invalid variant: ${variant}. Use 'light' or 'dark'` 
                });
            }

            if (!logoUrl) {
                return res.status(404).json({ error: 'Logo not found for team' });
            }

            // Download the image
            const logoBuffer = await downloadImage(logoUrl);

            // Send successful response
            sendCachedOrGenerate(req, res, logoBuffer);
        } catch (error) {
            handleImageRouteError(error, req, res, 'Team logo fetch failed');
        }
    }
};
