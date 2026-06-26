// ------------------------------------------------------------------------------
// thumb.js
// Unified route to generate thumbnail images
// - League thumbnail: /:league/thumb
// - Team thumbnail: /:league/:team/thumb
// - Matchup thumbnail: /:league/:team1/:team2/thumb
// Thumb size is 1440W x 1080H by default
// ------------------------------------------------------------------------------

const { generateThumbnail } = require('../generators/thumbnailGenerator');
const { generateLeagueThumb, generateTeamThumb } = require('../generators/genericImageGenerator');
const { createImageRoute } = require('../helpers/routeUtils');
const { DIMENSIONS } = require('../config/constants');

module.exports = createImageRoute({
    suffix: 'thumb',
    errorContext: 'Thumbnail generation failed',
    dimensions: ({ aspect }) => {
        if (aspect === '1-1' || aspect === '1x1' || aspect === 'square') {
            return { ...DIMENSIONS.SQUARE };
        }
        if (aspect === '16-9' || aspect === '16x9') {
            return { ...DIMENSIONS.THUMB_WIDE };
        }
        return { ...DIMENSIONS.THUMB }; // default 4:3
    },
    generators: {
        league: generateLeagueThumb,
        team: generateTeamThumb,
        matchup: generateThumbnail
    }
});
