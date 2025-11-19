// ------------------------------------------------------------------------------
// logoGenerator.js
// This helper generates matchup logo images with team logos
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const { drawLogoWithShadow, downloadImage, selectBestLogo, adjustColors } = require('./imageUtils');

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
        const { trimImage } = require('./imageUtils');
        logoBuffer = await trimImage(logoBuffer);
    }
    
    return logoBuffer;
}

// ------------------------------------------------------------------------------
// Style 1: Diagonal Split
// ------------------------------------------------------------------------------

async function generateDiagonalSplit(teamA, teamB, width, height, league, useLight) {
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
    
    const logoABuffer = await downloadImage(teamALogoUrl);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamBLogoUrl);
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
    
    // Outlines disabled - always use shadow
    drawLogoWithShadow(ctx, logoA, logoX, logoY, logoSize);
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
    // Outlines disabled - always use shadow
    drawLogoWithShadow(ctx, logoB, logoX, logoY, logoSize);
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
    
    // Draw league logo as a badge in the bottom right corner if league logo URL is provided
    // This is drawn LAST so it appears on top
    if (league && league.logoUrl) {
        try {
            const leagueLogoBuffer = await downloadImage(league.logoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            // Save context for league logo
            ctx.save();
            
            // League logo is smaller as a badge (20% of canvas size)
            const leagueLogoSize = Math.min(width, height) * 0.2;
            const padding = Math.min(width, height) * 0.05; // 5% padding from edges
            const leagueLogoX = width - leagueLogoSize - padding;
            const leagueLogoY = height - leagueLogoSize - padding;
            
            // Never add outline to league logo, always use shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
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
    
    const logoABuffer = await downloadImage(teamALogoUrl);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamBLogoUrl);
    const logoB = await loadImage(logoBBuffer);
    
    // Calculate logo size (50% of canvas for each logo)
    const logoSize = Math.min(width, height) * 0.50;
    const spacing = width * 0.005; // 0.5% spacing between logos
    
    // Position logos side by side
    const logoAX = (width / 2) - logoSize - (spacing / 2);
    const logoAY = (height - logoSize) / 2;
    
    const logoBX = (width / 2) + (spacing / 2);
    const logoBY = (height - logoSize) / 2;
    
    // Draw teamA logo (left) - outlines disabled, always use shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(logoA, logoAX, logoAY, logoSize, logoSize);
    ctx.restore();
    
    // Draw teamB logo (right) - outlines disabled, always use shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(logoB, logoBX, logoBY, logoSize, logoSize);
    ctx.restore();
    
    // Draw league logo as a badge in the bottom center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            const leagueLogoBuffer = await downloadImage(league.logoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            ctx.save();
            
            // League logo is smaller (15% of canvas size)
            const leagueLogoSize = Math.min(width, height) * 0.15;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            const leagueLogoY = height - leagueLogoSize - (height * 0.05);
            
            // Never add outline to league logo, always use shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
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
            
            ctx.restore();
        } catch (error) {
            console.error('Error loading league logo:', error.message);
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
    
    const logoABuffer = await downloadImage(teamALogoUrl);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamBLogoUrl);
    const logoB = await loadImage(logoBBuffer);
    
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    ctx.fillStyle = colorA;
    ctx.beginPath();
    ctx.arc(badgeAX + badgeSize / 2, badgeAY + badgeSize / 2, badgeSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw teamA logo
    const logoSize = badgeSize * 0.95;
    const logoAX = badgeAX + (badgeSize - logoSize) / 2;
    const logoAY = badgeAY + (badgeSize - logoSize) / 2;
    
    ctx.drawImage(logoA, logoAX, logoAY, logoSize, logoSize);
    
    // Position for teamB (right)
    const badgeBX = centerX + spacing;
    const badgeBY = centerY - (badgeSize / 2);
    
    // Draw colored circle behind teamB logo with shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    ctx.fillStyle = colorB;
    ctx.beginPath();
    ctx.arc(badgeBX + badgeSize / 2, badgeBY + badgeSize / 2, badgeSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw teamB logo
    const logoBX = badgeBX + (badgeSize - logoSize) / 2;
    const logoBY = badgeBY + (badgeSize - logoSize) / 2;
    
    ctx.drawImage(logoB, logoBX, logoBY, logoSize, logoSize);
    
    // Draw league logo at bottom center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            const leagueLogoBuffer = await downloadImage(league.logoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            ctx.save();
            
            // League logo size (20% of canvas)
            const leagueLogoSize = Math.min(width, height) * 0.2;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            
            // Calculate bottom edge of circle badges
            const circleBottomY = badgeAY + badgeSize;
            // Position league logo to overlap the bottom line by 5% of its height
            const leagueLogoY = circleBottomY - (leagueLogoSize * 0.05);
            
            // Add shadow to league logo
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
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
            
            ctx.restore();
        } catch (error) {
            console.error('Error loading league logo:', error.message);
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
    
    const logoABuffer = await downloadImage(teamALogoUrl);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamBLogoUrl);
    const logoB = await loadImage(logoBBuffer);
    
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff'; // dummy color, will be covered
    ctx.fillRect(badgeAX, badgeAY, badgeSize * 2, badgeSize);
    ctx.restore();

    // Draw left square (teamA) without shadow
    ctx.fillStyle = colorA;
    ctx.fillRect(badgeAX, badgeAY, badgeSize, badgeSize);

    // Draw right square (teamB) without shadow
    ctx.fillStyle = colorB;
    ctx.fillRect(badgeBX, badgeBY, badgeSize, badgeSize);

    // Draw teamA logo
    const logoSize = badgeSize * 0.8;
    const logoAX = badgeAX + (badgeSize - logoSize) / 2;
    const logoAY = badgeAY + (badgeSize - logoSize) / 2;
    ctx.drawImage(logoA, logoAX, logoAY, logoSize, logoSize);

    // Draw teamB logo
    const logoBX = badgeBX + (badgeSize - logoSize) / 2;
    const logoBY = badgeBY + (badgeSize - logoSize) / 2;
    ctx.drawImage(logoB, logoBX, logoBY, logoSize, logoSize);
    
    // Draw league logo at bottom center if league logo URL is provided
    if (league && league.logoUrl) {
        try {
            const leagueLogoBuffer = await downloadImage(league.logoUrl);
            const leagueLogo = await loadImage(leagueLogoBuffer);
            
            ctx.save();
            
            // League logo size (20% of canvas)
            const leagueLogoSize = Math.min(width, height) * 0.2;
            const leagueLogoX = (width - leagueLogoSize) / 2;
            
            // Calculate bottom edge of square badges
            const squareBottomY = badgeAY + badgeSize;
            // Position league logo to overlap the bottom line by 25% of its height
            const leagueLogoY = squareBottomY - (leagueLogoSize * 0.25);
            
            // Add shadow to league logo
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            
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
            
            ctx.restore();
        } catch (error) {
            console.error('Error loading league logo:', error.message);
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
    
    const logoABuffer = await downloadImage(teamALogoUrl);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamBLogoUrl);
    const logoB = await loadImage(logoBBuffer);
    
    // For white background, always prefer the default league logo
    // Only use alternate if default is not available
    const leagueLogoUrl = league.logoUrl || league.logoUrlAlt;
    if (!leagueLogoUrl) {
        throw new Error('League logo is required for style 5');
    }
    
    const leagueLogoBuffer = await downloadImage(leagueLogoUrl);
    const leagueLogo = await loadImage(leagueLogoBuffer);
    
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
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        ctx.fillStyle = badge.bgColor;
        ctx.beginPath();
        ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, finalCircleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        const logoMaxSize = badgeSize * 0.95;
        const aspectRatio = badge.logo.width / badge.logo.height;
        let drawWidth, drawHeight;
        
        if (aspectRatio > 1) {
            drawWidth = logoMaxSize;
            drawHeight = logoMaxSize / aspectRatio;
        } else {
            drawHeight = logoMaxSize;
            drawWidth = logoMaxSize * aspectRatio;
        }
        
        const logoX = badgeX + (badgeSize - drawWidth) / 2;
        const logoY = badgeY + (badgeSize - drawHeight) / 2;
        
        ctx.drawImage(badge.logo, logoX, logoY, drawWidth, drawHeight);
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
    
    const logoABuffer = await downloadImage(teamALogoUrl);
    const logoA = await loadImage(logoABuffer);
    
    const logoBBuffer = await downloadImage(teamBLogoUrl);
    const logoB = await loadImage(logoBBuffer);
    
    // For white background, always prefer the default league logo
    // Only use alternate if default is not available
    const leagueLogoUrl = league.logoUrl || league.logoUrlAlt;
    if (!leagueLogoUrl) {
        throw new Error('League logo is required for style 6');
    }
    
    const leagueLogoBuffer = await downloadImage(leagueLogoUrl);
    const leagueLogo = await loadImage(leagueLogoBuffer);
    
    const badgeSize = Math.min(width, height) * 0.35;
    const centerX = width / 2;
    const centerY = height / 2;
    
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX, badgeY, badgeSize * 3, badgeSize);
    ctx.restore();
    
    badges.forEach(badge => {
        ctx.fillStyle = badge.bgColor;
        ctx.fillRect(badge.x, badgeY, badgeSize, badgeSize);
        
        const logoMaxSize = badgeSize * 0.8;
        const aspectRatio = badge.logo.width / badge.logo.height;
        let drawWidth, drawHeight;
        
        if (aspectRatio > 1) {
            drawWidth = logoMaxSize;
            drawHeight = logoMaxSize / aspectRatio;
        } else {
            drawHeight = logoMaxSize;
            drawWidth = logoMaxSize * aspectRatio;
        }
        
        const logoX = badge.x + (badgeSize - drawWidth) / 2;
        const logoY = badgeY + (badgeSize - drawHeight) / 2;
        
        ctx.drawImage(badge.logo, logoX, logoY, drawWidth, drawHeight);
    });
    
    return canvas.toBuffer('image/png');
}
