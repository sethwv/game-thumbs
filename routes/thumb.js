// ------------------------------------------------------------------------------
// thumb.js
// Route to generate game thumbnail images
// Thumb size is 1440W x 1080H by default
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateThumbnail } = require('../helpers/thumbnailGenerator');
const { findLeague } = require('../leagues');

module.exports = {
    paths: [
        "/:league/:team1/:team2/thumb",
        "/:league/:team1/:team2/thumb.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { logo, style } = req.query;

        const thumbnailOptions = {
            width: 1440,
            height: 1080,
            style: parseInt(style) || 1,
            league: logo === 'false' ? null : league
        };

        try {
            const leagueObj = findLeague(league);
            if (!leagueObj) {
                return res.status(400).json({ error: `Unsupported league: ${league}` });
            }

            const resolvedTeam1 = await providerManager.resolveTeam(leagueObj, team1);
            const resolvedTeam2 = await providerManager.resolveTeam(leagueObj, team2);

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
                console.error('Failed to cache image:', cacheError);
            }
        } catch (error) {
            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};