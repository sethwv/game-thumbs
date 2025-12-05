// ------------------------------------------------------------------------------
// imageUtils.js
// Shared utilities for image manipulation and logo processing
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('./logger');
const { rgbToHex: colorUtilsRgbToHex, calculateColorDistance } = require('./colorUtils');

// ------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------

const OUTLINE_WIDTH_PERCENTAGE = 0.015; // 1.5% of logo size for outline
const MAX_CACHE_SIZE = 50; // Maximum number of cached white logos
const EDGE_BRIGHTNESS_THRESHOLD = 200; // Average edge brightness above this means logo likely has white/light outline
const COLOR_SIMILARITY_THRESHOLD = 120; // Colors closer than this need special handling

// ------------------------------------------------------------------------------
// Cache
// ------------------------------------------------------------------------------

// Get cache settings from environment
const CACHE_HOURS = parseInt(process.env.IMAGE_CACHE_HOURS || '24', 10);
const CACHE_ENABLED = CACHE_HOURS > 0;

// Cache for white logo versions to avoid recreating them
const whiteLogoCache = new Map();

// Cache directory for trimmed logos
const TRIMMED_CACHE_DIR = path.join(__dirname, '..', '.cache', 'trimmed');
if (!fsSync.existsSync(TRIMMED_CACHE_DIR)) {
    fsSync.mkdirSync(TRIMMED_CACHE_DIR, { recursive: true });
} else if (CACHE_ENABLED) {
    // Clear trimmed cache on startup
    const files = fsSync.readdirSync(TRIMMED_CACHE_DIR);
    files.forEach(file => {
        fsSync.unlinkSync(path.join(TRIMMED_CACHE_DIR, file));
    });
    if (files.length > 0) {
        logger.info(`Cleared ${files.length} cached trimmed logo(s) from previous session`);
    }
}

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

module.exports = {
    // Drawing functions
    drawLogoWithShadow,
    drawLogoWithOutline,
    drawLogoMaintainAspect,
    hasLightOutline,

    // Image utilities
    downloadImage,
    selectBestLogo,
    trimImage,
    loadTrimmedLogo,

    // Color utilities
    hexToRgb,
    rgbToHex,
    colorDistance,
    adjustColors,
    getAverageColor
};

