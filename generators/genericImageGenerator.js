// ------------------------------------------------------------------------------
// genericImageGenerator.js
// This helper generates league and team-themed images with gradient backgrounds
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const { downloadImage, drawLogoMaintainAspect, hexToRgb } = require('../helpers/imageUtils');
const { extractDominantColors, blendColors, blendColorsWeighted, calculateColorDistance, analyzeColor, adjustVibrancy } = require('../helpers/colorUtils');
const logger = require('../helpers/logger');

module.exports = {
    generateLeagueThumb,
    generateLeagueCover,
    generateTeamThumb,
    generateTeamCover
};

// ------------------------------------------------------------------------------

async function generateLeagueThumb(leagueLogoUrl, options = {}) {
    const width = options.width || 1440;
    const height = options.height || 1080;
    const leagueLogoUrlAlt = options.leagueLogoUrlAlt;
    
    return generateLeagueImage(leagueLogoUrl, width, height, leagueLogoUrlAlt);
}

async function generateLeagueCover(leagueLogoUrl, options = {}) {
    const width = options.width || 1080;
    const height = options.height || 1440;
    const leagueLogoUrlAlt = options.leagueLogoUrlAlt;
    
    return generateLeagueImage(leagueLogoUrl, width, height, leagueLogoUrlAlt);
}

// ------------------------------------------------------------------------------

async function generateLeagueImage(leagueLogoUrl, width, height, leagueLogoUrlAlt) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    try {
        // Extract dominant colors from the league logo
        const colors = await extractDominantColors(leagueLogoUrl, 2);
        
        // Check if we have vibrant colors to incorporate
        const color1Info = analyzeColor(colors[0]);
        const color2Info = analyzeColor(colors[1]);
        
        // Base moody gradient
        let gradientColors = ['#1a1d2e', '#0f1419'];
        
        // If we have at least one vibrant color, tint the gradient with it
        if (!color1Info.isNeutral || !color2Info.isNeutral) {
            const vibrantColor = !color1Info.isNeutral ? colors[0] : colors[1];
            // Blend the vibrant color subtly into the dark gradient (10-15% influence)
            gradientColors[0] = blendColorsWeighted('#1a1d2e', vibrantColor, 0.85);
            gradientColors[1] = blendColorsWeighted('#0f1419', vibrantColor, 0.90);
        }
        
        // Create a soft radial gradient using the processed colors
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.max(width, height) * 0.8;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        
        // Inner color (lighter/more vibrant)
        gradient.addColorStop(0, gradientColors[0]);
        gradient.addColorStop(0.3, gradientColors[0]);
        
        // Blend zone
        gradient.addColorStop(0.6, blendColors(gradientColors[0], gradientColors[1]));
        
        // Outer color (darker/secondary)
        gradient.addColorStop(0.85, gradientColors[1]);
        gradient.addColorStop(1, gradientColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Load the league logo
        let finalLogoUrl = leagueLogoUrl;
        const logoBuffer = await downloadImage(leagueLogoUrl);
        const logo = await loadImage(logoBuffer);
        
        // Check if logo has poor contrast against the background
        // Extract colors from the logo to check against gradient colors
        const logoColors = await extractDominantColors(leagueLogoUrl, 1);
        const logoMainColor = logoColors[0];
        const backgroundAvgColor = blendColors(gradientColors[0], gradientColors[1]);
        
        // Calculate contrast ratio between logo and background
        const contrast = calculateColorDistance(logoMainColor, backgroundAvgColor);
        
        // If contrast is too low and we have an alternate logo, use it
        if (contrast < 100 && leagueLogoUrlAlt && leagueLogoUrlAlt !== leagueLogoUrl) {
            try {
                const altLogoBuffer = await downloadImage(leagueLogoUrlAlt);
                const altLogo = await loadImage(altLogoBuffer);
                finalLogoUrl = leagueLogoUrlAlt;
                
                // Logo takes up about 60% of the smaller dimension
                const logoSize = Math.min(width, height) * 0.6;
                const logoX = (width - logoSize) / 2;
                const logoY = (height - logoSize) / 2;
                
                // Add subtle shadow to the logo
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 10;
                
                drawLogoMaintainAspect(ctx, altLogo, logoX, logoY, logoSize);
                
                ctx.restore();
            } catch (altError) {
                // Fall back to original logo if alternate fails
                const logoSize = Math.min(width, height) * 0.6;
                const logoX = (width - logoSize) / 2;
                const logoY = (height - logoSize) / 2;
                
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 30;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 10;
                
                drawLogoMaintainAspect(ctx, logo, logoX, logoY, logoSize);
                
                ctx.restore();
            }
        } else {
            // Use original logo - contrast is good enough
            const logoSize = Math.min(width, height) * 0.6;
            const logoX = (width - logoSize) / 2;
            const logoY = (height - logoSize) / 2;
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;
            
            drawLogoMaintainAspect(ctx, logo, logoX, logoY, logoSize);
            
            ctx.restore();
        }
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        // Fallback: create a simple dark gradient if color extraction fails
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1d23');
        gradient.addColorStop(1, '#0f1114');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Try to at least draw the logo
        try {
            const logoBuffer = await downloadImage(leagueLogoUrl);
            const logo = await loadImage(logoBuffer);
            const logoSize = Math.min(width, height) * 0.6;
            const logoX = (width - logoSize) / 2;
            const logoY = (height - logoSize) / 2;
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;
            
            drawLogoMaintainAspect(ctx, logo, logoX, logoY, logoSize);
            ctx.restore();
        } catch (logoError) {
            logger.warn('Error loading league logo', { error: logoError.message });
        }
        
        return canvas.toBuffer('image/png');
    }
}

