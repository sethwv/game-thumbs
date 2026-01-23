// ------------------------------------------------------------------------------
// thumbnailGenerator.js
// This helper generates game thumbnail images with team logos and colors
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const { 
    drawLogoWithShadow, 
    drawLogoMaintainAspect,
    downloadImage, 
    selectBestLogo,
    adjustColors,
    colorDistance,
    hexToRgb,
    rgbToHex,
    getAverageColor,
    loadTrimmedLogo,
    trimImage
} = require('../helpers/imageUtils');
const logger = require('../helpers/logger');

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
        case 5:
            return generateGrid(teamA, teamB, width, height, league, orientation, false);
        case 6:
            return generateGrid(teamA, teamB, width, height, league, orientation, true);
        case 99:
            return generate3DEmbossed(teamA, teamB, width, height, league, orientation);
        default:
            throw new Error(`Unknown style: ${style}. Valid styles are 1 (split), 2 (gradient), 3 (minimalist badge), 4 (minimalist badge dark), 5 (grid), 6 (grid team colors), 99 (3D embossed)`);
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
    const logoMaxSize = orientation === 'landscape' 
        ? Math.min(width * 0.325, height * 0.52)
        : Math.min(width * 0.5, height * 0.32);
    
    // Load teamA logo independently
    if (teamA.logo) {
        try {
            const finalLogoImageA = await loadTrimmedLogo(teamA, colorA);
            
            const logoAX = orientation === 'landscape'
                ? (width * 0.2) - (logoMaxSize / 2)
                : (width - logoMaxSize) / 2;
            const logoAY = orientation === 'landscape'
                ? (height / 2) - (logoMaxSize / 2)
                : (height * 0.2) - (logoMaxSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageA, logoAX, logoAY, logoMaxSize);
        } catch (error) {
            logger.warn('Failed to load team A logo for split style', { 
                team: teamA.name,
                error: error.message 
            });
        }
    }
    
    // Load teamB logo independently
    if (teamB.logo) {
        try {
            const finalLogoImageB = await loadTrimmedLogo(teamB, colorB);
            
            const logoBX = orientation === 'landscape'
                ? (width * 0.8) - (logoMaxSize / 2)
                : (width - logoMaxSize) / 2;
            const logoBY = orientation === 'landscape'
                ? (height / 2) - (logoMaxSize / 2)
                : (height * 0.8) - (logoMaxSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageB, logoBX, logoBY, logoMaxSize);
        } catch (error) {
            logger.warn('Failed to load team B logo for split style', { 
                team: teamB.name,
                error: error.message 
            });
        }
    }
    
    // Draw league logo in bottom right corner if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            let leagueLogoBuffer = await downloadImage(league.logoUrl);
            leagueLogoBuffer = await trimImage(leagueLogoBuffer, league.logoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            const leagueLogoSize = Math.min(width, height) * 0.25;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = (height - leagueLogoSize) / 2;
            drawLogoMaintainAspect(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize);
        } catch (error) {
            logger.warn('Failed to load league logo for split style', { error: error.message });
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
        const logoMaxSize = orientation === 'landscape'
            ? Math.min(width * 0.325, height * 0.52)
            : Math.min(width * 0.5, height * 0.32);
        
        if (teamA.logo) {
            const finalLogoImageA = await loadTrimmedLogo(teamA, colorA);
            
            const logoAX = orientation === 'landscape'
                ? (width * 0.2) - (logoMaxSize / 2)
                : (width - logoMaxSize) / 2;
            const logoAY = orientation === 'landscape'
                ? (height / 2) - (logoMaxSize / 2)
                : (height * 0.2) - (logoMaxSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageA, logoAX, logoAY, logoMaxSize);
        }
        
        if (teamB.logo) {
            const finalLogoImageB = await loadTrimmedLogo(teamB, colorB);
            
            const logoBX = orientation === 'landscape'
                ? (width * 0.8) - (logoMaxSize / 2)
                : (width - logoMaxSize) / 2;
            const logoBY = orientation === 'landscape'
                ? (height / 2) - (logoMaxSize / 2)
                : (height * 0.8) - (logoMaxSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageB, logoBX, logoBY, logoMaxSize);
        }
    } catch (error) {
        logger.warn('Failed to load team logos for gradient style', { error: error.message });
    }
    
    // Draw league logo in the center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            let leagueLogoBuffer = await downloadImage(league.logoUrl);
            leagueLogoBuffer = await trimImage(leagueLogoBuffer, league.logoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            const leagueLogoSize = Math.min(width, height) * 0.25;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = (height - leagueLogoSize) / 2;
            drawLogoMaintainAspect(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize);
        } catch (error) {
            logger.warn('Failed to load league logo for gradient style', { error: error.message });
        }
    }
    
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 5/6: Grid Background (grey or team colors)
// ------------------------------------------------------------------------------

