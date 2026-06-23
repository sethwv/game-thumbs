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

module.exports = createImageRoute({
    suffix: 'thumb',
    errorContext: 'Thumbnail generation failed',
    dimensions: ({ aspect }) => {
        if (aspect === '1-1' || aspect === '1x1' || aspect === 'square') {
            return { width: 1080, height: 1080 };
        }
        if (aspect === '16-9' || aspect === '16x9') {
            return { width: 1920, height: 1080 };
        }
        return { width: 1440, height: 1080 }; // default 4:3
    },
    generators: {
        league: generateLeagueThumb,
        team: generateTeamThumb,
        matchup: generateThumbnail
    }
});
