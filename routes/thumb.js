// ------------------------------------------------------------------------------
// thumb.js
// Route to generate game thumbnail images
// Thumb size is 1440W x 1080H by default
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateThumbnail } = require('../helpers/thumbnailGenerator');
const { findLeague } = require('../leagues');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/:team1/:team2/thumb",
        "/:league/:team1/:team2/thumb.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { logo, style, fallback } = req.query;

        const thumbnailOptions = {
            width: 1440,
            height: 1080,
            style: parseInt(style) || 1,
            league: logo === 'false' ? null : league
        };

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

            let resolvedTeam1, resolvedTeam2;
            try {
                resolvedTeam1 = await providerManager.resolveTeam(leagueObj, team1);
                resolvedTeam2 = await providerManager.resolveTeam(leagueObj, team2);
            } catch (teamError) {
                // If fallback is enabled and team lookup fails, generate league thumbnail instead
                if (fallback === 'true' && teamError.name === 'TeamNotFoundError') {
                    const { generateLeagueThumb } = require('../helpers/leagueImageGenerator');
                    const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
                    const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);
                    
                    const fallbackBuffer = await generateLeagueThumb(leagueLogoUrl, {
                        width: 1440,
                        height: 1080,
                        leagueLogoUrlAlt: leagueLogoUrlAlt
                    });
                    
                    res.set('Content-Type', 'image/png');
                    res.send(fallbackBuffer);
                    
                    try {
                        require('../helpers/imageCache').addToCache(req, res, fallbackBuffer);
                    } catch (cacheError) {
                        logger.error('Failed to cache image', {
                            Error: cacheError.message,
                            URL: req.url
                        });
                    }
                    return;
                }
                // If fallback is disabled or it's a different error, rethrow
                throw teamError;
            }

            // Get league logo URL if needed
            let leagueInfo = null;
            if (thumbnailOptions.league) {
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                leagueInfo = { logoUrl: leagueLogoUrl };
            }

            const thumbnailBuffer = await generateThumbnail(resolvedTeam1, resolvedTeam2, {
                ...thumbnailOptions,
                league: leagueInfo
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
                Teams: `${team1} vs ${team2}`,
                URL: req.url,
                IP: req.ip
            };

            // For TeamNotFoundError, use a cleaner console message
            if (error.name === 'TeamNotFoundError') {
                errorDetails.Error = `Team not found: '${error.teamIdentifier}' in ${error.league}`;
                errorDetails['Available Teams'] = `${error.teamCount} teams available`;
            }

            // Logger will handle stack trace automatically (file: always, console: dev only)
            logger.error('Thumbnail generation failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};