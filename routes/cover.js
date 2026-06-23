// ------------------------------------------------------------------------------
// cover.js
// Unified route to generate cover images
// - League cover: /:league/cover
// - Team cover: /:league/:team/cover
// - Matchup cover: /:league/:team1/:team2/cover
// Cover size is 1080W x 1440H by default
// ------------------------------------------------------------------------------

const { generateCover } = require('../generators/thumbnailGenerator');
const { generateLeagueCover, generateTeamCover } = require('../generators/genericImageGenerator');
const { createImageRoute } = require('../helpers/routeUtils');

module.exports = createImageRoute({
    suffix: 'cover',
    errorContext: 'Cover generation failed',
    dimensions: ({ aspect }) => {
        if (aspect === '1-1' || aspect === '1x1' || aspect === 'square') {
            return { width: 1080, height: 1080 };
        }
        if (aspect === '9-16' || aspect === '9x16') {
            return { width: 1080, height: 1920 };
        }
        return { width: 1080, height: 1440 }; // default 3:4
    },
    generators: {
        league: generateLeagueCover,
        team: generateTeamCover,
        matchup: generateCover
    }
});
