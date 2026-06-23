// ------------------------------------------------------------------------------
// config/constants.js
// Named layout / dimension constants extracted from the image routes and
// generators. This is a pure rename of literals: every value here is copied
// verbatim from its original call site, with NO value changes. Values that
// intentionally differ between generators are kept separate and labeled, so the
// differences are documented rather than hidden as bare magic numbers.
// ------------------------------------------------------------------------------

// Canvas / output dimensions (pixels)
const DIMENSIONS = {
    THUMB: { width: 1440, height: 1080 },       // thumbnail 4:3 default
    COVER: { width: 1080, height: 1440 },       // cover 3:4 default
    SQUARE: { width: 1080, height: 1080 },      // 1:1 (thumb & cover)
    THUMB_WIDE: { width: 1920, height: 1080 },  // thumbnail 16:9
    COVER_TALL: { width: 1080, height: 1920 },  // cover 9:16
    LOGO_DEFAULT: 1024,                         // matchup/league logo default square size
    LOGO_VALID_SIZES: [256, 512, 1024, 2048],   // accepted ?size= overrides
    LOGO_GENERATOR_FALLBACK: 800,               // generateLogo() w/h when none supplied
};

// Style-1 diagonal split fractions. The logo generator's split is a compact
// 3-badge-wide strip (narrower angle); the thumbnail generator's split spans the
// whole canvas (wider angle). These differ on purpose.
const DIAGONAL_SPLIT = {
    LOGO: { TOP: 0.5825, BOTTOM: 0.4175 },
    THUMBNAIL: { TOP: 0.66, BOTTOM: 0.33 },
};

// thumbnailGenerator logo layout, shared verbatim across the split/gradient/grid
// styles (and reused by the minimalist league logo).
const THUMBNAIL = {
    LOGO_MAX_W_SCALE_LANDSCAPE: 0.325, // logoMaxSize = min(width*0.325, height*0.52)
    LOGO_MAX_H_SCALE_LANDSCAPE: 0.52,
    LOGO_MAX_W_SCALE_PORTRAIT: 0.5,    // logoMaxSize = min(width*0.5, height*0.32)
    LOGO_MAX_H_SCALE_PORTRAIT: 0.32,
    LOGO_ANCHOR_NEAR: 0.2,             // team A anchor fraction along the long axis
    LOGO_ANCHOR_FAR: 0.8,              // team B anchor fraction
    LEAGUE_LOGO_SCALE: 0.25,           // league logo size vs min(width,height)
};

// logoGenerator badge/logo layout multipliers.
const LOGO = {
    BADGE_ROW_WIDTH_SCALE: 0.95,        // availableWidth = width * 0.95 (3-badge row)
    BADGE_LOGO_SCALE: 0.8,              // logo fit inside a badge (badgeSize * 0.8)
    CIRCLE_RADIUS_SCALE: 0.6,           // circle badge radius vs badgeSize
    CIRCLE_BADGE_SCALE: 0.35,           // styles 3/5 badgeSize vs min(width,height)
    SQUARE_BADGE_SCALE: 0.4,            // style 4 badgeSize vs min(width,height)
    LEAGUE_LOGO_SCALE: 0.2,             // styles 3/4 league logo vs min(width,height)
    SIDEBYSIDE_LOGO_SCALE: 0.5,         // style 2 per-logo size vs min(width,height)
    SIDEBYSIDE_LEAGUE_SCALE: 0.15,      // style 2 league logo vs min(width,height)
    DIAGONAL_CENTER_LEAGUE_SCALE: 0.6,  // style 1 center league logo = badgeSize * 0.6
};

module.exports = { DIMENSIONS, DIAGONAL_SPLIT, THUMBNAIL, LOGO };
