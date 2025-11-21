// ------------------------------------------------------------------------------
// banner.js
// Route to generate game banner images
// Banner size is 1920W x 1080H (16:9 aspect ratio)
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateThumbnail } = require('../helpers/thumbnailGenerator');
const { findLeague } = require('../leagues');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/:team1/:team2/banner",
        "/:league/:team1/:team2/banner.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { logo, style } = req.query;

        const bannerOptions = {
            width: 1920,
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

            const resolvedTeam1 = await providerManager.resolveTeam(leagueObj, team1);
            const resolvedTeam2 = await providerManager.resolveTeam(leagueObj, team2);

            // Get league logo URL if needed
            let leagueInfo = null;
            if (bannerOptions.league) {
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                leagueInfo = { logoUrl: leagueLogoUrl };
            }

            const bannerBuffer = await generateThumbnail(resolvedTeam1, resolvedTeam2, {
                ...bannerOptions,
                league: leagueInfo
            });

            // Send successful response
            res.set('Content-Type', 'image/png');
            res.send(bannerBuffer);

            // Cache successful result (don't let caching errors affect the response)
            try {
                require('../helpers/imageCache').addToCache(req, res, bannerBuffer);
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
            logger.error('Banner generation failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};
