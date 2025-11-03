// ------------------------------------------------------------------------------
// imageUtils.js
// Shared utilities for image manipulation and logo processing
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const https = require('https');
const crypto = require('crypto');

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

// Cache for white logo versions to avoid recreating them
const whiteLogoCache = new Map();

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

function drawLogoWithShadow(ctx, logoImage, x, y, size) {
    // Add drop shadow
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
        console.error('Error checking logo outline:', error.message);
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

const fs = require('fs');
const path = require('path');

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10); // 10 seconds default

function downloadImage(urlOrPath) {
    // If it's a local file path, load from filesystem
    if (typeof urlOrPath === 'string' && (urlOrPath.startsWith('/') || urlOrPath.startsWith('./') || urlOrPath.startsWith('../'))) {
        return new Promise((resolve, reject) => {
            fs.readFile(path.resolve(urlOrPath), (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }
    // Otherwise, treat as URL with timeout protection
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            request.destroy();
            reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms: ${urlOrPath}`));
        }, REQUEST_TIMEOUT);
        
        const request = https.get(urlOrPath, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                clearTimeout(timeout);
                const redirectUrl = response.headers.location;
                return downloadImage(redirectUrl).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                clearTimeout(timeout);
                return reject(new Error(`HTTP ${response.statusCode}: ${urlOrPath}`));
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                clearTimeout(timeout);
                resolve(Buffer.concat(chunks));
            });
            response.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
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
        console.error('Error selecting best logo:', error.message);
        // Fallback to primary logo on error
        return team.logo;
    }
}

function trimImage(imageBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
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
            
            // Return trimmed image buffer
            resolve(trimmedCanvas.toBuffer('image/png'));
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
    const toHex = (n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function colorDistance(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
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
