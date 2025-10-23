// ------------------------------------------------------------------------------
// thumbnailGenerator.js
// This helper generates game thumbnail images with team logos and colors
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const https = require('https');

module.exports = {
    generateThumbnail
};

// ------------------------------------------------------------------------------

async function generateThumbnail(teamA, teamB, options = {}) {
    const width = options.width || 1920;
    const height = options.height || 1080;
    
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
        
        if (teamB.logo) {
            const logoBBuffer = await downloadImage(teamB.logo);
            const logoB = await loadImage(logoBBuffer);
            
            // Calculate logo size (30% bigger than before)
            const logoSize = Math.min(width * 0.325, height * 0.52);
            
            // Center on right half of canvas (width/2 to width)
            const logoBX = (width * 0.75) - (logoSize / 2);  // 75% of total width
            const logoBY = (height / 2) - (logoSize / 2);
            
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
    } catch (error) {
        console.error('Error loading team logos:', error.message);
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