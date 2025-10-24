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
    hasLightOutline,
    
    // Image utilities
    downloadImage,
    selectBestLogo,
    
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
    
    // Cache it (limit cache size to prevent memory issues)
    while (whiteLogoCache.size >= MAX_CACHE_SIZE) {
        const firstKey = whiteLogoCache.keys().next().value;
        whiteLogoCache.delete(firstKey);
    }
    whiteLogoCache.set(cacheKey, tempCanvas);
    
    return tempCanvas;
}

// ------------------------------------------------------------------------------
// Image utilities
// ------------------------------------------------------------------------------

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
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
