// ------------------------------------------------------------------------------
// ncaa.js
// Route to forward NCAA requests to the appropriate handler
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateCover } = require('../helpers/thumbnailGenerator');
const { findLeague } = require('../leagues');
const logger = require('../helpers/logger');

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
            ncaam: ['basketball', 'basketballm', 'march-madness'],
            ncaas: ['soccer', 'soccerm'],
            ncaabb: ['baseball', 'baseballm'],
            ncaalax: ['lacrosse', 'lacrossem', 'mens-lacrosse'],
            ncaavb: ['volleyball', 'volleyballm', 'mens-volleyball'],
            ncaawp: ['water-polo', 'waterpolo', 'waterpolom', 'mens-water-polo'],

            ncaawh: ['womens-hockey', 'hockeyw', 'ice-hockeyw', 'womens-college-hockey'],
            ncaaw: ['womens-basketball', 'basketballw', 'womens-college-basketball'],
            ncaaws: ['womens-soccer', 'soccerw', 'womens-college-soccer'],
            ncaasbw: ['softball', 'softballw', 'womens-softball'],
            ncaawlax: ['womens-lacrosse', 'lacrossew', 'womens-college-lacrosse'],
            ncaawvb: ['womens-volleyball', 'volleyballw', 'womens-college-volleyball'],
            ncaawwp: ['womens-water-polo', 'waterpolow', 'womens-college-water-polo'],
            ncaawfh: ['field-hockey', 'fieldhockey', 'womens-field-hockey', 'womens-college-field-hockey'],
        };

        const leagueEntry = Object.entries(ncaaLeagueMap).find(([key, aliases]) => 
            key === sport || aliases.includes(sport) || aliases.map(a => a.replace(/[^a-z0-9]/gi, '').toLowerCase()).includes(sport.replace(/[^a-z0-9]/gi, '').toLowerCase())
        );

        if (!leagueEntry) {
            logger.warn('Unsupported NCAA sport requested', {
                Sport: sport,
                URL: req.url,
                IP: req.ip
            });
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
                logger.warn('Unsupported NCAA endpoint type', {
                    Type: type,
                    Sport: sport,
                    URL: req.url,
                    IP: req.ip
                });
                return res.status(400).json({ error: `Unsupported type: ${type}` });
        }
    }
};