// ------------------------------------------------------------------------------
// svgUtils.js
// Shared SVG-to-PNG rasterization and palette extraction utilities
// Used by NCAAProvider, MLBStatsProvider, and other providers needing SVG handling
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
let sharp = null;
try {
    sharp = require('sharp');
} catch (e) {
    sharp = null; // optional; falls back to canvas
}

const PNG_WIDTH = 2048;
const PNG_HEIGHT = 2048;
const LOGO_DENSITY = 400;
const DEFAULT_COLOR_SAMPLE_RATE = 20;

/**
 * Rasterize SVG buffer to PNG using sharp (high quality, fast)
 * Also creates a canvas for pixel-level access (color extraction)
 * @param {Buffer} svgBuffer - SVG data
 * @param {number} width - Output width
 * @param {number} height - Output height
 * @returns {Promise<{pngBuffer: Buffer, canvas: any}>}
 */
async function rasterizeWithSharp(svgBuffer, width, height) {
    const sharpPng = await sharp(svgBuffer, { density: LOGO_DENSITY })
        .resize(width, height, { fit: 'inside', withoutEnlargement: false })
        .png({ compressionLevel: 0, effort: 1 })
        .toBuffer();
    const image = await loadImage(sharpPng);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return { pngBuffer: sharpPng, canvas };
}

/**
 * Rasterize SVG buffer to PNG using canvas only (fallback when sharp unavailable)
 * @param {Buffer} svgBuffer - SVG data
 * @param {number} width - Output width
 * @param {number} height - Output height
 * @returns {Promise<{pngBuffer: Buffer, canvas: any}>}
 */
async function rasterizeWithCanvas(svgBuffer, width, height) {
    const svgDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
    const image = await loadImage(svgDataUrl);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.antialias = 'subpixel';
    ctx.patternQuality = 'best';

    const intrinsicWidth = image.width || width;
    const intrinsicHeight = image.height || height;
    const scale = Math.min(width / intrinsicWidth, height / intrinsicHeight);
    const scaledWidth = intrinsicWidth * scale;
    const scaledHeight = intrinsicHeight * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    const pngBuffer = canvas.toBuffer('image/png', {
        compressionLevel: 0,
        filters: 0
    });
    return { pngBuffer, canvas };
}

/**
 * Rasterize SVG buffer to PNG, preferring sharp if available
 * @param {Buffer} svgBuffer - SVG data
 * @param {number} width - Output width (default: 2048)
 * @param {number} height - Output height (default: 2048)
 * @returns {Promise<{pngBuffer: Buffer, canvas: any}>} PNG buffer and canvas for color extraction
 */
async function rasterizeLogo(svgBuffer, width = PNG_WIDTH, height = PNG_HEIGHT) {
    if (sharp) {
        return rasterizeWithSharp(svgBuffer, width, height);
    }
    return rasterizeWithCanvas(svgBuffer, width, height);
}

/**
 * Extract the two most dominant non-white, non-transparent colors from a canvas
 * @param {any} canvas - node-canvas Canvas object with drawn image
 * @param {number} sampleRate - Sample every Nth pixel (default: 20 = 5% of pixels)
 * @returns {{color: string|null, alternateColor: string|null}} Hex color strings
 */
function extractPalette(canvas, sampleRate = DEFAULT_COLOR_SAMPLE_RATE) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const colorMap = new Map();

    for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a < 128 || (r > 240 && g > 240 && b > 240)) continue;

        const qr = Math.round(r / 10) * 10;
        const qg = Math.round(g / 10) * 10;
        const qb = Math.round(b / 10) * 10;

        const colorKey = `${qr},${qg},${qb}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    if (colorMap.size === 0) return { color: null, alternateColor: null };

    const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number);
            const hex = '#' + [r, g, b].map(x => {
                const h = x.toString(16);
                return h.length === 1 ? '0' + h : h;
            }).join('');
            return hex;
        });

    return {
        color: sortedColors[0] || null,
        alternateColor: sortedColors[1] || sortedColors[0] || null
    };
}

module.exports = { rasterizeLogo, extractPalette, PNG_WIDTH, PNG_HEIGHT };
