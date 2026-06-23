// ------------------------------------------------------------------------------
// image/draw.js
// Canvas drawing primitives, aspect/centering math, greyscale conversion, and
// color helpers shared across the image pipeline.
// ------------------------------------------------------------------------------

const { createCanvas, loadImage, Image } = require('canvas');
const crypto = require('crypto');
const logger = require('../logger');
const fsCache = require('../fsCache');
const { rgbToHex: colorUtilsRgbToHex, calculateColorDistance } = require('../colorUtils');
const { setShadow, resetShadow } = require('../shadows');

const OUTLINE_WIDTH_PERCENTAGE = 0.015; // 1.5% of logo size for outline
const EDGE_BRIGHTNESS_THRESHOLD = 200; // Average edge brightness above this means logo likely has white/light outline

/**
 * Compute aspect-ratio-preserving draw dimensions for a logo fit inside a square
 * container, plus the offsets to center it. Replaces the repeated
 * `if (aspectRatio > 1) { ... } else { ... }` blocks in the generators.
 *
 * @param {number} containerSize - side length of the square container
 * @param {number} aspectRatio - image.width / image.height
 * @returns {{ drawWidth: number, drawHeight: number, offsetX: number, offsetY: number }}
 *   offsets are relative to the container's top-left corner.
 */
function calculateCenteredDimensions(containerSize, aspectRatio) {
    let drawWidth, drawHeight;
    if (aspectRatio > 1) {
        drawWidth = containerSize;
        drawHeight = containerSize / aspectRatio;
    } else {
        drawHeight = containerSize;
        drawWidth = containerSize * aspectRatio;
    }
    const offsetX = (containerSize - drawWidth) / 2;
    const offsetY = (containerSize - drawHeight) / 2;
    return { drawWidth, drawHeight, offsetX, offsetY };
}

function drawLogoWithShadow(ctx, logoImage, x, y, maxSize) {
    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = logoImage.width / logoImage.height;
    let drawWidth, drawHeight;

    if (aspectRatio > 1) {
        // Wider than tall
        drawWidth = maxSize;
        drawHeight = maxSize / aspectRatio;
    } else {
        // Taller than wide or square
        drawHeight = maxSize;
        drawWidth = maxSize * aspectRatio;
    }

    // Center the logo in the available space
    const drawX = x + (maxSize - drawWidth) / 2;
    const drawY = y + (maxSize - drawHeight) / 2;

    // Add drop shadow
    setShadow(ctx, 'logoDrawn');

    ctx.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);

    // Reset shadow
    resetShadow(ctx);
}

function drawLogoMaintainAspect(ctx, logoImage, x, y, maxSize) {
    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = logoImage.width / logoImage.height;
    let drawWidth, drawHeight;

    if (aspectRatio > 1) {
        // Wider than tall
        drawWidth = maxSize;
        drawHeight = maxSize / aspectRatio;
    } else {
        // Taller than wide or square
        drawHeight = maxSize;
        drawWidth = maxSize * aspectRatio;
    }

    // Center the logo in the available space
    const drawX = x + (maxSize - drawWidth) / 2;
    const drawY = y + (maxSize - drawHeight) / 2;

    // Add drop shadow
    setShadow(ctx, 'logoDrawn');

    ctx.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);

    // Reset shadow
    resetShadow(ctx);
}

function drawLogoWithOutline(ctx, logoImage, x, y, size) {
    const outlineWidth = size * OUTLINE_WIDTH_PERCENTAGE;

    // Get cached white logo or create it
    const whiteLogo = getWhiteLogo(logoImage, size);

    // First draw shadow
    setShadow(ctx, 'logoDrawn');
    ctx.drawImage(logoImage, x, y, size, size);

    // Reset shadow
    resetShadow(ctx);

    // Draw white outline with more steps for ultra-smooth angles
    const steps = 32;
    for (let i = 0; i < steps; i++) {
        const angle = (Math.PI * 2 * i) / steps;
        const offsetX = Math.cos(angle) * outlineWidth;
        const offsetY = Math.sin(angle) * outlineWidth;

        ctx.drawImage(whiteLogo, x + offsetX, y + offsetY, size, size);
    }

    // Draw actual logo on top
    ctx.drawImage(logoImage, x, y, size, size);
}

