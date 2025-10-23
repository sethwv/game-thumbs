// ------------------------------------------------------------------------------
// thumbnailGenerator.js
// This helper generates game thumbnail images with team logos and colors
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const https = require('https');
const crypto = require('crypto');

module.exports = {
    generateThumbnail
};

// ------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------

const COLOR_SIMILARITY_THRESHOLD = 120; // Colors closer than this need an outline
const OUTLINE_WIDTH_PERCENTAGE = 0.015; // 1.5% of logo size for outline
const DIAGONAL_LINE_EXTENSION = 100; // Pixels to extend diagonal line beyond canvas
const MAX_CACHE_SIZE = 50; // Maximum number of cached white logos

// ------------------------------------------------------------------------------

async function generateThumbnail(teamA, teamB, options = {}) {
    const width = options.width || 1920;
    const height = options.height || 1080;
    const style = options.style || 1;
    const league = options.league; // For league logo
    
    switch (style) {
        case 1:
            return generateDiagonalSplit(teamA, teamB, width, height, league);
        default:
            throw new Error(`Unknown thumbnail style: ${style}. Valid style is 1 (diagonal split)`);
    }
}

// ------------------------------------------------------------------------------
// Style 1: Diagonal Split
// ------------------------------------------------------------------------------

async function generateDiagonalSplit(teamA, teamB, width, height, league) {
    // Check if colors are too similar and adjust if needed
    const { colorA, colorB } = adjustColors(teamA, teamB);
    // const colorA = teamA.color || '#000000';
    // const colorB = teamB.color || '#000000';
    
    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Calculate diagonal split points for exactly 50/50 area
    // Diagonal goes from 66% width at top to 33% width at bottom (pointing right)
    const topDiagonalX = width * 0.66;
    const bottomDiagonalX = width * 0.33;
    
    // Draw diagonal split background
    // Left side (teamA)
    ctx.fillStyle = colorA;
    ctx.beginPath();
    ctx.moveTo(0, 0);                    // Top-left corner
    ctx.lineTo(topDiagonalX, 0);         // Top diagonal point (66% width)
    ctx.lineTo(bottomDiagonalX, height); // Bottom diagonal point (33% width)
    ctx.lineTo(0, height);               // Bottom-left corner
    ctx.closePath();
    ctx.fill();
    
    // Right side (teamB)
    ctx.fillStyle = colorB;
    ctx.beginPath();
    ctx.moveTo(topDiagonalX, 0);         // Top diagonal point (66% width)
    ctx.lineTo(width, 0);                // Top-right corner
    ctx.lineTo(width, height);           // Bottom-right corner
    ctx.lineTo(bottomDiagonalX, height); // Bottom diagonal point (33% width)
    ctx.closePath();
    ctx.fill();
    
    // Draw white diagonal line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 16;
    ctx.lineCap = 'butt'; // Ensures clean edges
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    // Calculate the direction vector of the diagonal
    const dx = bottomDiagonalX - topDiagonalX;
    const dy = height;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length;
    const unitY = dy / length;
    
    // Extend the line in both directions (shifted 1px to the right)
    ctx.moveTo(topDiagonalX + 1 - unitX * DIAGONAL_LINE_EXTENSION, 0 - unitY * DIAGONAL_LINE_EXTENSION);
    ctx.lineTo(bottomDiagonalX + 1 + unitX * DIAGONAL_LINE_EXTENSION, height + unitY * DIAGONAL_LINE_EXTENSION);
    ctx.stroke();
    
    // Load and draw logos
    try {
        if (teamA.logo) {
            const logoABuffer = await downloadImage(teamA.logo);
            const logoA = await loadImage(logoABuffer);
            
            // Calculate logo size (30% bigger than before)
            const logoSize = Math.min(width * 0.325, height * 0.52);
            
            // Center on left half of canvas (0 to width/2)
            const logoAX = (width / 4) - (logoSize / 2);  // 25% of total width
            const logoAY = (height / 2) - (logoSize / 2);
            
            // Check if logo needs white outline (if too close to background color)
            const logoNeedsOutline = shouldAddOutlineToLogo(logoA, colorA);
            
            if (logoNeedsOutline) {
                drawLogoWithOutline(ctx, logoA, logoAX, logoAY, logoSize);
            } else {
                // Add drop shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 20;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                
                ctx.drawImage(logoA, logoAX, logoAY, logoSize, logoSize);
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }
        
        if (teamB.logo) {
            const logoBBuffer = await downloadImage(teamB.logo);
            const logoB = await loadImage(logoBBuffer);
            
            // Calculate logo size (30% bigger than before)
            const logoSize = Math.min(width * 0.325, height * 0.52);
            
            // Center on right half of canvas (width/2 to width)
            const logoBX = (width * 0.75) - (logoSize / 2);  // 75% of total width
            const logoBY = (height / 2) - (logoSize / 2);
            
            // Check if logo needs white outline (if too close to background color)
            const logoNeedsOutline = shouldAddOutlineToLogo(logoB, colorB);
            
            if (logoNeedsOutline) {
                drawLogoWithOutline(ctx, logoB, logoBX, logoBY, logoSize);
            } else {
                // Add drop shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 20;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                
                ctx.drawImage(logoB, logoBX, logoBY, logoSize, logoSize);
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }
    } catch (error) {
        console.error('Error loading team logos:', error.message);
    }
    
    // Draw league logo in the center if league is provided
    if (league) {
        try {
            const leagueLogoUrl = `https://a.espncdn.com/i/teamlogos/leagues/500/${league.toLowerCase()}.png`;
            const leagueLogoBuffer = await downloadImage(leagueLogoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            // League logo in center (scaled for 1920x1080)
            const leagueLogoSize = Math.min(width, height) * 0.25;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = (height - leagueLogoSize) / 2;
            
            // Add drop shadow for league logo
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            
            ctx.drawImage(leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, leagueLogoSize);
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } catch (error) {
            console.error('Error loading league logo:', error.message);
            // Continue without league logo if it fails
        }
    }
    
    // Return PNG buffer
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// utilities
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

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
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

function rgbToHex(rgb) {
    const toHex = (n) => {
        const hex = n.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function shouldAddOutlineToLogo(logoImage, backgroundColor) {
    try {
        const logoAvgColor = getAverageColor(logoImage);
        const logoHex = rgbToHex(logoAvgColor);
        const distance = colorDistance(logoHex, backgroundColor);
        
        return distance < COLOR_SIMILARITY_THRESHOLD;
    } catch (error) {
        console.error('Error checking logo color:', error.message);
        return false; // Don't add outline if we can't determine
    }
}

// Cache for white logo versions to avoid recreating them
const whiteLogoCache = new Map();

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
    // Remove entries until cache size is less than MAX_CACHE_SIZE
    while (whiteLogoCache.size >= MAX_CACHE_SIZE) {
        const firstKey = whiteLogoCache.keys().next().value;
        whiteLogoCache.delete(firstKey);
    }
    whiteLogoCache.set(cacheKey, tempCanvas);
    
    return tempCanvas;
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
    
    // Draw white outline with more steps for ultra-smooth angles (caching makes this fast!)
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