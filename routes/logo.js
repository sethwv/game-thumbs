// ------------------------------------------------------------------------------
// logo.js
// Route to generate game logo images
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateLogo } = require('../helpers/logoGenerator');
const { findLeague } = require('../leagues');
const logger = require('../helpers/logger');


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
                logger.warn('Unsupported league requested', {
                    League: league,
                    URL: req.url,
                    IP: req.ip
                });
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
                Teams: `${team1} vs ${team2}`,
                URL: req.url,
                IP: req.ip
            };
            
            // For TeamNotFoundError, use a cleaner console message
            if (error.name === 'TeamNotFoundError') {
                errorDetails.Error = `Team not found: '${error.teamIdentifier}' in ${error.league}`;
                errorDetails['Available Teams'] = `${error.teamCount} teams available`;
            }
            
            // Only include stack trace in development mode
            if (process.env.NODE_ENV === 'development') {
                errorDetails.Stack = error.stack;
            }
            
            logger.error('Logo generation failed', errorDetails);
            
            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};