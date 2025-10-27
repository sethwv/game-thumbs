// ------------------------------------------------------------------------------
// thumbnailGenerator.js
// This helper generates game thumbnail images with team logos and colors
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const { 
    drawLogoWithShadow, 
    downloadImage, 
    selectBestLogo,
    adjustColors,
    colorDistance,
    hexToRgb,
    rgbToHex,
    getAverageColor
} = require('./imageUtils');

module.exports = {
    generateThumbnail,
    generateCover
};

// ------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------

const COLOR_SIMILARITY_THRESHOLD = 120; // Colors closer than this need an outline
const DIAGONAL_LINE_EXTENSION = 100; // Pixels to extend diagonal line beyond canvas

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

function blendColors(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return color1;
    
    const blended = {
        r: Math.round((rgb1.r + rgb2.r) / 2),
        g: Math.round((rgb1.g + rgb2.g) / 2),
        b: Math.round((rgb1.b + rgb2.b) / 2)
    };
    
    return rgbToHex(blended);
}

// ------------------------------------------------------------------------------

async function generateThumbnail(teamA, teamB, options = {}) {
    const width = options.width || 1440;
    const height = options.height || 1080;
    const style = options.style || 1;
    const league = options.league;
    
    return generateImage(teamA, teamB, { ...options, width, height, style, league, orientation: 'landscape' });
}

async function generateCover(teamA, teamB, options = {}) {
    const width = options.width || 1080;
    const height = options.height || 1440;
    const style = options.style || 1;
    const league = options.league;
    
    return generateImage(teamA, teamB, { ...options, width, height, style, league, orientation: 'portrait' });
}

async function generateImage(teamA, teamB, options) {
    const { width, height, style, league, orientation } = options;
    
    switch (style) {
        case 1:
            return generateSplit(teamA, teamB, width, height, league, orientation);
        case 2:
            return generateGradient(teamA, teamB, width, height, league, orientation);
        case 3:
            return generateMinimalist(teamA, teamB, width, height, league, orientation, false);
        case 4:
            return generateMinimalist(teamA, teamB, width, height, league, orientation, true);
        default:
            throw new Error(`Unknown style: ${style}. Valid styles are 1 (split), 2 (gradient), 3 (minimalist badge), 4 (minimalist badge dark)`);
    }
}

// ------------------------------------------------------------------------------
// Style 1: Split (diagonal for landscape, horizontal for portrait)
// ------------------------------------------------------------------------------

