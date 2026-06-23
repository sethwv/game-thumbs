// ------------------------------------------------------------------------------
// logoGenerator.js
// This helper generates matchup logo images with team logos
// ------------------------------------------------------------------------------

const { createCanvas } = require('canvas');
const { drawLogoWithShadow, drawCenteredLogo, loadProcessedLogo, selectBestLogo, adjustColors, trimImage } = require('../helpers/imageUtils');
const { setShadow } = require('../helpers/shadows');
const logger = require('../helpers/logger');

module.exports = {
    generateLogo
};

// ------------------------------------------------------------------------------

async function generateLogo(teamA, teamB, options = {}) {
    const width = options.width || 800;
    const height = options.height || 800;
    const style = options.style || 1;
    const league = options.league;
    const useLight = options.useLight || false;
    const trim = options.trim !== undefined ? options.trim : true;
    
    let logoBuffer;
    switch (style) {
        case 1:
            logoBuffer = await generateDiagonalSplit(teamA, teamB, width, height, league, useLight);
            break;
        case 2:
            logoBuffer = await generateSideBySide(teamA, teamB, width, height, league, useLight);
            break;
        case 3:
            logoBuffer = await generateCircleBadges(teamA, teamB, width, height, league, useLight);
            break;
        case 4:
            logoBuffer = await generateSquareBadges(teamA, teamB, width, height, league, useLight);
            break;
        case 5:
            logoBuffer = await generateCircleBadgesWithLeague(teamA, teamB, width, height, league, useLight);
            break;
        case 6:
            logoBuffer = await generateSquareBadgesWithLeague(teamA, teamB, width, height, league, useLight);
            break;
        default:
            throw new Error(`Unknown logo style: ${style}. Valid styles are 1 (split), 2 (side-by-side), 3 (circle badges), 4 (square badges), 5 (circle badges with league), or 6 (square badges with league)`);
    }
    
    // Apply trim if requested
    if (trim) {
        // Don't cache the final composed output trim
        logoBuffer = await trimImage(logoBuffer, false);
    }
    
    return logoBuffer;
}

// ------------------------------------------------------------------------------
// Style 1: Diagonal Split (Thumbnail-style, compact)
// Thumbnail style 1 shrunk to logo style 6 footprint with transparent background
// ------------------------------------------------------------------------------

