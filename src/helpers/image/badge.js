// ------------------------------------------------------------------------------
// image/badge.js
// Badge keyword validation, badge-list parsing, and badge-overlay rendering.
// ------------------------------------------------------------------------------

const { createCanvas, loadImage, Image } = require('canvas');
const fsCache = require('../fsCache');
const { SHADOWS, setShadow, resetShadow } = require('../shadows');

const BADGE_SHADOW_MARGIN = 5; // shadowBlur(4) + max(abs(offsetX(1)), abs(offsetY(1)))
const MAX_BADGES = 4;         // per-request cap on overlay badges
// Pill cache key version — bump when pill rendering changes so instances that
// skip the startup badges-cache clear don't serve stale pre-change pills.
const PILL_CACHE_VERSION = '_v2';

// Rank badges (e.g. AP poll standings): 1-2 digits with an optional '#'.
// Valid without ALLOW_CUSTOM_BADGES so rankings work on hosted instances.
// '#' must be URL-encoded (%23) in query strings, so bare digits are accepted
// and normalized to '#N' at parse time.
const RANK_BADGE_REGEX = /^#?\d{1,2}$/;

// Short and long position tokens accepted in 'TEXT@pos' badge values
const POSITION_ALIASES = {
    'tl': 'top-left', 'top-left': 'top-left',
    'tr': 'top-right', 'top-right': 'top-right',
    'bl': 'bottom-left', 'bottom-left': 'bottom-left',
    'br': 'bottom-right', 'bottom-right': 'bottom-right'
};

// Corner fill order when badges carry no explicit position. A single badge
// stays top-right (historic behavior); multiple badges read left-to-right so
// '?badge=6,12' puts team1's rank over the left half and team2's over the right.
const DEFAULT_POSITION_ORDER = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

// Valid badge keywords for overlay text
const VALID_BADGE_KEYWORDS = [
    // Quality indicators
    '4K', 'HD', 'FHD', 'UHD',
    // Alternate Feed indicator
    'ALT', 'MANNINGCAST', 'PRIMEVISION',
    'PEYTONCAST', 'PEYTON AND ELI',
    // Event indicators
    'PLAYOFFS', 'PRESEASON',
    // Language indicators
    'EN', 'ENG', 'ENGLISH',
    'ES', 'ESP', 'SPANISH',
    'FR', 'FRE', 'FRENCH',
    'DE', 'GER', 'GERMAN',
    'IT', 'ITA', 'ITALIAN',
    // Network indicators
    'NBC', 'ESPN', 'FOX', 'CBS',
    'ABC', 'NFLN', 'MLBN', 'NBA TV',
    'CW', 'PEACOCK'
];

// Helper function to validate badge keywords
function isValidBadge(badge) {
    // Reject empty or whitespace-only strings
    if (!badge || badge.trim() === '') {
        return false;
    }

    return  (process.env.ALLOW_CUSTOM_BADGES && process.env.ALLOW_CUSTOM_BADGES.trim().toLowerCase() === 'true') ||
            RANK_BADGE_REGEX.test(badge.trim()) ||
            VALID_BADGE_KEYWORDS.includes(badge.trim().toUpperCase());
}

// Normalize a badge value: uppercase, collapse whitespace, and render bare
// 1-2 digit ranks with a '#' prefix ('6' -> '#6'; '%236' already carries one)
function normalizeBadgeText(text) {
    text = text.trim().replace(/\s+/g, ' ').toUpperCase();
    if (/^\d{1,2}$/.test(text)) {
        return `#${text}`;
    }
    return text;
}

/**
 * Parse the `badge` query parameter into a list of badge descriptors.
 * Accepts a comma-separated string or an array (repeated query params) with
 * up to MAX_BADGES entries. Each entry is 'TEXT' or 'TEXT@position' where
 * position is tl/tr/bl/br (or the long forms). Invalid entries are dropped
 * (matching the historical silently-skip behavior for invalid badges); bare
 * digits are normalized to '#N'.
 * @param {string|string[]} raw - Raw `badge` query value(s)
 * @returns {Array<{text: string, position: string|null}>} Parsed badges
 */