// ------------------------------------------------------------------------------
// Functions
// ------------------------------------------------------------------------------

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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawLogoWithOutline(ctx, logoImage, x, y, size) {
    const outlineWidth = size * OUTLINE_WIDTH_PERCENTAGE;

    // Get cached white logo or create it
    const whiteLogo = getWhiteLogo(logoImage, size);

    // First draw shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(logoImage, x, y, size, size);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

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
    // Use image source as cache key if available, otherwise generate checksum from image data
    let cacheKey = logoImage.src;

    if (!cacheKey) {
        // Create a temporary canvas to extract image data for checksum
        const tempCanvas = createCanvas(logoImage.width, logoImage.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(logoImage, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, logoImage.width, logoImage.height);

        // Generate checksum from image data
        const hash = crypto.createHash('md5');
        hash.update(Buffer.from(imageData.data.buffer));
        cacheKey = `${hash.digest('hex')}_${size}`;
    }

    if (whiteLogoCache.has(cacheKey)) {
        return whiteLogoCache.get(cacheKey);
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

    // Cache it (limit cache size to prevent memory leaks)
    if (whiteLogoCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest 20% of entries when limit reached
        const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
        const keys = Array.from(whiteLogoCache.keys());
        for (let i = 0; i < entriesToRemove; i++) {
            whiteLogoCache.delete(keys[i]);
        }
    }
    whiteLogoCache.set(cacheKey, tempCanvas);

    return tempCanvas;
}

// ------------------------------------------------------------------------------
// Image utilities
// ------------------------------------------------------------------------------

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10); // 10 seconds default

async function downloadImage(urlOrPath) {
    // If it's a local file path, load from filesystem
    if (typeof urlOrPath === 'string' && (urlOrPath.startsWith('/') || urlOrPath.startsWith('./') || urlOrPath.startsWith('../'))) {
        return fs.readFile(path.resolve(urlOrPath));
    }
    
    // Otherwise, treat as URL with timeout protection
    try {
        const response = await axios.get(urlOrPath, {
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        return Buffer.from(response.data);
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms: ${urlOrPath}`);
        }
        throw error;
    }
}

async function selectBestLogo(team, backgroundColor) {
    try {
        // If no logoAlt, use the primary logo
        if (!team.logoAlt) {
            return team.logo;
        }

        // Load both logos and check contrast
        const [primaryBuffer, altBuffer] = await Promise.all([
            downloadImage(team.logo),
            downloadImage(team.logoAlt)
        ]);

        const [primaryImage, altImage] = await Promise.all([
            loadImage(primaryBuffer),
            loadImage(altBuffer)
        ]);

        // Calculate color distances for both logos
        const primaryAvgColor = getAverageColor(primaryImage);
        const primaryHex = rgbToHex(primaryAvgColor);
        const primaryDistance = colorDistance(primaryHex, backgroundColor);

        const altAvgColor = getAverageColor(altImage);
        const altHex = rgbToHex(altAvgColor);
        const altDistance = colorDistance(altHex, backgroundColor);

        // If primary logo is a bad fit, use logoAlt instead
        if (primaryDistance < COLOR_SIMILARITY_THRESHOLD && altDistance > primaryDistance) {
            return team.logoAlt;
        }

        // Otherwise use primary logo
        return team.logo;
    } catch (error) {
        logger.warn('Error selecting best logo', { error: error.message });
        // Fallback to primary logo on error
        return team.logo;
    }
}

/**
 * Load a team logo with automatic selection, downloading, and trimming
 * This is the recommended way to load logos as it handles all processing in one step
 * @param {Object} team - Team object with logo and logoAlt properties
 * @param {string} backgroundColor - Background color for contrast checking
 * @returns {Promise<Image>} Loaded and trimmed logo image ready to use
 */
async function loadTrimmedLogo(team, backgroundColor) {
    try {
        // Select best logo based on contrast
        const logoUrl = await selectBestLogo(team, backgroundColor);
        
        // Download and trim the logo (with URL as cache key)
        let logoBuffer = await downloadImage(logoUrl);
        logoBuffer = await trimImage(logoBuffer, logoUrl);
        
        // Load and return the image
        return await loadImage(logoBuffer);
    } catch (error) {
        logger.warn('Error loading trimmed logo', { 
            team: team.name, 
            error: error.message 
        });
        throw error;
    }
}

function trimImage(imageBuffer, enableCache = true) {
    return new Promise(async (resolve, reject) => {
        try {
            // Only cache if caching is enabled and explicitly requested
            // Pass false/null to skip caching for final composed outputs
            const shouldCache = CACHE_ENABLED && enableCache;
            
            // Check cache if we should cache
            // Use hash of original image buffer as cache key to detect if source changed
            if (shouldCache) {
                const sourceHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
                const cachedPath = path.join(TRIMMED_CACHE_DIR, `${sourceHash}.png`);
                
                try {
                    const cachedBuffer = await fs.readFile(cachedPath);
                    resolve(cachedBuffer);
                    return;
                } catch (err) {
                    // Cache miss, continue with trimming
                }
            }
            
            // Load the image from buffer
            const image = await loadImage(imageBuffer);
            
            // Create temporary canvas to analyze the image
            const tempCanvas = createCanvas(image.width, image.height);
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(image, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
            const data = imageData.data;
            
            // Find the bounds of non-transparent pixels
            let minX = image.width, maxX = 0;
            let minY = image.height, maxY = 0;
            
            for (let y = 0; y < image.height; y++) {
                for (let x = 0; x < image.width; x++) {
                    const alpha = data[(y * image.width + x) * 4 + 3];
                    if (alpha > 0) { // Non-transparent pixel
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            
            // If all pixels are transparent, return the original image
            if (minX >= image.width || minY >= image.height) {
                resolve(imageBuffer);
                return;
            }
            
            // Calculate trimmed dimensions
            const trimmedWidth = maxX - minX + 1;
            const trimmedHeight = maxY - minY + 1;
            
            // Create new canvas with trimmed dimensions
            const trimmedCanvas = createCanvas(trimmedWidth, trimmedHeight);
            const trimmedCtx = trimmedCanvas.getContext('2d');
            
            // Draw the trimmed portion
            trimmedCtx.drawImage(image, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
            
            // Get trimmed image buffer
            const trimmedBuffer = trimmedCanvas.toBuffer('image/png');
            
            // Save to cache if we should cache
            // Use hash of original image buffer so we can detect if source changed
            if (shouldCache) {
                const sourceHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
                const cachedPath = path.join(TRIMMED_CACHE_DIR, `${sourceHash}.png`);
                
                // Save asynchronously, don't wait
                fs.writeFile(cachedPath, trimmedBuffer).catch(err => {
                    logger.warn('Failed to cache trimmed logo', { error: err.message });
                });
            }
            
            resolve(trimmedBuffer);
        } catch (error) {
            reject(error);
        }
    });
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