async function generateDiagonalSplit(teamA, teamB, width, height, league, useLight) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const { colorA, colorB } = adjustColors(teamA, teamB);
    
    // Handle skipLogos flag for team resolution fallback
    if (teamA.skipLogos || teamB.skipLogos) {
        // Just draw the colored rectangle without team logos
        const centerX = width / 2;
        const centerY = height / 2;
        const availableWidth = width * 0.95;
        const badgeSize = availableWidth / 3;
        const thumbWidth = badgeSize * 3;
        const thumbHeight = badgeSize;
        const thumbX = centerX - (thumbWidth / 2);
        const thumbY = centerY - (thumbHeight / 2);
        
        // Draw shadow for entire rectangle first
        ctx.save();
        setShadow(ctx, 'logoDropStrong');
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(thumbX, thumbY, thumbWidth, thumbHeight);
        ctx.restore();
        
        // If colors are the same, just draw a single rectangle
        if (colorA === colorB) {
            ctx.fillStyle = colorA;
            ctx.fillRect(thumbX, thumbY, thumbWidth, thumbHeight);
        } else {
            // Diagonal split points
            const topDiagonalX = thumbX + (thumbWidth * 0.5825);
            const bottomDiagonalX = thumbX + (thumbWidth * 0.4175);
            
            // Left side (teamA)
            ctx.fillStyle = colorA;
            ctx.beginPath();
            ctx.moveTo(thumbX, thumbY);
            ctx.lineTo(topDiagonalX, thumbY);
            ctx.lineTo(bottomDiagonalX, thumbY + thumbHeight);
            ctx.lineTo(thumbX, thumbY + thumbHeight);
            ctx.closePath();
            ctx.fill();
            
            // Right side (teamB)
            ctx.fillStyle = colorB;
            ctx.beginPath();
            ctx.moveTo(topDiagonalX, thumbY);
            ctx.lineTo(thumbX + thumbWidth, thumbY);
            ctx.lineTo(thumbX + thumbWidth, thumbY + thumbHeight);
            ctx.lineTo(bottomDiagonalX, thumbY + thumbHeight);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw league logo in center if provided
        if (league && league.logoUrl) {
            try {
                const leagueLogoUrl = league.logoUrl || league.logoUrlAlt;
                const leagueLogo = await loadProcessedLogo(leagueLogoUrl, { svgSupport: true });
                
                const leagueLogoSize = badgeSize * 0.6;
                const leagueLogoX = centerX - (leagueLogoSize / 2);
                const leagueLogoY = centerY - (leagueLogoSize / 2);
                
                drawCenteredLogo(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, 'logoDropSoft');
            } catch (error) {
                logger.warn('Error loading league logo', { error: error.message });
            }
        }
        
        return canvas.toBuffer('image/png');
    }
    
    const teamALogoUrl = useLight ? teamA.logo : await selectBestLogo(teamA, colorA);
    const teamBLogoUrl = useLight ? teamB.logo : await selectBestLogo(teamB, colorB);
    
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    const logoA = await loadProcessedLogo(teamALogoUrl);
    
    const logoB = await loadProcessedLogo(teamBLogoUrl);
    
    // Calculate thumbnail dimensions (same size as style 6 badge area)
    const centerX = width / 2;
    const centerY = height / 2;
    const availableWidth = width * 0.95;
    const badgeSize = availableWidth / 3;
    
    // Use the same dimensions as style 6: 3 badges wide, 1 badge tall
    const thumbWidth = badgeSize * 3;
    const thumbHeight = badgeSize;
    
    const thumbX = centerX - (thumbWidth / 2);
    const thumbY = centerY - (thumbHeight / 2);
    
    // Draw shadow for entire rectangle first
    ctx.save();
    setShadow(ctx, 'logoDropStrong');
    ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent fill just for shadow
    ctx.fillRect(thumbX, thumbY, thumbWidth, thumbHeight);
    ctx.restore();
    
    // Diagonal split points (50% less horizontal than thumbnail style 1)
    const topDiagonalX = thumbX + (thumbWidth * 0.5825);
    const bottomDiagonalX = thumbX + (thumbWidth * 0.4175);
    
    // Left side (teamA) - no shadow
    ctx.fillStyle = colorA;
    ctx.beginPath();
    ctx.moveTo(thumbX, thumbY);
    ctx.lineTo(topDiagonalX, thumbY);
    ctx.lineTo(bottomDiagonalX, thumbY + thumbHeight);
    ctx.lineTo(thumbX, thumbY + thumbHeight);
    ctx.closePath();
    ctx.fill();
    
    // Right side (teamB) - no shadow
    ctx.fillStyle = colorB;
    ctx.beginPath();
    ctx.moveTo(topDiagonalX, thumbY);
    ctx.lineTo(thumbX + thumbWidth, thumbY);
    ctx.lineTo(thumbX + thumbWidth, thumbY + thumbHeight);
    ctx.lineTo(bottomDiagonalX, thumbY + thumbHeight);
    ctx.closePath();
    ctx.fill();
    
    // Draw logos (same size as style 6)
    const logoMaxSize = badgeSize * 0.8;
    
    // Team A logo (left side)
    const logoAX = thumbX + (thumbWidth * 0.2) - (logoMaxSize / 2);
    const logoAY = thumbY + (thumbHeight / 2) - (logoMaxSize / 2);
    drawLogoWithShadow(ctx, logoA, logoAX, logoAY, logoMaxSize);
    
    // Team B logo (right side)
    const logoBX = thumbX + (thumbWidth * 0.8) - (logoMaxSize / 2);
    const logoBY = thumbY + (thumbHeight / 2) - (logoMaxSize / 2);
    drawLogoWithShadow(ctx, logoB, logoBX, logoBY, logoMaxSize);
    
    // Draw league logo in center if provided
    if (league && league.logoUrl) {
        try {
            const leagueLogoUrl = league.logoUrl || league.logoUrlAlt;
            const leagueLogo = await loadProcessedLogo(leagueLogoUrl, { svgSupport: true });
            
            const leagueLogoSize = badgeSize * 0.6;
            const leagueLogoX = centerX - (leagueLogoSize / 2);
            const leagueLogoY = centerY - (leagueLogoSize / 2);
            
            drawCenteredLogo(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, 'logoDropSoft');
        } catch (error) {
            logger.warn('Error loading league logo', { error: error.message });
        }
    }
    
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 2: Side by Side
// ------------------------------------------------------------------------------

async function generateSideBySide(teamA, teamB, width, height, league, useLight) {
    // Create canvas with transparent background
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Select which logo to use (logoAlt by default, unless useLight is true)
    const teamALogoUrl = useLight ? teamA.logo : (teamA.logoAlt || teamA.logo);
    const teamBLogoUrl = useLight ? teamB.logo : (teamB.logoAlt || teamB.logo);
    
    // Load both logos
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    const logoA = await loadProcessedLogo(teamALogoUrl);
    
    const logoB = await loadProcessedLogo(teamBLogoUrl);
    
    // Calculate logo size (50% of canvas for each logo)
    const logoSize = Math.min(width, height) * 0.50;
    const spacing = width * 0.005; // 0.5% spacing between logos
    
    // Position logos side by side
    const logoAX = (width / 2) - logoSize - (spacing / 2);
    const logoAY = (height - logoSize) / 2;
    
    const logoBX = (width / 2) + (spacing / 2);
    const logoBY = (height - logoSize) / 2;
    
    // Draw teamA logo (left) with aspect ratio maintained
    drawCenteredLogo(ctx, logoA, logoAX, logoAY, logoSize, 'panel');

    // Draw teamB logo (right) with aspect ratio maintained
    drawCenteredLogo(ctx, logoB, logoBX, logoBY, logoSize, 'panel');
    
    // Draw league logo as a badge in the bottom center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            const leagueLogo = await loadProcessedLogo(league.logoUrl, { svgSupport: true });

            // League logo is smaller (15% of canvas size)
            const leagueLogoSize = Math.min(width, height) * 0.15;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = height - leagueLogoSize - (height * 0.05);

            // Never add outline to league logo, always use shadow
            drawCenteredLogo(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, 'logoDropStrong');
        } catch (error) {
            logger.warn('Error loading league logo', { error: error.message });
        }
    }
    
    // Return PNG buffer with transparency
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 3: Circle Badges
// ------------------------------------------------------------------------------