function parseBadges(raw) {
    if (!raw) return [];

    const entries = (Array.isArray(raw) ? raw : [raw])
        .flatMap(value => String(value).split(','))
        .map(entry => entry.trim())
        .filter(entry => entry !== '');

    const badges = [];
    for (const entry of entries) {
        // Only treat a trailing '@...' as a position token when it names a
        // known position; custom badge text containing '@' is left intact
        let text = entry;
        let position = null;
        const atIndex = entry.lastIndexOf('@');
        if (atIndex !== -1) {
            const suffix = entry.slice(atIndex + 1).trim().toLowerCase();
            if (POSITION_ALIASES[suffix]) {
                text = entry.slice(0, atIndex);
                position = POSITION_ALIASES[suffix];
            }
        }

        text = normalizeBadgeText(text);
        if (!isValidBadge(text)) continue;

        badges.push({ text, position });
        if (badges.length >= MAX_BADGES) break;
    }
    return badges;
}

// Render (or fetch from filesystem cache) a single badge pill image at the
// given height. Cached by text + scale + source dimensions so multi-badge
// composites reuse the same per-pill cache the single-badge path used.
async function renderBadgePill(badgeText, badgeHeight, cacheKey) {
    const cachedBadge = fsCache.getBuffer('badges', cacheKey);
    if (cachedBadge) {
        const cachedImg = new Image();
        cachedImg.src = cachedBadge;
        return cachedImg;
    }

    const badgeRadius = Math.round(badgeHeight * 0.3); // 30% of height for rounded corners

    // Set font and measure text
    const fontSize = Math.round(badgeHeight * 0.55); // Font size is 55% of badge height
    const tempCtx = createCanvas(1, 1).getContext('2d');
    tempCtx.font = `bold ${fontSize}px Arial`;
    const textWidth = tempCtx.measureText(badgeText).width;

    // Badge width is text width + padding on each side
    const badgeWidth = Math.round(textWidth + (badgeHeight * 0.8));

    // Shadow properties (reduced and softened); also drive the canvas margin below
    const { blur: shadowBlur, offsetX: shadowOffsetX, offsetY: shadowOffsetY } = SHADOWS.badge;

    // Calculate extra space needed for shadow
    const shadowMargin = shadowBlur + Math.max(Math.abs(shadowOffsetX), Math.abs(shadowOffsetY));

    // Create a canvas for the badge with extra space for shadow
    const canvasWidth = badgeWidth + (shadowMargin * 2);
    const canvasHeight = badgeHeight + (shadowMargin * 2);
    const badgeCanvas = createCanvas(canvasWidth, canvasHeight);
    const badgeCtx = badgeCanvas.getContext('2d');

    // Offset the drawing position to account for shadow margin
    const drawX = shadowMargin;
    const drawY = shadowMargin;

    // Add shadow to the rounded rectangle
    setShadow(badgeCtx, 'badge');

    // Draw rounded rectangle background (white)
    badgeCtx.fillStyle = 'white';
    badgeCtx.beginPath();
    badgeCtx.moveTo(drawX + badgeRadius, drawY);
    badgeCtx.lineTo(drawX + badgeWidth - badgeRadius, drawY);
    badgeCtx.arcTo(drawX + badgeWidth, drawY, drawX + badgeWidth, drawY + badgeRadius, badgeRadius);
    badgeCtx.lineTo(drawX + badgeWidth, drawY + badgeHeight - badgeRadius);
    // BR corner: arcTo needs the corner VERTEX as (x1,y1) and a point on the
    // next edge as (x2,y2). Passing the tangent-start point as (x1,y1) (equal
    // to the current point) leaves the first tangent degenerate and
    // node-canvas renders a diagonal slash across the pill bottom.
    badgeCtx.arcTo(drawX + badgeWidth, drawY + badgeHeight, drawX + badgeWidth - badgeRadius, drawY + badgeHeight, badgeRadius);
    badgeCtx.lineTo(drawX + badgeRadius, drawY + badgeHeight);
    badgeCtx.arcTo(drawX, drawY + badgeHeight, drawX, drawY + badgeHeight - badgeRadius, badgeRadius);
    badgeCtx.lineTo(drawX, drawY + badgeRadius);
    badgeCtx.arcTo(drawX, drawY, drawX + badgeRadius, drawY, badgeRadius);
    badgeCtx.closePath();
    badgeCtx.fill();

    // Reset shadow
    resetShadow(badgeCtx);

    // Draw text (black, bold)
    badgeCtx.fillStyle = 'black';
    badgeCtx.font = `bold ${fontSize}px Arial`;
    badgeCtx.textAlign = 'center';
    badgeCtx.textBaseline = 'middle';
    badgeCtx.fillText(badgeText, drawX + badgeWidth / 2, drawY + badgeHeight / 2);

    // Store in filesystem cache (not in memory)
    const badgeBuffer = badgeCanvas.toBuffer('image/png');
    fsCache.setBuffer('badges', cacheKey, badgeBuffer);

    const badgeImg = new Image();
    badgeImg.src = badgeBuffer;
    return badgeImg;
}

