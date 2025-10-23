// ------------------------------------------------------------------------------
// LogoGenerator.js
// This helper generates matchup logo images with team logos
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const https = require('https');

module.exports = {
    generateLogo
};

// ------------------------------------------------------------------------------

/**
 * Generates a matchup logo with team logos
 * @param {Object} teamA - First team object from ESPNTeamResolver
 * @param {Object} teamB - Second team object from ESPNTeamResolver
 * @param {Object} options - Optional settings (width, height, style, league)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateLogo(teamA, teamB, options = {}) {
    const width = options.width || 800;
    const height = options.height || 800;
    const style = options.style || 1;
    const league = options.league; // Required for league logo
    
    switch (style) {
        case 1:
            return generateDiagonalSplit(teamA, teamB, width, height, league);
        case 2:
            return generateSideBySide(teamA, teamB, width, height, league);
        default:
            throw new Error(`Unknown logo style: ${style}. Valid styles are 1 (split) or 2 (side-by-side)`);
    }
}

// ------------------------------------------------------------------------------
// Style 1: Diagonal Split
// ------------------------------------------------------------------------------

async function generateDiagonalSplit(teamA, teamB, width, height, league) {
    // Create canvas with transparent background
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Load both logos
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    const logoABuffer = await downloadImage(teamA.logo);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamB.logo);
    const logoB = await loadImage(logoBBuffer);
    
    // Calculate diagonal split points (same as thumbnail)
    // Diagonal goes from 66% width at top to 33% width at bottom (pointing right)
    const topDiagonalX = width * 0.66;
    const bottomDiagonalX = width * 0.33;
    
    // Draw teamA logo on the left side (clipped to left of diagonal)
    ctx.save();
    
    // Create clipping path for left side
    ctx.beginPath();
    ctx.moveTo(0, 0);                    // Top-left corner
    ctx.lineTo(topDiagonalX, 0);         // Top diagonal point (66% width)
    ctx.lineTo(bottomDiagonalX, height); // Bottom diagonal point (33% width)
    ctx.lineTo(0, height);               // Bottom-left corner
    ctx.closePath();
    ctx.clip();
    
    // Draw left logo (centered on canvas, but clipped)
    const logoSize = Math.min(width, height) * 0.8;
    const logoX = (width - logoSize) / 2;
    const logoY = (height - logoSize) / 2;
    
    ctx.drawImage(logoA, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    
    // Draw teamB logo on the right side (clipped to right of diagonal)
    ctx.save();
    
    // Create clipping path for right side
    ctx.beginPath();
    ctx.moveTo(topDiagonalX, 0);         // Top diagonal point (66% width)
    ctx.lineTo(width, 0);                // Top-right corner
    ctx.lineTo(width, height);           // Bottom-right corner
    ctx.lineTo(bottomDiagonalX, height); // Bottom diagonal point (33% width)
    ctx.closePath();
    ctx.clip();
    
    // Draw right logo (centered on canvas, but clipped)
    ctx.drawImage(logoB, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    
    // Draw diagonal line through the middle (shorter, white)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = Math.min(width, height) * 0.01; // 1% of canvas size
    
    // Calculate shorter line (75% of canvas size from center)
    const centerX = (topDiagonalX + bottomDiagonalX) / 2;
    const centerY = height / 2;
    const lineLength = Math.min(width, height) * 0.85;
    const angle = Math.atan2(height, bottomDiagonalX - topDiagonalX);
    
    const lineStartX = centerX - (lineLength / 2) * Math.cos(angle);
    const lineStartY = centerY - (lineLength / 2) * Math.sin(angle);
    const lineEndX = centerX + (lineLength / 2) * Math.cos(angle);
    const lineEndY = centerY + (lineLength / 2) * Math.sin(angle);
    
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineStartY);
    ctx.lineTo(lineEndX, lineEndY);
    ctx.stroke();
    ctx.restore();
    
    // Draw league logo as a badge in the bottom right corner if league is provided
    // This is drawn LAST so it appears on top
    if (league) {
        try {
            const leagueLogoUrl = `https://a.espncdn.com/i/teamlogos/leagues/500/${league.toLowerCase()}.png`;
            const leagueLogoBuffer = await downloadImage(leagueLogoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            // Save context for league logo
            ctx.save();
            
            // League logo is smaller as a badge (20% of canvas size)
            const leagueLogoSize = Math.min(width, height) * 0.2;
            const padding = Math.min(width, height) * 0.05; // 5% padding from edges
            const leagueLogoX = width - leagueLogoSize - padding;
            const leagueLogoY = height - leagueLogoSize - padding;
            
            // Add subtle drop shadow for league logo badge
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
            ctx.drawImage(leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, leagueLogoSize);
            
            ctx.restore();
        } catch (error) {
            console.error('Error loading league logo:', error.message);
            // Continue without league logo if it fails
        }
    }
    
    // Return PNG buffer with transparency
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 2: Side by Side
// ------------------------------------------------------------------------------

async function generateSideBySide(teamA, teamB, width, height, league) {
    // Create canvas with transparent background
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Load both logos
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    const logoABuffer = await downloadImage(teamA.logo);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamB.logo);
    const logoB = await loadImage(logoBBuffer);
    
    // Calculate logo size (40% of canvas for each logo)
    const logoSize = Math.min(width, height) * 0.4;
    const spacing = width * 0.1; // 10% spacing between logos
    
    // Position logos side by side
    const logoAX = (width / 2) - logoSize - (spacing / 2);
    const logoAY = (height - logoSize) / 2;
    
    const logoBX = (width / 2) + (spacing / 2);
    const logoBY = (height - logoSize) / 2;
    
    // Draw teamA logo (left)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(logoA, logoAX, logoAY, logoSize, logoSize);
    ctx.restore();
    
    // Draw teamB logo (right)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(logoB, logoBX, logoBY, logoSize, logoSize);
    ctx.restore();
    
    // Draw league logo as a badge in the bottom center if league is provided
    if (league) {
        try {
            const leagueLogoUrl = `https://a.espncdn.com/i/teamlogos/leagues/500/${league.toLowerCase()}.png`;
            const leagueLogoBuffer = await downloadImage(leagueLogoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            ctx.save();
            
            // League logo is smaller (15% of canvas size)
            const leagueLogoSize = Math.min(width, height) * 0.15;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = height - leagueLogoSize - (height * 0.05);
            
            // Add drop shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
            ctx.drawImage(leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, leagueLogoSize);
            
            ctx.restore();
        } catch (error) {
            console.error('Error loading league logo:', error.message);
        }
    }
    
    // Return PNG buffer with transparency
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Utilities
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