async function generateCircleBadges(teamA, teamB, width, height, league, useLight) {
    // Create canvas with transparent background
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Use adjustColors to ensure colors are distinguishable
    const { colorA, colorB } = adjustColors(teamA, teamB);
    
    // Select which logo to use based on background color contrast
    const teamALogoUrl = await selectBestLogo(teamA, colorA);
    const teamBLogoUrl = await selectBestLogo(teamB, colorB);
    
    // Load both logos
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    const logoA = await loadProcessedLogo(teamALogoUrl);
    
    const logoB = await loadProcessedLogo(teamBLogoUrl);
    
    // Calculate sizes - circles positioned closer together to avoid overflow
    const badgeSize = Math.min(width, height) * 0.35;
    const spacing = width * 0.05; // Reduced from 0.1 to bring circles closer
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Position for teamA (left)
    const badgeAX = centerX - spacing - badgeSize;
    const badgeAY = centerY - (badgeSize / 2);
    
    // Draw colored circle behind teamA logo with shadow
    ctx.save();
    setShadow(ctx, 'logoDropStrong');
    
    ctx.fillStyle = colorA;
    ctx.beginPath();
    ctx.arc(badgeAX + badgeSize / 2, badgeAY + badgeSize / 2, badgeSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw teamA logo (80% to fit within circle) with aspect ratio maintained
    const logoSize = badgeSize * 0.80;
    const logoContainerX = badgeAX + (badgeSize - logoSize) / 2;
    const logoContainerY = badgeAY + (badgeSize - logoSize) / 2;
    
    drawCenteredLogo(ctx, logoA, logoContainerX, logoContainerY, logoSize);
    
    // Position for teamB (right)
    const badgeBX = centerX + spacing;
    const badgeBY = centerY - (badgeSize / 2);
    
    // Draw colored circle behind teamB logo with shadow
    ctx.save();
    setShadow(ctx, 'logoDropStrong');
    
    ctx.fillStyle = colorB;
    ctx.beginPath();
    ctx.arc(badgeBX + badgeSize / 2, badgeBY + badgeSize / 2, badgeSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw teamB logo with aspect ratio maintained
    const logoContainerBX = badgeBX + (badgeSize - logoSize) / 2;
    const logoContainerBY = badgeBY + (badgeSize - logoSize) / 2;
    drawCenteredLogo(ctx, logoB, logoContainerBX, logoContainerBY, logoSize);
    
    // Draw league logo at bottom center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            const leagueLogo = await loadProcessedLogo(league.logoUrl, { svgSupport: true });

            // League logo size (20% of canvas)
            const leagueLogoSize = Math.min(width, height) * 0.2;
            const leagueLogoX = (width - leagueLogoSize) / 2;

            // Calculate bottom edge of circle badges
            const circleBottomY = badgeAY + badgeSize;
            // Position league logo to overlap the bottom line by 5% of its height
            const leagueLogoY = circleBottomY - (leagueLogoSize * 0.05);

            drawCenteredLogo(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, 'logoDropStrong');
        } catch (error) {
            logger.warn('Error loading league logo', { error: error.message });
        }
    }
    
    // Return PNG buffer with transparency
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 4: Square Badges
// ------------------------------------------------------------------------------

async function generateSquareBadges(teamA, teamB, width, height, league, useLight) {
    // Create canvas with transparent background
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Use adjustColors to ensure colors are distinguishable
    const { colorA, colorB } = adjustColors(teamA, teamB);
    
    // Select which logo to use based on adjusted team colors
    const teamALogoUrl = useLight ? teamA.logo : await selectBestLogo(teamA, colorA);
    const teamBLogoUrl = useLight ? teamB.logo : await selectBestLogo(teamB, colorB);
    
    // Load both logos
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    const logoA = await loadProcessedLogo(teamALogoUrl);
    
    const logoB = await loadProcessedLogo(teamBLogoUrl);
    
    // Calculate sizes - two squares that join in the middle to form a rectangle
    const badgeSize = Math.min(width, height) * 0.4;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Position for teamA square (left half of rectangle)
    const badgeAX = centerX - badgeSize;
    const badgeAY = centerY - (badgeSize / 2);
    // Position for teamB square (right half of rectangle)
    const badgeBX = centerX;
    const badgeBY = centerY - (badgeSize / 2);

    // Draw a single rectangle with drop shadow underneath both squares
    ctx.save();
    setShadow(ctx, 'logoDropStrong');
    ctx.fillStyle = '#ffffff'; // dummy color, will be covered
    ctx.fillRect(badgeAX, badgeAY, badgeSize * 2, badgeSize);
    ctx.restore();

    // Draw left square (teamA) without shadow
    ctx.fillStyle = colorA;
    ctx.fillRect(badgeAX, badgeAY, badgeSize, badgeSize);

    // Draw right square (teamB) without shadow
    ctx.fillStyle = colorB;
    ctx.fillRect(badgeBX, badgeBY, badgeSize, badgeSize);

    // Draw teamA logo with aspect ratio maintained
    const logoSize = badgeSize * 0.8;
    const logoContainerX = badgeAX + (badgeSize - logoSize) / 2;
    const logoContainerY = badgeAY + (badgeSize - logoSize) / 2;
    
    drawCenteredLogo(ctx, logoA, logoContainerX, logoContainerY, logoSize);

    // Draw teamB logo with aspect ratio maintained
    const logoContainerBX = badgeBX + (badgeSize - logoSize) / 2;
    const logoContainerBY = badgeBY + (badgeSize - logoSize) / 2;
    
    drawCenteredLogo(ctx, logoB, logoContainerBX, logoContainerBY, logoSize);
    
    // Draw league logo at bottom center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            const leagueLogo = await loadProcessedLogo(league.logoUrl, { svgSupport: true });

            // League logo size (20% of canvas)
            const leagueLogoSize = Math.min(width, height) * 0.2;
            const leagueLogoX = (width - leagueLogoSize) / 2;

            // Calculate bottom edge of square badges
            const squareBottomY = badgeAY + badgeSize;
            // Position league logo to overlap the bottom line by 25% of its height
            const leagueLogoY = squareBottomY - (leagueLogoSize * 0.25);

            drawCenteredLogo(ctx, leagueLogo, leagueLogoX, leagueLogoY, leagueLogoSize, 'logoDropStrong');
        } catch (error) {
            logger.warn('Error loading league logo', { error: error.message });
        }
    }
    
    // Return PNG buffer with transparency
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 5: Circle Badges with League (three circles)
// ------------------------------------------------------------------------------

