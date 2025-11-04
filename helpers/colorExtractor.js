// ------------------------------------------------------------------------------
// colorExtractor.js
// Extracts dominant colors from team logos
// ------------------------------------------------------------------------------

const https = require('https');
const { createCanvas, loadImage } = require('canvas');

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

/**
 * Fetch image from URL
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} Image buffer
 */
function fetchImage(url) {
    return new Promise((resolve, reject) => {
        let request;
        let resolved = false;
        
        const cleanup = () => {
            if (request) {
                request.destroy();
                request.removeAllListeners();
            }
        };
        
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                reject(new Error(`Color extractor request timeout after ${REQUEST_TIMEOUT}ms: ${url}`));
            }
        }, REQUEST_TIMEOUT);
        
        const options = {
            timeout: REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        };
        
        request = https.get(url, options, (response) => {
            const chunks = [];
            
            response.on('data', (chunk) => {
                if (!resolved) {
                    chunks.push(chunk);
                }
            });
            
            response.on('end', () => {
                clearTimeout(timeout);
                cleanup();
                if (!resolved) {
                    resolved = true;
                    resolve(Buffer.concat(chunks));
                }
            });
            
            response.on('error', (err) => {
                clearTimeout(timeout);
                cleanup();
                if (!resolved) {
                    resolved = true;
                    reject(err);
                }
            });
        });
        
        request.on('error', (err) => {
            clearTimeout(timeout);
            cleanup();
            if (!resolved) {
                resolved = true;
                reject(err);
            }
        });
        
        request.on('timeout', () => {
            clearTimeout(timeout);
            cleanup();
            if (!resolved) {
                resolved = true;
                reject(new Error(`Color extractor request timeout after ${REQUEST_TIMEOUT}ms: ${url}`));
            }
        });
    });
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
        while (distinctColors.length < numColors && sortedColors.length > distinctColors.length) {
            const color = sortedColors[distinctColors.length];
            if (!distinctColors.some(c => c[0] === color[0] && c[1] === color[1] && c[2] === color[2])) {
                distinctColors.push(color);
            }
        }
        
        // Convert to hex colors
        const hexColors = distinctColors.map(([r, g, b]) => rgbToHex(r, g, b));
        
        // Ensure we always return the requested number of colors
        while (hexColors.length < numColors) {
            hexColors.push(hexColors.length === 0 ? '#000000' : '#ffffff');
        }
        
        return hexColors.slice(0, numColors);
        
    } catch (error) {
        console.error('Error extracting colors from logo:', error.message);
        // Return default colors on error
        return ['#000000', '#ffffff'];
    }
}

// ------------------------------------------------------------------------------

module.exports = {
    extractDominantColors,
};

// ------------------------------------------------------------------------------