function hasLightOutline(logoImage) {
    try {
        // Create a temporary canvas to analyze the logo edges
        const canvas = createCanvas(logoImage.width, logoImage.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(logoImage, 0, 0);

        const imageData = ctx.getImageData(0, 0, logoImage.width, logoImage.height);
        const data = imageData.data;

        // Sample pixels around the edge (perimeter)
        let edgeBrightness = 0;
        let edgePixelCount = 0;

        // Sample top and bottom edges
        for (let x = 0; x < logoImage.width; x += 2) {
            // Top edge
            const topIdx = x * 4;
            const topAlpha = data[topIdx + 3];
            if (topAlpha > 128) {
                edgeBrightness += (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
                edgePixelCount++;
            }

            // Bottom edge
            const bottomIdx = ((logoImage.height - 1) * logoImage.width + x) * 4;
            const bottomAlpha = data[bottomIdx + 3];
            if (bottomAlpha > 128) {
                edgeBrightness += (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
                edgePixelCount++;
            }
        }

        // Sample left and right edges
        for (let y = 0; y < logoImage.height; y += 2) {
            // Left edge
            const leftIdx = y * logoImage.width * 4;
            const leftAlpha = data[leftIdx + 3];
            if (leftAlpha > 128) {
                edgeBrightness += (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
                edgePixelCount++;
            }

            // Right edge
            const rightIdx = (y * logoImage.width + logoImage.width - 1) * 4;
            const rightAlpha = data[rightIdx + 3];
            if (rightAlpha > 128) {
                edgeBrightness += (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                edgePixelCount++;
            }
        }

        if (edgePixelCount === 0) return false;

        const avgEdgeBrightness = edgeBrightness / edgePixelCount;

        // If average edge brightness is above threshold, logo likely has white/light outline
        return avgEdgeBrightness > EDGE_BRIGHTNESS_THRESHOLD;
    } catch (error) {
        logger.warn('Error checking logo outline', { error: error.message });
        return false; // Assume no outline if we can't determine
    }
}

function getWhiteLogo(logoImage, size) {
    // Generate cache key including size
    let keyBase;
    if (logoImage.src) {
        keyBase = logoImage.src;
    } else {
        const tempCanvas = createCanvas(logoImage.width, logoImage.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(logoImage, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, logoImage.width, logoImage.height);
        const hash = crypto.createHash('md5');
        hash.update(Buffer.from(imageData.data.buffer));
        keyBase = hash.digest('hex');
    }
    const cacheKey = `${keyBase}_${size}`;

    // Check filesystem cache
    const cached = fsCache.getBuffer('white', cacheKey);
    if (cached) {
        const img = new Image();
        img.src = cached;
        return img;
    }

    // Create white version
    const tempCanvas = createCanvas(size, size);
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(logoImage, 0, 0, size, size);

    const imageData = tempCtx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let j = 0; j < data.length; j += 4) {
        if (data[j + 3] > 0) {
            data[j] = 255;     // R = white
            data[j + 1] = 255; // G = white
            data[j + 2] = 255; // B = white
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // Save to filesystem cache
    const buffer = tempCanvas.toBuffer('image/png');
    fsCache.setBuffer('white', cacheKey, buffer);

    // Return as Image (compatible with ctx.drawImage)
    const img = new Image();
    img.src = buffer;
    return img;
}

/**
 * Convert a logo to greyscale with reduced opacity
 * @param {Image|Buffer} logoImageOrBuffer - Logo image or buffer to convert
 * @param {number} opacity - Opacity level (0-1), default 0.35 for 35%
 * @returns {Promise<Canvas>} Canvas with greyscale, semi-transparent logo
 */
async function convertToGreyscale(logoImageOrBuffer, opacity = 0.35) {
    // Generate cache key
    let cacheKey;
    if (logoImageOrBuffer.src) {
        cacheKey = `${logoImageOrBuffer.src}_${opacity}`;
    } else if (Buffer.isBuffer(logoImageOrBuffer)) {
        const hash = crypto.createHash('md5').update(logoImageOrBuffer).digest('hex');
        cacheKey = `${hash}_${opacity}`;
    } else {
        // For canvas or other image objects, generate hash from pixel data
        const tempCanvas = createCanvas(logoImageOrBuffer.width, logoImageOrBuffer.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(logoImageOrBuffer, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, logoImageOrBuffer.width, logoImageOrBuffer.height);
        const hash = crypto.createHash('md5').update(Buffer.from(imageData.data.buffer)).digest('hex');
        cacheKey = `${hash}_${opacity}`;
    }

    // Check filesystem cache
    const cached = fsCache.getBuffer('greyscale', cacheKey);
    if (cached) {
        const img = await loadImage(cached);
        const cachedCanvas = createCanvas(img.width, img.height);
        const cachedCtx = cachedCanvas.getContext('2d');
        cachedCtx.drawImage(img, 0, 0);
        return cachedCanvas;
    }

    // Load the image if it's a buffer
    let logoImage = logoImageOrBuffer;
    if (Buffer.isBuffer(logoImageOrBuffer)) {
        logoImage = await loadImage(logoImageOrBuffer);
    }

    // Create canvas with greyscale version
    const canvas = createCanvas(logoImage.width, logoImage.height);
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(logoImage, 0, 0);

    // Get image data and convert to greyscale
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Calculate greyscale value using luminance formula
        const grey = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

        data[i] = grey;     // R
        data[i + 1] = grey; // G
        data[i + 2] = grey; // B

        // Apply opacity to alpha channel
        data[i + 3] = data[i + 3] * opacity;
    }

    ctx.putImageData(imageData, 0, 0);

    // Save to filesystem cache
    fsCache.setBuffer('greyscale', cacheKey, canvas.toBuffer('image/png'));

    return canvas;
}

// ------------------------------------------------------------------------------
// Color utilities
// ------------------------------------------------------------------------------

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(rgb) {
    return colorUtilsRgbToHex(rgb.r, rgb.g, rgb.b);
}

function colorDistance(color1, color2) {
    return calculateColorDistance(color1, color2);
}

function adjustColors(teamA, teamB) {
    const threshold = 100; // Colors closer than this are considered too similar

    let colorA = teamA.color || '#000000';
    let colorB = teamB.color || '#000000';

    const distance = colorDistance(colorA, colorB);

    // If colors are too similar, try using alternate colors
    if (distance < threshold) {
        // Try teamB's alternate color first
        if (teamB.alternateColor) {
            const distanceWithAltB = colorDistance(colorA, teamB.alternateColor);
            if (distanceWithAltB > distance) {
                colorB = teamB.alternateColor;
                return { colorA, colorB };
            }
        }

        // If that didn't work, try teamA's alternate color
        if (teamA.alternateColor) {
            const distanceWithAltA = colorDistance(teamA.alternateColor, colorB);
            if (distanceWithAltA > distance) {
                colorA = teamA.alternateColor;
                return { colorA, colorB };
            }
        }

        // If both teams have alternate colors, try both alternates
        if (teamA.alternateColor && teamB.alternateColor) {
            const distanceBothAlts = colorDistance(teamA.alternateColor, teamB.alternateColor);
            if (distanceBothAlts > distance) {
                colorA = teamA.alternateColor;
                colorB = teamB.alternateColor;
            }
        }
    }

    return { colorA, colorB };
}

function getAverageColor(image) {
    // Create a temporary canvas to analyze the logo
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;

    let r = 0, g = 0, b = 0, count = 0;

    // Sample pixels and calculate average (skip transparent pixels)
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];

        // Only count non-transparent pixels
        if (alpha > 128) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }
    }

    if (count === 0) return { r: 0, g: 0, b: 0 };

    return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count)
    };
}

module.exports = {
    calculateCenteredDimensions,
    drawLogoWithShadow,
    drawLogoMaintainAspect,
    drawLogoWithOutline,
    hasLightOutline,
    convertToGreyscale,
    hexToRgb,
    rgbToHex,
    colorDistance,
    adjustColors,
    getAverageColor
};
