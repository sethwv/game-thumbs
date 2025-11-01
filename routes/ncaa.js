// ------------------------------------------------------------------------------
// ncaa.js
// Route to forward NCAA requests to the appropriate handler
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateCover } = require('../helpers/thumbnailGenerator');
const { findLeague } = require('../leagues');

module.exports = {
    paths: [
        "/ncaa/:sport/:team1/:team2/:type",
    ],
    method: "get",
    handler: async (req, res) => {
        const { sport, team1, team2, type } = req.params;

        const ncaaLeagueMap = {
            ncaaf: ['football', 'footballm'],
            ncaah: ['hockey', 'ice-hockey', 'hockeym', 'ice-hockeym'],
            ncaab: ['basketball', 'basketballm', 'march-madness'],
            ncaas: ['soccer', 'soccerm'],

            ncaawh: ['womens-hockey', 'hockeyw', 'ice-hockeyw', 'womens-college-hockey'],
            ncaaw: ['womens-basketball', 'basketballw', 'womens-college-basketball'],
            ncaaws: ['womens-soccer', 'soccerw', 'womens-college-soccer'],
        };

        const leagueEntry = Object.entries(ncaaLeagueMap).find(([key, aliases]) => 
            key === sport || aliases.includes(sport) || aliases.map(a => a.replace(/-/g, '')).includes(sport.replace(/-/g, ''))
        );

        if (!leagueEntry) {
            return res.status(400).json({ error: `Unsupported NCAA sport: ${sport}` });
        }

        const leagueKey = leagueEntry[0];

        // Rewrite request to use the specific NCAA league
        req.params.league = leagueKey;
        req.params.team1 = team1;
        req.params.team2 = team2;

        // Forward to the appropriate handler based on type
        switch (type) {
            case 'cover':
            case 'cover.png':
                return require('./cover').handler(req, res);
            case 'logo':
            case 'logo.png':
                return require('./logo').handler(req, res);
            case 'thumb':
            case 'thumb.png':
                return require('./thumb').handler(req, res);
            default:
                return res.status(400).json({ error: `Unsupported type: ${type}` });
        }
    }
};