async function generateSplit(teamA, teamB, width, height, league, orientation) {
    const { colorA, colorB } = adjustColors(teamA, teamB);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (orientation === 'landscape') {
        // Diagonal split for thumbnails
        const topDiagonalX = width * 0.66;
        const bottomDiagonalX = width * 0.33;
        
        // Left side (teamA)
        ctx.fillStyle = colorA;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(topDiagonalX, 0);
        ctx.lineTo(bottomDiagonalX, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        
        // Right side (teamB)
        ctx.fillStyle = colorB;
        ctx.beginPath();
        ctx.moveTo(topDiagonalX, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(bottomDiagonalX, height);
        ctx.closePath();
        ctx.fill();
        
        // Draw white diagonal line
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 16;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        const dx = bottomDiagonalX - topDiagonalX;
        const dy = height;
        const length = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / length;
        const unitY = dy / length;
        ctx.moveTo(topDiagonalX + 1 - unitX * DIAGONAL_LINE_EXTENSION, 0 - unitY * DIAGONAL_LINE_EXTENSION);
        ctx.lineTo(bottomDiagonalX + 1 + unitX * DIAGONAL_LINE_EXTENSION, height + unitY * DIAGONAL_LINE_EXTENSION);
        ctx.stroke();
    } else {
        // Horizontal split for covers
        const midpointY = height / 2;
        
        ctx.fillStyle = colorA;
        ctx.fillRect(0, 0, width, midpointY);
        
        ctx.fillStyle = colorB;
        ctx.fillRect(0, midpointY, width, height - midpointY);
        
        // Draw white horizontal line
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 16;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(0, midpointY);
        ctx.lineTo(width, midpointY);
        ctx.stroke();
    }
    
    // Load and draw logos
    try {
        const logoSize = orientation === 'landscape' 
            ? Math.min(width * 0.325, height * 0.52)
            : Math.min(width * 0.5, height * 0.32);
        
        if (teamA.logo) {
            const finalLogoA = await selectBestLogo(teamA, colorA);
            const finalLogoImageA = await loadImage(await downloadImage(finalLogoA));
            
            const logoAX = orientation === 'landscape'
                ? (width / 5) - (logoSize / 2)
                : (width - logoSize) / 2;
            const logoAY = orientation === 'landscape'
                ? (height / 2) - (logoSize / 2)
                : (height * 0.25) - (logoSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageA, logoAX, logoAY, logoSize);
        }
        
        if (teamB.logo) {
            const finalLogoB = await selectBestLogo(teamB, colorB);
            const finalLogoImageB = await loadImage(await downloadImage(finalLogoB));
            
            const logoBX = orientation === 'landscape'
                ? (width * 0.8) - (logoSize / 2)
                : (width - logoSize) / 2;
            const logoBY = orientation === 'landscape'
                ? (height / 2) - (logoSize / 2)
                : (height * 0.75) - (logoSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageB, logoBX, logoBY, logoSize);
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
            
            const leagueLogoSize = Math.min(width, height) * 0.25;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = (height - leagueLogoSize) / 2;
            
            drawLogoWithShadow(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize);
        } catch (error) {
            console.error('Error loading league logo:', error.message);
        }
    }
    
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 2: Gradient
// ------------------------------------------------------------------------------

async function generateGradient(teamA, teamB, width, height, league, orientation) {
    const { colorA, colorB } = adjustColors(teamA, teamB);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Create smooth gradient
    const gradient = orientation === 'landscape'
        ? ctx.createLinearGradient(0, 0, width, 0)
        : ctx.createLinearGradient(0, 0, 0, height);
    
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(0.2, colorA);
    gradient.addColorStop(0.5, blendColors(colorA, colorB));
    gradient.addColorStop(0.8, colorB);
    gradient.addColorStop(1, colorB);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Load and draw logos
    try {
        const logoSize = orientation === 'landscape'
            ? Math.min(width * 0.325, height * 0.52)
            : Math.min(width * 0.5, height * 0.32);
        
        if (teamA.logo) {
            const finalLogoA = await selectBestLogo(teamA, colorA);
            const finalLogoImageA = await loadImage(await downloadImage(finalLogoA));
            
            const logoAX = orientation === 'landscape'
                ? (width / 5) - (logoSize / 2)
                : (width - logoSize) / 2;
            const logoAY = orientation === 'landscape'
                ? (height / 2) - (logoSize / 2)
                : (height * 0.25) - (logoSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageA, logoAX, logoAY, logoSize);
        }
        
        if (teamB.logo) {
            const finalLogoB = await selectBestLogo(teamB, colorB);
            const finalLogoImageB = await loadImage(await downloadImage(finalLogoB));
            
            const logoBX = orientation === 'landscape'
                ? (width * 0.8) - (logoSize / 2)
                : (width - logoSize) / 2;
            const logoBY = orientation === 'landscape'
                ? (height / 2) - (logoSize / 2)
                : (height * 0.75) - (logoSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageB, logoBX, logoBY, logoSize);
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
            
            const leagueLogoSize = Math.min(width, height) * 0.25;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = (height - leagueLogoSize) / 2;
            
            drawLogoWithShadow(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize);
        } catch (error) {
            console.error('Error loading league logo:', error.message);
        }
    }
    
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 3/4: Minimalist Badge (light/dark)
// ------------------------------------------------------------------------------

async function generateMinimalist(teamA, teamB, width, height, league, orientation, dark = false) {
    const { colorA, colorB } = adjustColors(teamA, teamB);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Subtle gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    if (dark) {
        bgGradient.addColorStop(0, '#1a1d23');
        bgGradient.addColorStop(1, '#0f1114');
    } else {
        bgGradient.addColorStop(0, '#f8f9fa');
        bgGradient.addColorStop(1, '#e9ecef');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate sizes based on orientation
    const badgeSize = Math.min(width, height) * (orientation === 'landscape' ? 0.3 : 0.35);
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Position circles further from center (at 1/5 and 4/5 positions instead of 1/4 and 3/4)
    const circleACenter = orientation === 'landscape' ? width / 5 : height / 5;
    const circleBCenter = orientation === 'landscape' ? (width * 4) / 5 : (height * 4) / 5;
    
    // Load and draw logos as badges
    try {
        if (teamA.logo) {
            const finalLogoA = await selectBestLogo(teamA, colorA);
            const finalLogoImageA = await loadImage(await downloadImage(finalLogoA));
            
            const badgeAX = orientation === 'landscape'
                ? circleACenter - (badgeSize / 2)
                : centerX - (badgeSize / 2);
            const badgeAY = orientation === 'landscape'
                ? centerY - (badgeSize / 2)
                : circleACenter - (badgeSize / 2);
            
            // Draw colored circle behind logo
            ctx.fillStyle = colorA;
            ctx.beginPath();
            ctx.arc(badgeAX + badgeSize / 2, badgeAY + badgeSize / 2, badgeSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;
            
            const logoSize = badgeSize * 0.95;
            const logoX = badgeAX + (badgeSize - logoSize) / 2;
            const logoY = badgeAY + (badgeSize - logoSize) / 2;
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.drawImage(finalLogoImageA, logoX, logoY, logoSize, logoSize);
        }
        
        if (teamB.logo) {
            const finalLogoB = await selectBestLogo(teamB, colorB);
            const finalLogoImageB = await loadImage(await downloadImage(finalLogoB));
            
            const badgeBX = orientation === 'landscape'
                ? circleBCenter - (badgeSize / 2)
                : centerX - (badgeSize / 2);
            const badgeBY = orientation === 'landscape'
                ? centerY - (badgeSize / 2)
                : circleBCenter - (badgeSize / 2);
            
            // Draw colored circle behind logo
            ctx.fillStyle = colorB;
            ctx.beginPath();
            ctx.arc(badgeBX + badgeSize / 2, badgeBY + badgeSize / 2, badgeSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;
            
            const logoSize = badgeSize * 0.95;
            const logoX = badgeBX + (badgeSize - logoSize) / 2;
            const logoY = badgeBY + (badgeSize - logoSize) / 2;
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.drawImage(finalLogoImageB, logoX, logoY, logoSize, logoSize);
        }
    } catch (error) {
        console.error('Error loading team logos:', error.message);
    }
    
    // Draw "VS" text in center
    ctx.fillStyle = dark ? '#e9ecef' : '#495057';
    const fontSize = orientation === 'landscape' ? height * 0.18 : width * 0.22;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    
    // Measure text to get accurate vertical centering
    const textMetrics = ctx.measureText('VS');
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    const textY = centerY + (textMetrics.actualBoundingBoxAscent / 2) - (textMetrics.actualBoundingBoxDescent / 2);
    
    ctx.fillText('VS', centerX, textY);
    
    // Draw league logo at bottom if provided
    if (league) {
        try {
            const leagueLogoUrl = `https://a.espncdn.com/i/teamlogos/leagues/500/${league.toLowerCase()}.png`;
            const leagueLogoBuffer = await downloadImage(leagueLogoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            // Smaller logo for portrait orientation
            const leagueLogoSize = orientation === 'landscape' 
                ? Math.min(width, height) * 0.25
                : Math.min(width, height) * 0.15;
            
            // Position in bottom right corner for portrait, bottom center for landscape
            const leagueLogoX = orientation === 'landscape' 
                ? (width - leagueLogoSize) / 2
                : width - leagueLogoSize - (width * 0.08);
            const leagueLogoY = orientation === 'landscape'
                ? height - leagueLogoSize - (height * 0.08)
                : height - leagueLogoSize - (height * 0.02);
            
            ctx.drawImage(leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, leagueLogoSize);
        } catch (error) {
            console.error('Error loading league logo:', error.message);
        }
    }
    
    return canvas.toBuffer('image/png');
}
