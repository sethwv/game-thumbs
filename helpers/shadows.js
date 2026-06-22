// ------------------------------------------------------------------------------
// shadows.js
// Named canvas drop-shadow profiles + helpers, extracted from the repeated inline
// ctx.shadow* blocks in generators/* and imageUtils.js.
//
// Each profile is a DISTINCT (color, blur, offsetX, offsetY) tuple taken verbatim
// from the original call sites. Values are intentionally NOT normalized: profiles
// that differ only slightly (e.g. blur 15 vs 20, alpha 0.3 vs 0.4) are kept
// separate because image output must stay pixel-identical.
//
// Some call sites only ever set color/blur/offsetY (never offsetX). Those profiles
// omit `offsetX`, and setShadow() only assigns the properties a profile defines, so
// the canvas's existing offsetX is left untouched, exactly as the original code did.
// ------------------------------------------------------------------------------

const SHADOWS = {
    // logoGenerator.js: primary logo/circle/panel drop shadow (most common)
    logoDropStrong: { color: 'rgba(0, 0, 0, 0.4)', blur: 15, offsetX: 3, offsetY: 3 },
    // logoGenerator.js: softer secondary-logo shadow
    logoDropSoft: { color: 'rgba(0, 0, 0, 0.4)', blur: 10, offsetX: 2, offsetY: 2 },
    // logoGenerator.js: panel/background shadow at lower alpha
    panel: { color: 'rgba(0, 0, 0, 0.3)', blur: 15, offsetX: 3, offsetY: 3 },

    // imageUtils.js: drawLogoWithShadow / drawLogoMaintainAspect / drawLogoWithOutline
    logoDrawn: { color: 'rgba(0, 0, 0, 0.5)', blur: 20, offsetX: 5, offsetY: 5 },

    // genericImageGenerator.js: centered league logo lift
    leagueLift: { color: 'rgba(0, 0, 0, 0.3)', blur: 30, offsetX: 0, offsetY: 10 },
    // genericImageGenerator.js: same lift, darker error-fallback path
    leagueLiftFallback: { color: 'rgba(0, 0, 0, 0.5)', blur: 30, offsetX: 0, offsetY: 10 },

    // thumbnailGenerator.js: minimalist circle badge (sets color/blur/offsetY only)
    minimalBadge: { color: 'rgba(0, 0, 0, 0.15)', blur: 20, offsetY: 10 },
    // thumbnailGenerator.js: hero panel main logo (sets color/blur/offsetY only)
    heroLogo: { color: 'rgba(0, 0, 0, 0.6)', blur: 25, offsetY: 15 },
    // thumbnailGenerator.js: center "VS" text (sets color/blur/offsetY only)
    vsText: { color: 'rgba(0,0,0,0.8)', blur: 4, offsetY: 2 },

    // imageUtils.js: custom badge drop shadow; numeric fields also drive shadowMargin
    badge: { color: 'rgba(0, 0, 0, 0.3)', blur: 4, offsetX: 1, offsetY: 1 },
};

// Apply a named profile (or a profile object). Only assigns the properties the
// profile defines, leaving any others on the context unchanged.
function setShadow(ctx, profile) {
    const s = typeof profile === 'string' ? SHADOWS[profile] : profile;
    if (!s) throw new Error(`Unknown shadow profile: ${profile}`);
    if ('color' in s) ctx.shadowColor = s.color;
    if ('blur' in s) ctx.shadowBlur = s.blur;
    if ('offsetX' in s) ctx.shadowOffsetX = s.offsetX;
    if ('offsetY' in s) ctx.shadowOffsetY = s.offsetY;
}

// Clear all four shadow properties back to "no shadow".
function resetShadow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

module.exports = { SHADOWS, setShadow, resetShadow };