async function generateCircleBadgesWithLeague(teamA, teamB, width, height, league, useLight) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const { colorA, colorB } = adjustColors(teamA, teamB);
    
    const teamALogoUrl = useLight ? teamA.logo : await selectBestLogo(teamA, colorA);
    const teamBLogoUrl = useLight ? teamB.logo : await selectBestLogo(teamB, colorB);
    
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    if (!league || !league.logoUrl) {
        throw new Error('League logo is required for style 5');
    }
    
    const logoA = await loadProcessedLogo(teamALogoUrl);
    
    const logoB = await loadProcessedLogo(teamBLogoUrl);
    
    // For white background, always prefer the default league logo
    // Only use alternate if default is not available
    const leagueLogoUrl = league.logoUrl || league.logoUrlAlt;
    if (!leagueLogoUrl) {
        throw new Error('League logo is required for style 5');
    }
    
    const leagueLogo = await loadProcessedLogo(leagueLogoUrl, { svgSupport: true });
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate badge size and circle radius
    // Start with 35% of canvas size for badge
    let badgeSize = Math.min(width, height) * 0.35;
    const circleRadius = badgeSize * 0.6;
    
    // Calculate spacing to allow up to 5% overlap
    // With 5% overlap: spacing = badgeSize - (badgeSize * 0.05)
    const maxOverlap = badgeSize * 0.05;
    const spacing = badgeSize - maxOverlap;
    
    // Calculate total width of all three circles
    const totalWidth = spacing * 2 + badgeSize;
    
    // Check if circles would extend beyond canvas edges
    const halfTotalWidth = totalWidth / 2;
    const leftEdge = centerX - halfTotalWidth;
    const rightEdge = centerX + halfTotalWidth;
    const leftCircleExtent = leftEdge - circleRadius;
    const rightCircleExtent = rightEdge + circleRadius;
    
    // If circles extend beyond edges, scale down
    if (leftCircleExtent < 0 || rightCircleExtent > width) {
        const availableWidth = width;
        const neededWidth = totalWidth + (circleRadius * 2);
        const scaleFactor = availableWidth / neededWidth;
        badgeSize = badgeSize * scaleFactor;
    }
    
    // Recalculate with final badge size
    const finalCircleRadius = badgeSize * 0.6;
    const finalSpacing = badgeSize - (badgeSize * 0.05);
    const finalTotalWidth = finalSpacing * 2 + badgeSize;
    const startX = centerX - (finalTotalWidth / 2);
    
    // Always use white background for league logo
    const leagueBgColor = '#ffffff';
    
    const badges = [
        { logo: leagueLogo, bgColor: leagueBgColor, x: startX },
        { logo: logoA, bgColor: colorA, x: startX + finalSpacing },
        { logo: logoB, bgColor: colorB, x: startX + finalSpacing * 2 }
    ];
    
    badges.forEach(badge => {
        const badgeX = badge.x;
        const badgeY = centerY - (badgeSize / 2);
        
        ctx.save();
        setShadow(ctx, 'logoDropStrong');
        
        ctx.fillStyle = badge.bgColor;
        ctx.beginPath();
        ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, finalCircleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        const logoMaxSize = badgeSize * 0.80;
        const logoContainerX = badgeX + (badgeSize - logoMaxSize) / 2;
        const logoContainerY = badgeY + (badgeSize - logoMaxSize) / 2;
        
        drawCenteredLogo(ctx, badge.logo, logoContainerX, logoContainerY, logoMaxSize);
    });
    
    return canvas.toBuffer('image/png');
}