async function generateGrid(teamA, teamB, width, height, league, orientation, useTeamColors = false) {
    const { colorA, colorB } = adjustColors(teamA, teamB);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid pattern
    const gridSize = Math.min(width, height) * 0.22; // Grid cell size
    const lineWidth = 7;
    
    // Set grid color based on parameter
    if (useTeamColors) {
        // Create gradient for grid lines using team colors
        const gridGradient = ctx.createLinearGradient(0, 0, width, 0);
        gridGradient.addColorStop(0, colorA + '40'); // 25% opacity
        gridGradient.addColorStop(0.5, blendColors(colorA, colorB) + '40');
        gridGradient.addColorStop(1, colorB + '40');
        ctx.strokeStyle = gridGradient;
    } else {
        // Use grey color
        ctx.strokeStyle = 'rgba(120, 120, 120, 0.25)';
    }
    
    ctx.lineWidth = lineWidth;
    
    // Rotate for diagonal grid effect
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(Math.PI / 12); // 15 degree angle
    ctx.translate(-width / 2, -height / 2);
    
    // Calculate extended bounds for rotated grid
    const extendedSize = Math.sqrt(width * width + height * height);
    const startX = (width - extendedSize) / 2;
    const startY = (height - extendedSize) / 2 - (gridSize * 0.5); // Shift up by half a grid size
    
    // Use lighten blend mode to prevent overlapping darkness at intersections
    ctx.globalCompositeOperation = 'lighten';
    
    // Draw all grid lines as one path to avoid overlapping
    ctx.beginPath();
    
    // Draw vertical lines
    for (let x = startX; x < startX + extendedSize; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + extendedSize);
    }
    
    // Draw horizontal lines
    for (let y = startY; y < startY + extendedSize; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + extendedSize, y);
    }
    
    ctx.stroke();
    
    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.restore();
    
    // Add fade to black gradient overlay towards the bottom
    const fadeGradient = ctx.createLinearGradient(0, 0, 0, height);
    fadeGradient.addColorStop(0, 'rgba(10, 10, 10, 0)');
    fadeGradient.addColorStop(0.3, 'rgba(10, 10, 10, 0.3)');
    fadeGradient.addColorStop(0.6, 'rgba(10, 10, 10, 0.7)');
    fadeGradient.addColorStop(1, 'rgba(10, 10, 10, 0.95)');
    
    ctx.fillStyle = fadeGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Load and draw logos (same positioning as style 2)
    // Use dark background color for logo selection to prioritize logos readable on dark backgrounds
    const darkBackground = '#0a0a0a';
    try {
        const logoMaxSize = orientation === 'landscape'
            ? Math.min(width * 0.325, height * 0.52)
            : Math.min(width * 0.5, height * 0.32);
        
        if (teamA.logo) {
            const finalLogoImageA = await loadTrimmedLogo(teamA, darkBackground);
            
            const logoAX = orientation === 'landscape'
                ? (width * 0.2) - (logoMaxSize / 2)
                : (width - logoMaxSize) / 2;
            const logoAY = orientation === 'landscape'
                ? (height / 2) - (logoMaxSize / 2)
                : (height * 0.2) - (logoMaxSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageA, logoAX, logoAY, logoMaxSize);
        }
        
        if (teamB.logo) {
            const finalLogoImageB = await loadTrimmedLogo(teamB, darkBackground);
            
            const logoBX = orientation === 'landscape'
                ? (width * 0.8) - (logoMaxSize / 2)
                : (width - logoMaxSize) / 2;
            const logoBY = orientation === 'landscape'
                ? (height / 2) - (logoMaxSize / 2)
                : (height * 0.8) - (logoMaxSize / 2);
            
            drawLogoWithShadow(ctx, finalLogoImageB, logoBX, logoBY, logoMaxSize);
        }
    } catch (error) {
        logger.warn('Failed to load team logos for grid style', { error: error.message });
    }
    
    // Draw league logo in the center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            let leagueLogoBuffer = await downloadImage(league.logoUrl);
            leagueLogoBuffer = await trimImage(leagueLogoBuffer, league.logoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            const leagueLogoSize = Math.min(width, height) * 0.25;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = (height - leagueLogoSize) / 2;
            drawLogoMaintainAspect(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize);
        } catch (error) {
            logger.warn('Failed to load league logo for grid style', { error: error.message });
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
            const finalLogoImageA = await loadTrimmedLogo(teamA, colorA);
            
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
            
            // Maintain aspect ratio and ensure logo fits within circle
            // Circle radius is badgeSize * 0.6
            // To fit a square logo in a circle: inscribed square = radius * sqrt(2)
            const aspectA = finalLogoImageA.width / finalLogoImageA.height;
            const circleRadius = badgeSize * 0.6;
            const logoMaxSize = circleRadius * Math.sqrt(2) * 0.95; // 95% of max to leave small margin
            let logoWidth, logoHeight;
            if (aspectA > 1) {
                logoWidth = logoMaxSize;
                logoHeight = logoMaxSize / aspectA;
            } else {
                logoHeight = logoMaxSize;
                logoWidth = logoMaxSize * aspectA;
            }
            const logoX = badgeAX + (badgeSize - logoWidth) / 2;
            const logoY = badgeAY + (badgeSize - logoHeight) / 2;
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.drawImage(finalLogoImageA, logoX, logoY, logoWidth, logoHeight);
        }
        
        if (teamB.logo) {
            const finalLogoImageB = await loadTrimmedLogo(teamB, colorB);
            
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
            
            // Maintain aspect ratio and ensure logo fits within circle
            // Circle radius is badgeSize * 0.6
            // To fit a square logo in a circle: inscribed square = radius * sqrt(2)
            const aspectB = finalLogoImageB.width / finalLogoImageB.height;
            const circleRadius = badgeSize * 0.6;
            const logoMaxSize = circleRadius * Math.sqrt(2) * 0.95; // 95% of max to leave small margin
            let logoWidth, logoHeight;
            if (aspectB > 1) {
                logoWidth = logoMaxSize;
                logoHeight = logoMaxSize / aspectB;
            } else {
                logoHeight = logoMaxSize;
                logoWidth = logoMaxSize * aspectB;
            }
            const logoX = badgeBX + (badgeSize - logoWidth) / 2;
            const logoY = badgeBY + (badgeSize - logoHeight) / 2;
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            
            ctx.drawImage(finalLogoImageB, logoX, logoY, logoWidth, logoHeight);
        }
    } catch (error) {
        logger.warn('Failed to load team logos for minimalist style', { error: error.message });
    }
    
    // Draw "VS" text in center
    ctx.fillStyle = dark ? '#e9ecef' : '#495057';
    const fontSize = (orientation === 'landscape' ? height * 0.18 : width * 0.22) * 0.75;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    
    // Measure text to get accurate vertical centering
    const textMetrics = ctx.measureText('VS');
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    const textY = centerY + (textMetrics.actualBoundingBoxAscent / 2) - (textMetrics.actualBoundingBoxDescent / 2);
    
    ctx.fillText('VS', centerX, textY);
    
    // Draw league logo at bottom if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            let leagueLogoBuffer = await downloadImage(league.logoUrl);
            leagueLogoBuffer = await trimImage(leagueLogoBuffer, league.logoUrl);
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
            
            // Calculate dimensions maintaining aspect ratio
            const aspectRatio = leagueLogo.width / leagueLogo.height;
            let drawWidth, drawHeight;
            
            if (aspectRatio > 1) {
                // Wider than tall
                drawWidth = leagueLogoSize;
                drawHeight = leagueLogoSize / aspectRatio;
            } else {
                // Taller than wide or square
                drawHeight = leagueLogoSize;
                drawWidth = leagueLogoSize * aspectRatio;
            }
            
            // Adjust position to maintain centering
            const adjustedX = leagueLogoX + (leagueLogoSize - drawWidth) / 2;
            const adjustedY = leagueLogoY + (leagueLogoSize - drawHeight) / 2;
            
            ctx.drawImage(leagueLogo, adjustedX, adjustedY, drawWidth, drawHeight);
        } catch (error) {
            logger.warn('Failed to load league logo for minimalist style', { error: error.message });
        }
    }
    
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 99: 3D Embossed - Split panel with embossed texture and reflections
// ------------------------------------------------------------------------------

