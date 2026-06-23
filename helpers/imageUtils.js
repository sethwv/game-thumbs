// ------------------------------------------------------------------------------
// imageUtils.js
// Thin re-export shim over the focused modules in ./image/. Importers keep using
// require('../helpers/imageUtils'); the implementation lives in:
//   ./image/draw.js            - canvas drawing, centering, greyscale, colors
//   ./image/imageIO.js         - download / trim / load
//   ./image/logoResolution.js  - logo selection, team resolution/fallback, winner
//   ./image/badge.js           - badge validation + overlay
// ------------------------------------------------------------------------------

const fsSync = require('fs');
const path = require('path');
const logger = require('./logger');
const fsCache = require('./fsCache');

const draw = require('./image/draw');
const { CACHE_ENABLED, TRIMMED_CACHE_DIR, ...imageIO } = require('./image/imageIO');
const logoResolution = require('./image/logoResolution');
const badge = require('./image/badge');

// ------------------------------------------------------------------------------
// Startup cache reset (runs once at first load). Clears the white/greyscale/badge
// fsCache subdirs and the trimmed-logo dir so a new session never serves stale
// processed logos. TRIMMED_CACHE_DIR is created on load by ./image/imageIO.
// ------------------------------------------------------------------------------
if (CACHE_ENABLED) {
    const cleared = fsCache.clearSubdir('white') + fsCache.clearSubdir('greyscale') + fsCache.clearSubdir('badges');
    if (cleared > 0) {
        logger.info(`Cleared ${cleared} cached processed logo(s) from previous session`);
    }

    // Clear trimmed cache on startup
    const files = fsSync.readdirSync(TRIMMED_CACHE_DIR);
    files.forEach(file => {
        fsSync.unlinkSync(path.join(TRIMMED_CACHE_DIR, file));
    });
    if (files.length > 0) {
        logger.info(`Cleared ${files.length} cached trimmed logo(s) from previous session`);
    }
}

module.exports = {
    // Drawing functions
    drawLogoWithShadow: draw.drawLogoWithShadow,
    drawLogoMaintainAspect: draw.drawLogoMaintainAspect,
    calculateCenteredDimensions: draw.calculateCenteredDimensions,
    drawCenteredLogo: draw.drawCenteredLogo,
    convertToGreyscale: draw.convertToGreyscale,

    // Image utilities
    downloadImage: imageIO.downloadImage,
    downloadImageWithSvgSupport: imageIO.downloadImageWithSvgSupport,
    loadProcessedLogo: imageIO.loadProcessedLogo,
    trimImage: imageIO.trimImage,

    // Logo selection / team resolution / fallback
    selectBestLogo: logoResolution.selectBestLogo,
    selectLogoAndColorForSingleTeam: logoResolution.selectLogoAndColorForSingleTeam,
    loadTrimmedLogo: logoResolution.loadTrimmedLogo,
    generateFallbackTeamObject: logoResolution.generateFallbackTeamObject,
    buildSkipLogosTeam: logoResolution.buildSkipLogosTeam,
    resolveTeamsWithFallback: logoResolution.resolveTeamsWithFallback,
    handleTeamNotFoundError: logoResolution.handleTeamNotFoundError,
    convertTeamToGreyscaleLoser: logoResolution.convertTeamToGreyscaleLoser,
    applyWinnerEffect: logoResolution.applyWinnerEffect,

    // Badge overlay
    addBadgeOverlay: badge.addBadgeOverlay,
    isValidBadge: badge.isValidBadge,

    // Color utilities
    hexToRgb: draw.hexToRgb,
    rgbToHex: draw.rgbToHex,
    colorDistance: draw.colorDistance,
    adjustColors: draw.adjustColors,
    getAverageColor: draw.getAverageColor
};