/**
 * Add badge overlays to an image buffer. Renders each badge pill (cached on
 * disk) and composites them in a single pass. Badges without an explicit
 * position are spread across corners in reading order (top-left, top-right,
 * bottom-left, bottom-right) — except a lone badge, which keeps the historic
 * top-right corner. Badges sharing a corner are laid out side by side.
 * @param {Buffer} imageBuffer - The input image buffer
 * @param {Array<{text: string, position: string|null}>} badges - Parsed badge list (see parseBadges)
 * @param {Object} options - Optional styling options
 * @param {number} options.badgeScale - Badge size as percentage of base dimension (default 10%)
 * @returns {Promise<Buffer>} - The image buffer with badge overlays
 */
async function addBadgesOverlay(imageBuffer, badges, options = {}) {
    const {
        padding = 8, // Padding from edges
        badgeScale = 0.10, // Badge size as percentage of base dimension (default 10%)
    } = options;

    if (!badges || badges.length === 0) {
        return imageBuffer;
    }

    // Load the image from buffer
    const image = await loadImage(imageBuffer);

    // Create canvas matching the original image dimensions
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Render every pill first (each cached by text, scale, and image dimensions)
    const badgeHeight = Math.round(Math.min(image.width, image.height) * badgeScale);
    const pills = await Promise.all(badges.map(({ text }) =>
        renderBadgePill(text, badgeHeight, `${text}_${badgeScale}_${image.width}x${image.height}${PILL_CACHE_VERSION}`)
    ));

    // Assign corners: pinned badges keep theirs, unpinned ones fill the
    // remaining corners in reading order. A single unpinned badge stays
    // top-right for backward compatibility.
    const taken = new Set(badges.filter(b => b.position).map(b => b.position));
    const fillOrder = badges.length === 1 && !badges[0].position
        ? ['top-right']
        : DEFAULT_POSITION_ORDER.filter(pos => !taken.has(pos));
    let nextSlot = 0;
    const positions = badges.map(({ position }) => position || fillOrder[nextSlot++ % fillOrder.length]);

    // Group pills by corner, preserving list order within each group
    const groups = new Map();
    positions.forEach((position, i) => {
        if (!groups.has(position)) groups.set(position, []);
        groups.get(position).push(pills[i]);
    });

    // Draw each corner's pills as one horizontally-laid-out row. Account for
    // the shadow margin baked into each pill canvas to align the visible pills.
    const badgeGap = Math.round(padding * 0.5); // extra separation between side-by-side pills
    for (const [position, groupPills] of groups) {
        const rowWidth = groupPills.reduce((sum, pill) => sum + pill.width, 0) + badgeGap * (groupPills.length - 1);

        let rowX, rowY;
        switch (position) {
            case 'top-left':
                rowX = padding - BADGE_SHADOW_MARGIN;
                rowY = padding - BADGE_SHADOW_MARGIN;
                break;
            case 'bottom-left':
                rowX = padding - BADGE_SHADOW_MARGIN;
                rowY = image.height - groupPills[0].height - padding + BADGE_SHADOW_MARGIN;
                break;
            case 'bottom-right':
                rowX = image.width - rowWidth - padding + BADGE_SHADOW_MARGIN;
                rowY = image.height - groupPills[0].height - padding + BADGE_SHADOW_MARGIN;
                break;
            case 'top-right':
            default:
                rowX = image.width - rowWidth - padding + BADGE_SHADOW_MARGIN;
                rowY = padding - BADGE_SHADOW_MARGIN;
                break;
        }

        let pillX = rowX;
        for (const pill of groupPills) {
            ctx.drawImage(pill, pillX, rowY);
            pillX += pill.width + badgeGap;
        }
    }

    // Return the buffer
    return canvas.toBuffer('image/png');
}

module.exports = {
    isValidBadge,
    parseBadges,
    addBadgesOverlay
};