// ------------------------------------------------------------------------------
// Team Image Generation Functions
// ------------------------------------------------------------------------------

async function generateTeamThumb(teamLogoUrl, teamColor, teamAltColor, options = {}) {
    const width = options.width || 1440;
    const height = options.height || 1080;
    const teamLogoUrlAlt = options.teamLogoUrlAlt;
    
    return generateTeamImage(teamLogoUrl, teamColor, teamAltColor, width, height, teamLogoUrlAlt);
}

async function generateTeamCover(teamLogoUrl, teamColor, teamAltColor, options = {}) {
    const width = options.width || 1080;
    const height = options.height || 1440;
    const teamLogoUrlAlt = options.teamLogoUrlAlt;
    
    return generateTeamImage(teamLogoUrl, teamColor, teamAltColor, width, height, teamLogoUrlAlt);
}

async function generateTeamImage(teamLogoUrl, teamColor, teamAltColor, width, height, teamLogoUrlAlt) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    try {
        // Use team colors to create gradient
        const color1Info = analyzeColor(teamColor);
        const color2Info = analyzeColor(teamAltColor);
        
        // Base moody gradient (fallback if no vibrant colors)
        let gradientColors = ['#1a1d2e', '#0f1419'];
        
        // If we have vibrant team colors, blend them with black for moodiness
        if (!color1Info.isNeutral || !color2Info.isNeutral) {
            // Use both colors if both are vibrant, otherwise use the vibrant one
            const vibrantColor1 = !color1Info.isNeutral ? teamColor : teamAltColor;
            const vibrantColor2 = (!color1Info.isNeutral && !color2Info.isNeutral) ? teamAltColor : vibrantColor1;
            
            // Darken the team colors and blend with black for moody gradient
            const darkenedColor1 = adjustVibrancy(vibrantColor1, 0.4);  // Darken to 40% vibrancy
            const darkenedColor2 = adjustVibrancy(vibrantColor2, 0.3);  // Darken to 30% vibrancy
            
            // Blend with black to maintain moodiness (70% black, 30% team color)
            gradientColors[0] = blendColorsWeighted('#000000', darkenedColor1, 0.70);
            gradientColors[1] = blendColorsWeighted('#000000', darkenedColor2, 0.80);  // More black at edges
        }
        
        // Create a soft radial gradient using the processed colors
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.max(width, height) * 0.8;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        
        // Inner color (lighter/more vibrant)
        gradient.addColorStop(0, gradientColors[0]);
        gradient.addColorStop(0.3, gradientColors[0]);
        
        // Blend zone
        gradient.addColorStop(0.6, blendColors(gradientColors[0], gradientColors[1]));
        
        // Outer color (darker/secondary)
        gradient.addColorStop(0.85, gradientColors[1]);
        gradient.addColorStop(1, gradientColors[1]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Calculate average gradient brightness for contrast checking
        const avgGradientBrightness = (
            getColorBrightness(hexToRgb(gradientColors[0])) + 
            getColorBrightness(hexToRgb(gradientColors[1]))
        ) / 2;
        
        // Load and check team logo contrast
        let finalLogoUrl = teamLogoUrl;
        let logoToUse = null;
        
        // Try alternative logo if available and primary has poor contrast
        if (teamLogoUrlAlt) {
            try {
                const primaryLogoBrightness = await estimateLogoBrightness(teamLogoUrl);
                const contrastWithPrimary = Math.abs(avgGradientBrightness - primaryLogoBrightness);
                
                // If primary logo has poor contrast, try the alternative
                if (contrastWithPrimary < 80) {
                    const altLogoBrightness = await estimateLogoBrightness(teamLogoUrlAlt);
                    const contrastWithAlt = Math.abs(avgGradientBrightness - altLogoBrightness);
                    
                    // Use alt logo if it has better contrast
                    if (contrastWithAlt > contrastWithPrimary) {
                        finalLogoUrl = teamLogoUrlAlt;
                    }
                }
            } catch (err) {
                // If brightness estimation fails, use primary logo
            }
        }
        
        // Download and load the chosen logo
        const teamLogoBuffer = await downloadImage(finalLogoUrl);
        logoToUse = await loadImage(teamLogoBuffer);
        
        // Draw the team logo
        const logoSize = Math.min(width, height) * 0.6;
        const logoX = (width - logoSize) / 2;
        const logoY = (height - logoSize) / 2;
        
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        
        drawLogoMaintainAspect(ctx, logoToUse, logoX, logoY, logoSize);
        
        ctx.restore();
        
        return canvas.toBuffer('image/png');
        
    } catch (error) {
        throw new Error(`Failed to generate team image: ${error.message}`);
    }
}

// Helper function to estimate logo brightness from colors
async function estimateLogoBrightness(logoUrl) {
    try {
        const colors = await extractDominantColors(logoUrl, 3);
        const brightnesses = colors.map(c => getColorBrightness(hexToRgb(c)));
        return brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
    } catch {
        return 128; // Default middle brightness
    }
}

function getColorBrightness(rgb) {
    if (!rgb) return 128;
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}