async function generate3DEmbossed(teamA, teamB, width, height, league, orientation) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 3D Effect Settings
    const TEXTURE_SCALE = 1.7;
    const EMBOSS_OFFSET = Math.max(2, Math.round(width * 0.0015));
    const EMBOSS_OPACITY = 0.15;
    const VIGNETTE_OPACITY = 0.4;
    const SPOTLIGHT_OPACITY = 0.2;
    
    // Split canvas in half
    const panelWidth = width / 2;
    
    // Helper function to create a silhouette from an image
    function createSilhouette(img, silWidth, silHeight, color) {
        const tempCanvas = createCanvas(silWidth, silHeight);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, silWidth, silHeight);
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = color;
        tempCtx.fillRect(0, 0, silWidth, silHeight);
        return tempCanvas;
    }
    
    // Helper function to draw a team panel with 3D effects
    async function drawTeamPanel(team, xOffset, panelW, panelH) {
        // Set up clipping region for this panel to prevent overlap
        ctx.save();
        ctx.beginPath();
        ctx.rect(xOffset, 0, panelW, panelH);
        ctx.clip();
        
        // 1. Base Fill (Team Color)
        ctx.fillStyle = team.color;
        ctx.fillRect(xOffset, 0, panelW, panelH);
        
        // 2. Draw Background Gradient (Spotlight + Vignette)
        const gradient = ctx.createRadialGradient(
            xOffset + panelW / 2, panelH / 2, 10,
            xOffset + panelW / 2, panelH / 2, panelW * 0.8
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${SPOTLIGHT_OPACITY})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${VIGNETTE_OPACITY})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(xOffset, 0, panelW, panelH);
        
        // Load team logo
        let logoImg = null;
        if (team.logo) {
            try {
                logoImg = await loadTrimmedLogo(team, team.color);
            } catch (error) {
                logger.warn('Failed to load team logo for 3D embossed style', { 
                    team: team.name, 
                    error: error.message 
                });
            }
        }
        
        if (logoImg) {
            // Calculate aspect ratio preserving dimensions
            const logoAspect = logoImg.width / logoImg.height;
            
            // 3. 3D Embossed Texture Effect (large background texture)
            const texMaxSize = Math.min(panelW, panelH) * TEXTURE_SCALE;
            let texWidth, texHeight;
            if (logoAspect > 1) {
                texWidth = texMaxSize;
                texHeight = texMaxSize / logoAspect;
            } else {
                texHeight = texMaxSize;
                texWidth = texMaxSize * logoAspect;
            }
            const texX = xOffset + (panelW - texWidth) / 2;
            const texY = (panelH - texHeight) / 2;
            
            const highlightCanvas = createSilhouette(logoImg, texWidth, texHeight, '#FFFFFF');
            const shadowCanvas = createSilhouette(logoImg, texWidth, texHeight, '#000000');
            
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = EMBOSS_OPACITY;
            
            // Draw highlight (top-left offset)
            ctx.drawImage(highlightCanvas, texX - EMBOSS_OFFSET, texY - EMBOSS_OFFSET);
            
            // Draw shadow (bottom-right offset)
            ctx.globalAlpha = EMBOSS_OPACITY * 1.5;
            ctx.drawImage(shadowCanvas, texX + EMBOSS_OFFSET, texY + EMBOSS_OFFSET);
            ctx.restore();
            
            // 4. Hero Logo with Reflection
            const heroMaxSize = Math.min(panelW, panelH) * 0.5;
            let heroWidth, heroHeight;
            if (logoAspect > 1) {
                heroWidth = heroMaxSize;
                heroHeight = heroMaxSize / logoAspect;
            } else {
                heroHeight = heroMaxSize;
                heroWidth = heroMaxSize * logoAspect;
            }
            const heroX = xOffset + (panelW - heroWidth) / 2;
            const heroY = (panelH - heroHeight) / 2;
            
            // A. Draw Reflection (below logo, flipped vertically)
            const reflectionGap = Math.round(heroHeight * 0.05); // 5% gap between logo and reflection
            ctx.save();
            ctx.translate(heroX, heroY + heroHeight * 2 + reflectionGap);
            ctx.scale(1, -1);
            ctx.globalAlpha = 0.25;
            
            // Create reflection with gradient mask
            const refCanvas = createCanvas(heroWidth, heroHeight);
            const refCtx = refCanvas.getContext('2d');
            refCtx.drawImage(logoImg, 0, 0, heroWidth, heroHeight);
            
            // Apply gradient mask to reflection with more gradual fade
            refCtx.globalCompositeOperation = 'destination-in';
            const refGrad = refCtx.createLinearGradient(0, 0, 0, heroHeight);
            refGrad.addColorStop(0, 'rgba(0,0,0,0)');
            refGrad.addColorStop(0.25, 'rgba(0,0,0,0.4)');
            refGrad.addColorStop(0.6, 'rgba(0,0,0,0.8)');
            refGrad.addColorStop(1, 'rgba(0,0,0,1)');
            refCtx.fillStyle = refGrad;
            refCtx.fillRect(0, 0, heroWidth, heroHeight);
            
            ctx.drawImage(refCanvas, 0, 0);
            ctx.restore();
            
            // B. Main Logo with Shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetY = 15;
            ctx.drawImage(logoImg, heroX, heroY, heroWidth, heroHeight);
            ctx.restore();
        } else {
            // Fallback text if logo fails
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = `bold ${Math.round(panelH * 0.08)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(team.name.substring(0, 3).toUpperCase(), xOffset + panelW / 2, panelH / 2);
        }
        
        // Release clipping region
        ctx.restore();
    }
    
    // Draw both team panels
    await drawTeamPanel(teamA, 0, panelWidth, height);
    await drawTeamPanel(teamB, panelWidth, panelWidth, height);
    
    // 5. 3D Center Divider
    const dividerX = panelWidth;
    const dividerGrad = ctx.createLinearGradient(dividerX - 3, 0, dividerX + 3, 0);
    dividerGrad.addColorStop(0, 'rgba(0,0,0,0.8)');
    dividerGrad.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    dividerGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
    
    ctx.fillStyle = dividerGrad;
    ctx.fillRect(dividerX - 3, 0, 6, height);
    
    // 6. 3D VS Badge in center
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.076;
    
    // Outer Metal Ring
    const ringGrad = ctx.createLinearGradient(
        centerX - radius, centerY - radius,
        centerX + radius, centerY + radius
    );
    ringGrad.addColorStop(0, '#444');
    ringGrad.addColorStop(0.5, '#fff');
    ringGrad.addColorStop(1, '#444');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = ringGrad;
    ctx.fill();
    
    // Inner Dark Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#111';
    ctx.fill();
    
    // VS Text
    ctx.fillStyle = 'white';
    ctx.font = `900 ${Math.round(radius * 0.76)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillText('VS', centerX, centerY + 3);
    
    return canvas.toBuffer('image/png');
}
