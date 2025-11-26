// ------------------------------------------------------------------------------
// leagueImageGenerator.js
// This helper generates league-themed images with gradient backgrounds
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const { downloadImage, drawLogoMaintainAspect } = require('./imageUtils');
const { extractDominantColors } = require('./colorExtractor');

module.exports = {
    generateLeagueThumb,
    generateLeagueCover
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
                console.warn('Failed to load alternate logo, using original:', altError.message);
                // Fall back to original logo
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
        console.error('Error generating league image:', error.message);
        
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
            console.error('Error loading league logo:', logoError.message);
        }
        
        return canvas.toBuffer('image/png');
    }
}

// ------------------------------------------------------------------------------

function blendColors(color1, color2) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Blend two colors with a weighted mix
 * @param {string} color1 - First hex color (base)
 * @param {string} color2 - Second hex color (tint)
 * @param {number} weight1 - Weight for first color (0-1, e.g., 0.85 = 85% base, 15% tint)
 * @returns {string} Blended hex color
 */
function blendColorsWeighted(color1, color2, weight1) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const weight2 = 1 - weight1;
    const r = Math.round(r1 * weight1 + r2 * weight2);
    const g = Math.round(g1 * weight1 + g2 * weight2);
    const b = Math.round(b1 * weight1 + b2 * weight2);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Calculate the distance between two colors
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Distance between colors (0-441)
 */
function calculateColorDistance(color1, color2) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    return Math.sqrt(
        Math.pow(r2 - r1, 2) +
        Math.pow(g2 - g1, 2) +
        Math.pow(b2 - b1, 2)
    );
}

/**
 * Analyze a color to determine if it's neutral and get its brightness
 * @param {string} hexColor - Hex color string
 * @returns {object} Object with isNeutral and brightness properties
 */
function analyzeColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate saturation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Calculate brightness (perceived luminance)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
    
    // Color is neutral if saturation is very low (grayscale)
    const isNeutral = saturation < 0.2;
    
    return { isNeutral, brightness, saturation };
}

/**
 * Adjust the vibrancy (saturation) of a color
 * @param {string} hexColor - Hex color string
 * @param {number} factor - Factor to adjust saturation by (0-1 reduces, >1 increases)
 * @returns {string} Adjusted hex color
 */
function adjustVibrancy(hexColor, factor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Convert to HSL to adjust saturation
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    
    let s = 0;
    if (max !== min) {
        s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    }
    
    // Adjust saturation
    s = Math.min(1, s * factor);
    
    // Convert back to RGB
    let newR, newG, newB;
    if (s === 0) {
        newR = newG = newB = l * 255;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        // Calculate hue
        const h = (() => {
            if (max === min) return 0;
            const d = max - min;
            if (max === r / 255) return ((g - b) / 255 / d + (g < b ? 6 : 0)) / 6;
            if (max === g / 255) return ((b - r) / 255 / d + 2) / 6;
            return ((r - g) / 255 / d + 4) / 6;
        })();
        
        newR = hue2rgb(p, q, h + 1/3) * 255;
        newG = hue2rgb(p, q, h) * 255;
        newB = hue2rgb(p, q, h - 1/3) * 255;
    }
    
    return '#' + [newR, newG, newB].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}
