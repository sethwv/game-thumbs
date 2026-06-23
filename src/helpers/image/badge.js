// ------------------------------------------------------------------------------
// image/badge.js
// Badge keyword validation and badge-overlay rendering.
// ------------------------------------------------------------------------------

const { createCanvas, loadImage, Image } = require('canvas');
const fsCache = require('../fsCache');
const { SHADOWS, setShadow, resetShadow } = require('../shadows');

const BADGE_SHADOW_MARGIN = 5; // shadowBlur(4) + max(abs(offsetX(1)), abs(offsetY(1)))

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
            VALID_BADGE_KEYWORDS.includes(badge.toUpperCase());
}

/**
 * Add a badge overlay to an image buffer
 * @param {Buffer} imageBuffer - The input image buffer
 * @param {string} badgeText - The text to display on the badge ('ALT' or '4K')
 * @param {Object} options - Optional positioning and styling options
 * @returns {Promise<Buffer>} - The image buffer with badge overlay
 */
async function addBadgeOverlay(imageBuffer, badgeText, options = {}) {
    const {
        position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
        padding = 8, // Padding from edges
        badgeScale = 0.10, // Badge size as percentage of base dimension (default 10%)
    } = options;

    // Clean badge text: trim whitespace and collapse multiple spaces
    badgeText = badgeText.trim().replace(/\s+/g, ' ');

    // Load the image from buffer
    const image = await loadImage(imageBuffer);

    // Create canvas matching the original image dimensions
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Create cache key based on badge text, scale, and image dimensions
    const cacheKey = `${badgeText}_${badgeScale}_${image.width}x${image.height}`;

    // Check filesystem cache for pre-rendered badge
    const cachedBadge = fsCache.getBuffer('badges', cacheKey);
    let badgeImg;

    if (cachedBadge) {
        badgeImg = new Image();
        badgeImg.src = cachedBadge;
    } else {
        // Calculate badge dimensions based on image size
        const baseSize = Math.min(image.width, image.height);
        const badgeHeight = Math.round(baseSize * badgeScale);
        const badgeRadius = Math.round(badgeHeight * 0.3); // 30% of height for rounded corners

        // Set font and measure text
        const fontSize = Math.round(badgeHeight * 0.55); // Font size is 55% of badge height
        const tempCtx = createCanvas(1, 1).getContext('2d');
        tempCtx.font = `bold ${fontSize}px Arial`;
        const textMetrics = tempCtx.measureText(badgeText);
        const textWidth = textMetrics.width;

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
        badgeImg = new Image();
        badgeImg.src = badgeBuffer;
    }

    // Calculate badge position based on position parameter
    // Account for shadow margin to position the visible badge correctly
    let badgeX, badgeY;
    switch (position) {
        case 'top-left':
            badgeX = padding - BADGE_SHADOW_MARGIN;
            badgeY = padding - BADGE_SHADOW_MARGIN;
            break;
        case 'bottom-left':
            badgeX = padding - BADGE_SHADOW_MARGIN;
            badgeY = image.height - badgeImg.height - padding + BADGE_SHADOW_MARGIN;
            break;
        case 'bottom-right':
            badgeX = image.width - badgeImg.width - padding + BADGE_SHADOW_MARGIN;
            badgeY = image.height - badgeImg.height - padding + BADGE_SHADOW_MARGIN;
            break;
        case 'top-right':
        default:
            badgeX = image.width - badgeImg.width - padding + BADGE_SHADOW_MARGIN;
            badgeY = padding - BADGE_SHADOW_MARGIN;
            break;
    }

    // Draw the badge onto the main canvas
    ctx.drawImage(badgeImg, badgeX, badgeY);

    // Return the buffer
    return canvas.toBuffer('image/png');
}

module.exports = {
    isValidBadge,
    addBadgeOverlay
};