// ------------------------------------------------------------------------------
// Style 6: Square Badges with League (three squares)
// ------------------------------------------------------------------------------

async function generateSquareBadgesWithLeague(teamA, teamB, width, height, league, useLight) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const { colorA, colorB } = adjustColors(teamA, teamB);
    
    const teamALogoUrl = useLight ? teamA.logo : await selectBestLogo(teamA, colorA);
    const teamBLogoUrl = useLight ? teamB.logo : await selectBestLogo(teamB, colorB);
    
    if (!teamA.logo || !teamB.logo) {
        throw new Error('Both teams must have logos');
    }
    
    if (!league || !league.logoUrl) {
        throw new Error('League logo is required for style 6');
    }
    
    const logoA = await loadProcessedLogo(teamALogoUrl);
    
    const logoB = await loadProcessedLogo(teamBLogoUrl);
    
    // For white background, always prefer the default league logo
    // Only use alternate if default is not available
    const leagueLogoUrl = league.logoUrl || league.logoUrlAlt;
    if (!leagueLogoUrl) {
        throw new Error('League logo is required for style 6');
    }
    
    const leagueLogo = await loadProcessedLogo(leagueLogoUrl, { svgSupport: true });
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate badge size to ensure all 3 fit with some padding
    const availableWidth = width * 0.95; // Use 95% of width to leave padding
    const badgeSize = availableWidth / 3;
    
    const totalWidth = badgeSize * 3;
    const startX = centerX - (totalWidth / 2);
    
    // Always use white background for league logo
    const leagueBgColor = '#ffffff';
    
    const badges = [
        { logo: leagueLogo, bgColor: leagueBgColor, x: startX },
        { logo: logoA, bgColor: colorA, x: startX + badgeSize },
        { logo: logoB, bgColor: colorB, x: startX + badgeSize * 2 }
    ];
    
    const badgeY = centerY - (badgeSize / 2);
    
    ctx.save();
    setShadow(ctx, 'logoDropStrong');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, badgeY, badgeSize * 3, badgeSize);
    ctx.restore();
    
    badges.forEach(badge => {
        ctx.fillStyle = badge.bgColor;
        ctx.fillRect(badge.x, badgeY, badgeSize, badgeSize);
        
        const logoMaxSize = badgeSize * 0.8;
        const logoContainerX = badge.x + (badgeSize - logoMaxSize) / 2;
        const logoContainerY = badgeY + (badgeSize - logoMaxSize) / 2;
        
        drawCenteredLogo(ctx, badge.logo, logoContainerX, logoContainerY, logoMaxSize);
    });
    
    return canvas.toBuffer('image/png');
}
