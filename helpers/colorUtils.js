/**
 * Color utility functions for image generation
 */

const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

/**
 * Fetch image from URL
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} Image buffer
 */
async function fetchImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        return Buffer.from(response.data);
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error(`Color extractor request timeout after ${REQUEST_TIMEOUT}ms: ${url}`);
        }
        throw error;
    }
}

/**
 * Convert RGB to hex color
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color string
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Calculate color brightness (perceived luminance)
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {number} Brightness value (0-255)
 */
function getColorBrightness(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Check if color is too similar to white or black (low saturation)
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {boolean} True if color is grayscale/neutral
 */
function isNeutralColor(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    return saturation < 0.15; // Low saturation threshold
}

/**
 * Extract dominant colors from an image URL
 * @param {string} imageUrl - URL of the image to analyze
 * @param {number} numColors - Number of dominant colors to extract
 * @returns {Promise<string[]>} Array of hex color strings
 */
async function extractDominantColors(imageUrl, numColors = 2) {
    try {
        // Fetch and load the image
        const imageBuffer = await fetchImage(imageUrl);
        const image = await loadImage(imageBuffer);
        
        // Create a canvas and draw the image
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Sample pixels and count colors (using color quantization)
        const colorMap = new Map();
        const sampleRate = 5; // Sample every 5th pixel for performance
        
        for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            // Skip transparent pixels
            if (a < 128) continue;
            
            // Skip very light colors (likely background)
            if (r > 240 && g > 240 && b > 240) continue;
            
            // Quantize colors to reduce variations (group similar colors)
            const qr = Math.round(r / 10) * 10;
            const qg = Math.round(g / 10) * 10;
            const qb = Math.round(b / 10) * 10;
            
            const colorKey = `${qr},${qg},${qb}`;
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }
        
        // Sort colors by frequency
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([color]) => color.split(',').map(Number));
        
        // Filter out neutral colors and get distinct colors
        const distinctColors = [];
        for (const [r, g, b] of sortedColors) {
            // Skip neutral/grayscale colors
            if (isNeutralColor(r, g, b)) continue;
            
            // Check if this color is distinct from already selected colors
            const isDistinct = distinctColors.every(([er, eg, eb]) => {
                const distance = Math.sqrt(
                    Math.pow(r - er, 2) + 
                    Math.pow(g - eg, 2) + 
                    Math.pow(b - eb, 2)
                );
                return distance > 50; // Minimum distance threshold
            });
            
            if (isDistinct) {
                distinctColors.push([r, g, b]);
                if (distinctColors.length >= numColors) break;
            }
        }
        
        // If we didn't find enough distinct colors, fall back to the most frequent
        let fallbackIndex = distinctColors.length;
        while (distinctColors.length < numColors && fallbackIndex < sortedColors.length) {
            const color = sortedColors[fallbackIndex];
            if (!distinctColors.some(c => c[0] === color[0] && c[1] === color[1] && c[2] === color[2])) {
                distinctColors.push(color);
            }
            fallbackIndex++; // Always increment to prevent infinite loop
        }
        
        // Convert to hex colors
        const hexColors = distinctColors.map(([r, g, b]) => rgbToHex(r, g, b));
        
        // Ensure we always return the requested number of colors
        while (hexColors.length < numColors) {
            hexColors.push(hexColors.length === 0 ? '#000000' : '#ffffff');
        }
        
        return hexColors.slice(0, numColors);
        
    } catch (error) {
        // Return default colors on error
        return ['#000000', '#ffffff'];
    }
}

/**
 * Blend two colors with equal weight (50/50 mix)
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {string} Blended hex color
 */
function blendColors(color1, color2) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Blend two colors with a weighted mix
 * @param {string} color1 - First hex color (base)
 * @param {string} color2 - Second hex color (tint)
 * @param {number} weight1 - Weight for first color (0-1, e.g., 0.85 = 85% base, 15% tint)
 * @returns {string} Blended hex color
 */
function blendColorsWeighted(color1, color2, weight1) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const weight2 = 1 - weight1;
    const r = Math.round(r1 * weight1 + r2 * weight2);
    const g = Math.round(g1 * weight1 + g2 * weight2);
    const b = Math.round(b1 * weight1 + b2 * weight2);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Calculate the distance between two colors
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Distance between colors (0-441)
 */
function calculateColorDistance(color1, color2) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    return Math.sqrt(
        Math.pow(r2 - r1, 2) +
        Math.pow(g2 - g1, 2) +
        Math.pow(b2 - b1, 2)
    );
}

/**
 * Analyze a color to determine if it's neutral and get its brightness
 * @param {string} hexColor - Hex color string
 * @returns {object} Object with isNeutral and brightness properties
 */
function analyzeColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate saturation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Calculate brightness (perceived luminance)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
    
    // Color is neutral if saturation is very low (grayscale)
    const isNeutral = saturation < 0.2;
    
    return { isNeutral, brightness, saturation };
}

/**
 * Adjust the vibrancy (saturation) of a color
 * @param {string} hexColor - Hex color string
 * @param {number} factor - Factor to adjust saturation by (0-1 reduces, >1 increases)
 * @returns {string} Adjusted hex color
 */
function adjustVibrancy(hexColor, factor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Convert to HSL to adjust saturation
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    
    let s = 0;
    if (max !== min) {
        s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    }
    
    // Adjust saturation
    s = Math.min(1, s * factor);
    
    // Convert back to RGB
    let newR, newG, newB;
    if (s === 0) {
        newR = newG = newB = l * 255;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        // Calculate hue
        const h = (() => {
            if (max === min) return 0;
            const d = max - min;
            if (max === r / 255) return ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6;
            if (max === g / 255) return ((b - r) / 255 / d + 2) / 6;
            return ((r - g) / 255 / d + 4) / 6;
        })();
        
        newR = hue2rgb(p, q, h + 1/3) * 255;
        newG = hue2rgb(p, q, h) * 255;
        newB = hue2rgb(p, q, h - 1/3) * 255;
    }
    
    return '#' + [newR, newG, newB].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

module.exports = {
    extractDominantColors,
    rgbToHex,
    getColorBrightness,
    isNeutralColor,
    blendColors,
    blendColorsWeighted,
    calculateColorDistance,
    analyzeColor,
    adjustVibrancy
};
