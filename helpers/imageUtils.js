// ------------------------------------------------------------------------------
// imageUtils.js
// Shared utilities for image manipulation and logo processing
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('./logger');
const { rgbToHex: colorUtilsRgbToHex, calculateColorDistance } = require('./colorUtils');

// ------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------

const OUTLINE_WIDTH_PERCENTAGE = 0.015; // 1.5% of logo size for outline
const MAX_CACHE_SIZE = 50; // Maximum number of cached white logos
const EDGE_BRIGHTNESS_THRESHOLD = 200; // Average edge brightness above this means logo likely has white/light outline
const COLOR_SIMILARITY_THRESHOLD = 120; // Colors closer than this need special handling

// Valid badge keywords for overlay text
const VALID_BADGE_KEYWORDS = [
    // Quality indicators
    '4K', 'HD', 'FHD', 'UHD',
    // Alternate Feed indicator
    'ALT', 'MANNINGCAST', 'PRIMEVISION', 
    'PEYTONCAST', 'PEYTON AND ELI',
    // Event indicators
    'PLAYOFFS', 'PRESEASON',
    // Language indicators
    'EN', 'ENG', 'ENGLISH',
    'ES', 'ESP', 'SPANISH',
    'FR', 'FRE', 'FRENCH',
    'DE', 'GER', 'GERMAN',
    'IT', 'ITA', 'ITALIAN',
    // Network indicators
    'NBC', 'ESPN', 'FOX', 'CBS',
    'ABC', 'NFLN', 'MLBN', 'NBA TV',
    'CW', 'PEACOCK'
];

// Helper function to validate badge keywords
function isValidBadge(badge) {
    // Reject empty or whitespace-only strings
    if (!badge || badge.trim() === '') {
        return false;
    }
    
    return  (process.env.ALLOW_CUSTOM_BADGES && process.env.ALLOW_CUSTOM_BADGES.trim().toLowerCase() === 'true') ||
            VALID_BADGE_KEYWORDS.includes(badge.toUpperCase());
}

// ------------------------------------------------------------------------------
// Cache
// ------------------------------------------------------------------------------

// Get cache settings from environment
const CACHE_HOURS = parseInt(process.env.IMAGE_CACHE_HOURS || '24', 10);
const CACHE_ENABLED = CACHE_HOURS > 0;

// Cache for white logo versions to avoid recreating them
const whiteLogoCache = new Map();

// Cache for greyscale logo versions
const greyscaleLogoCache = new Map();

// Cache for badge overlays (keyed by text+scale+dimensions)
const badgeCache = new Map();

// Cache directory for trimmed logos
const TRIMMED_CACHE_DIR = path.join(__dirname, '..', '.cache', 'trimmed');
if (!fsSync.existsSync(TRIMMED_CACHE_DIR)) {
    fsSync.mkdirSync(TRIMMED_CACHE_DIR, { recursive: true });
} else if (CACHE_ENABLED) {
    // Clear trimmed cache on startup
    const files = fsSync.readdirSync(TRIMMED_CACHE_DIR);
    files.forEach(file => {
        fsSync.unlinkSync(path.join(TRIMMED_CACHE_DIR, file));
    });
    if (files.length > 0) {
        logger.info(`Cleared ${files.length} cached trimmed logo(s) from previous session`);
    }
}

// ------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------

module.exports = {
    // Drawing functions
    drawLogoWithShadow,
    drawLogoWithOutline,
    drawLogoMaintainAspect,
    hasLightOutline,

    // Image utilities
    downloadImage,
    selectBestLogo,
    trimImage,
    loadTrimmedLogo,
    convertToGreyscale,
    generateFallbackTeamObject,
    resolveTeamsWithFallback,
    handleTeamNotFoundError,
    addBadgeOverlay,
    isValidBadge,

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

function drawLogoWithShadow(ctx, logoImage, x, y, maxSize) {
    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = logoImage.width / logoImage.height;
    let drawWidth, drawHeight;
    
    if (aspectRatio > 1) {
        // Wider than tall
        drawWidth = maxSize;
        drawHeight = maxSize / aspectRatio;
    } else {
        // Taller than wide or square
        drawHeight = maxSize;
        drawWidth = maxSize * aspectRatio;
    }
    
    // Center the logo in the available space
    const drawX = x + (maxSize - drawWidth) / 2;
    const drawY = y + (maxSize - drawHeight) / 2;
    
    // Add drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawLogoMaintainAspect(ctx, logoImage, x, y, maxSize) {
    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = logoImage.width / logoImage.height;
    let drawWidth, drawHeight;
    
    if (aspectRatio > 1) {
        // Wider than tall
        drawWidth = maxSize;
        drawHeight = maxSize / aspectRatio;
    } else {
        // Taller than wide or square
        drawHeight = maxSize;
        drawWidth = maxSize * aspectRatio;
    }
    
    // Center the logo in the available space
    const drawX = x + (maxSize - drawWidth) / 2;
    const drawY = y + (maxSize - drawHeight) / 2;
    
    // Add drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    ctx.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);

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
        logger.warn('Error checking logo outline', { error: error.message });
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

    // Cache it (limit cache size to prevent memory leaks)
    if (whiteLogoCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest 20% of entries when limit reached
        const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
        const keys = Array.from(whiteLogoCache.keys());
        for (let i = 0; i < entriesToRemove; i++) {
            whiteLogoCache.delete(keys[i]);
        }
    }
    whiteLogoCache.set(cacheKey, tempCanvas);

    return tempCanvas;
}

/**
 * Convert a logo to greyscale with reduced opacity
 * @param {Image|Buffer} logoImageOrBuffer - Logo image or buffer to convert
 * @param {number} opacity - Opacity level (0-1), default 0.35 for 35%
 * @returns {Promise<Canvas>} Canvas with greyscale, semi-transparent logo
 */
async function convertToGreyscale(logoImageOrBuffer, opacity = 0.35) {
    // Generate cache key
    let cacheKey;
    if (logoImageOrBuffer.src) {
        cacheKey = `${logoImageOrBuffer.src}_${opacity}`;
    } else if (Buffer.isBuffer(logoImageOrBuffer)) {
        const hash = crypto.createHash('md5').update(logoImageOrBuffer).digest('hex');
        cacheKey = `${hash}_${opacity}`;
    } else {
        // For canvas or other image objects, generate hash from pixel data
        const tempCanvas = createCanvas(logoImageOrBuffer.width, logoImageOrBuffer.height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(logoImageOrBuffer, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, logoImageOrBuffer.width, logoImageOrBuffer.height);
        const hash = crypto.createHash('md5').update(Buffer.from(imageData.data.buffer)).digest('hex');
        cacheKey = `${hash}_${opacity}`;
    }

    // Check cache
    if (greyscaleLogoCache.has(cacheKey)) {
        return greyscaleLogoCache.get(cacheKey);
    }

    // Load the image if it's a buffer
    let logoImage = logoImageOrBuffer;
    if (Buffer.isBuffer(logoImageOrBuffer)) {
        logoImage = await loadImage(logoImageOrBuffer);
    }

    // Create canvas with greyscale version
    const canvas = createCanvas(logoImage.width, logoImage.height);
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(logoImage, 0, 0);

    // Get image data and convert to greyscale
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        // Calculate greyscale value using luminance formula
        const grey = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        data[i] = grey;     // R
        data[i + 1] = grey; // G
        data[i + 2] = grey; // B
        
        // Apply opacity to alpha channel
        data[i + 3] = data[i + 3] * opacity;
    }

    ctx.putImageData(imageData, 0, 0);

    // Cache the result (with size limit)
    if (greyscaleLogoCache.size >= MAX_CACHE_SIZE) {
        const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
        const keys = Array.from(greyscaleLogoCache.keys());
        for (let i = 0; i < entriesToRemove; i++) {
            greyscaleLogoCache.delete(keys[i]);
        }
    }
    greyscaleLogoCache.set(cacheKey, canvas);

    return canvas;
}

/**
 * Handle TeamNotFoundError with optional fallback behavior
 * @param {Error} error - The error thrown during team resolution
 * @param {boolean} enableFallback - Whether fallback is enabled
 * @param {Function} fallbackFn - Function to call if fallback is enabled
 * @returns {Promise<any>} Result from fallback function or rethrows error
 */
async function handleTeamNotFoundError(error, enableFallback, fallbackFn) {
    if (enableFallback && error.name === 'TeamNotFoundError') {
        return await fallbackFn();
    }
    throw error;
}

/**
 * Generate a fallback team object using greyscale league logo
 * This can be used in matchup generation when a team is not found
 * The logo will be processed to be greyscale with reduced opacity
 * @param {string} leagueLogoUrl - URL of the league logo
 * @param {string} teamName - Name for the fallback team (e.g., "Unknown Team")
 * @returns {Promise<Object>} Team object compatible with generators
 */
async function generateFallbackTeamObject(leagueLogoUrl, teamName = 'Unknown Team') {
    try {
        // Download and process the league logo to greyscale
        const logoBuffer = await downloadImage(leagueLogoUrl);
        
        // Validate the buffer before processing
        if (!logoBuffer || !Buffer.isBuffer(logoBuffer) || logoBuffer.length === 0) {
            throw new Error('Invalid or empty image buffer received');
        }
        
        const trimmedLogoBuffer = await trimImage(logoBuffer, leagueLogoUrl);
        const logo = await loadImage(trimmedLogoBuffer);
        
        // Convert to greyscale (we'll store as buffer for reuse)
        const greyscaleLogo = await convertToGreyscale(logo, 0.35);
        const greyscaleBuffer = greyscaleLogo.toBuffer('image/png');
        
        // Create a temporary file path or data URL for the greyscale logo
        // For simplicity, we'll use a base64 data URL
        const base64Logo = `data:image/png;base64,${greyscaleBuffer.toString('base64')}`;
        
        return {
            name: teamName,
            logo: base64Logo,
            logoAlt: base64Logo,
            color: '#d3d3d3',  // Light grey
            alternateColor: '#b8b8b8',  // Slightly darker grey
            isFallback: true  // Mark this as a fallback team
        };
    } catch (error) {
        // If league logo processing fails, use minimal text-based ultimate fallback
        logger.warn('Failed to generate fallback with league logo, using text fallback', {
            teamName,
            leagueLogoUrl,
            error: error.message
        });
        
        // Generate minimal text-based logo: single bold letter on transparent background
        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');
        
        // Transparent background (no fill)
        
        // Draw single letter (first character of team name)
        const letter = teamName.charAt(0).toUpperCase();
        ctx.fillStyle = '#999999';
        ctx.font = 'bold 280px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, 200, 200);
        
        const fallbackBuffer = canvas.toBuffer('image/png');
        const base64Logo = `data:image/png;base64,${fallbackBuffer.toString('base64')}`;
        
        return {
            name: teamName,
            logo: base64Logo,
            logoAlt: base64Logo,
            color: '#d3d3d3',
            alternateColor: '#b8b8b8',
            isFallback: true
        };
    }
}

/**
 * Helper to resolve a single team with all fallback options
 */
async function resolveSingleTeamWithFallback(providerManager, leagueObj, teamIdentifier, enableFallback) {
    try {
        // Suppress logging on initial attempt - we'll log when we have a final usable team
        let resolvedTeam = await providerManager.resolveTeam(leagueObj, teamIdentifier, new Set(), null, true);
        
        // Check if team was found but has no logo - try other providers in parallel
        if (!resolvedTeam.logo && !resolvedTeam.logoAlt) {
            const providers = providerManager.getProvidersForLeague(leagueObj);
            const providerPromises = providers.map(provider => 
                provider.resolveTeam(leagueObj, teamIdentifier)
                    .then(team => ({ provider, team }))
                    .catch(() => null)
            );
            
            const results = await Promise.all(providerPromises);
            const teamWithLogo = results.find(result => 
                result && result.team && (result.team.logo || result.team.logoAlt)
            );
            
            if (teamWithLogo) {
                logger.teamResolved(
                    teamWithLogo.provider.getProviderId(),
                    leagueObj.shortName,
                    teamWithLogo.team.fullName || teamWithLogo.team.name
                );
                return { team: teamWithLogo.team, failed: false };
            }
            
            // Try feeder leagues in parallel
            if (leagueObj.feederLeagues && leagueObj.feederLeagues.length > 0) {
                const { findLeague } = require('../leagues');
                const feederPromises = leagueObj.feederLeagues.map(async (feederLeagueKey) => {
                    const feederLeague = findLeague(feederLeagueKey);
                    if (!feederLeague) return null;
                    try {
                        const feederTeam = await providerManager.resolveTeam(feederLeague, teamIdentifier, new Set(), null, true);
                        if (feederTeam && (feederTeam.logo || feederTeam.logoAlt)) {
                            return { team: feederTeam, league: feederLeagueKey, leagueObj: feederLeague };
                        }
                    } catch (err) {
                        return null;
                    }
                    return null;
                });
                
                const feederResults = await Promise.all(feederPromises);
                const feederMatch = feederResults.find(result => result !== null);
                
                if (feederMatch) {
                    // Get the provider that was used
                    const providers = providerManager.getProvidersForLeague(feederMatch.leagueObj);
                    const providerId = providers[0]?.getProviderId() || 'unknown';
                    logger.teamResolved(providerId, feederMatch.league, feederMatch.team.fullName || feederMatch.team.name);
                    return { team: feederMatch.team, failed: false };
                }
            }
            
            // Try fallback league (for NCAA sports that fall back to basketball roster)
            if (leagueObj.fallbackLeague) {
                const { findLeague } = require('../leagues');
                const fallbackLeague = findLeague(leagueObj.fallbackLeague);
                if (fallbackLeague) {
                    try {
                        // Get providers and try to resolve in fallback league
                        const providers = providerManager.getProvidersForLeague(fallbackLeague);
                        for (const provider of providers) {
                            try {
                                const fallbackTeam = await provider.resolveTeam(fallbackLeague, teamIdentifier);
                                if (fallbackTeam && (fallbackTeam.logo || fallbackTeam.logoAlt)) {
                                    // Log with fallback flag
                                    logger.teamResolved(
                                        provider.getProviderId(), 
                                        fallbackLeague.shortName, 
                                        fallbackTeam.fullName || fallbackTeam.name,
                                        true // isFallback
                                    );
                                    return { team: fallbackTeam, failed: false };
                                }
                            } catch (err) {
                                // Try next provider
                            }
                        }
                    } catch (err) {
                        // Fallback league also failed, continue to greyscale
                    }
                }
            }
            
            logger.teamNotFound(teamIdentifier, leagueObj.shortName.toUpperCase());
            return { team: null, failed: true };
        }
        
        // Team was found with logo in original league - log it
        const { isCustomTeam } = require('./teamUtils');
        const leagueKey = leagueObj.shortName?.toLowerCase() || leagueObj.name?.toLowerCase();
        const teamKey = teamIdentifier.toLowerCase();
        const isCustom = isCustomTeam(leagueKey, teamKey);
        
        const providers = providerManager.getProvidersForLeague(leagueObj);
        const providerId = isCustom ? 'custom' : (providers[0]?.getProviderId() || 'unknown');
        logger.teamResolved(providerId, leagueObj.shortName, resolvedTeam.fullName || resolvedTeam.name);
        return { team: resolvedTeam, failed: false };
    } catch (error) {
        if (enableFallback && error.name === 'TeamNotFoundError') {
            logger.teamNotFound(teamIdentifier, leagueObj.shortName.toUpperCase());
            return { team: null, failed: true };
        }
        throw error;
    }
}

/**
 * Resolve both teams with fallback support for matchup generation
 * @param {Object} providerManager - The provider manager instance
 * @param {Object} leagueObj - League object
 * @param {string} team1Identifier - First team identifier
 * @param {string} team2Identifier - Second team identifier
 * @param {boolean} enableFallback - Whether to use fallback for missing teams
 * @param {string} leagueLogoUrl - League logo URL for fallback
 * @returns {Promise<{team1: Object, team2: Object, useLeagueLogoOnly?: boolean}>}
 */
async function resolveTeamsWithFallback(providerManager, leagueObj, team1Identifier, team2Identifier, enableFallback, leagueLogoUrl) {
    // Resolve both teams in parallel
    const [result1, result2] = await Promise.all([
        resolveSingleTeamWithFallback(providerManager, leagueObj, team1Identifier, enableFallback),
        resolveSingleTeamWithFallback(providerManager, leagueObj, team2Identifier, enableFallback)
    ]);
    
    let resolvedTeam1 = result1.team;
    let resolvedTeam2 = result2.team;
    
    // Special handling for Olympics: if any team fails, just return league logo
    const isOlympics = leagueObj.shortName?.toLowerCase() === 'olympics';
    if (isOlympics && (result1.failed || result2.failed)) {
        return {
            team1: null,
            team2: null,
            useLeagueLogoOnly: true
        };
    }
    
    // If both teams failed and need the same league logo, download and process it once
    if (result1.failed && result2.failed) {
        try {
            // Download and process the league logo once
            const logoBuffer = await downloadImage(leagueLogoUrl);
            if (!logoBuffer || !Buffer.isBuffer(logoBuffer) || logoBuffer.length === 0) {
                throw new Error('Invalid or empty image buffer received');
            }
            
            const trimmedLogoBuffer = await trimImage(logoBuffer, leagueLogoUrl);
            const logo = await loadImage(trimmedLogoBuffer);
            const greyscaleLogo = await convertToGreyscale(logo, 0.35);
            const greyscaleBuffer = greyscaleLogo.toBuffer('image/png');
            const base64Logo = `data:image/png;base64,${greyscaleBuffer.toString('base64')}`;
            
            // Reuse the processed logo for both teams
            resolvedTeam1 = {
                name: team1Identifier,
                logo: base64Logo,
                logoAlt: base64Logo,
                color: '#d3d3d3',
                alternateColor: '#b8b8b8',
                isFallback: true
            };
            resolvedTeam2 = {
                name: team2Identifier,
                logo: base64Logo,
                logoAlt: base64Logo,
                color: '#d3d3d3',
                alternateColor: '#b8b8b8',
                isFallback: true
            };
        } catch (error) {
            logger.warn('Failed to generate fallback with league logo', {
                leagueLogoUrl,
                error: error.message
            });
            throw error;
        }
    } else if (result1.failed || result2.failed) {
        // Generate fallbacks individually for any failed teams
        const fallbackPromises = [];
        if (result1.failed) {
            fallbackPromises.push(generateFallbackTeamObject(leagueLogoUrl, team1Identifier));
        } else {
            fallbackPromises.push(Promise.resolve(resolvedTeam1));
        }
        if (result2.failed) {
            fallbackPromises.push(generateFallbackTeamObject(leagueLogoUrl, team2Identifier));
        } else {
            fallbackPromises.push(Promise.resolve(resolvedTeam2));
        }
        [resolvedTeam1, resolvedTeam2] = await Promise.all(fallbackPromises);
    }
    
    return {
        team1: resolvedTeam1,
        team2: resolvedTeam2
    };
}

// ------------------------------------------------------------------------------
// Image utilities
// ------------------------------------------------------------------------------

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10); // 10 seconds default

async function downloadImage(urlOrPath) {
    // Validate URL exists
    if (!urlOrPath || typeof urlOrPath !== 'string') {
        throw new Error(`Invalid URL or path: ${urlOrPath}`);
    }
    
    // If it's a local file path, load from filesystem
    if (urlOrPath.startsWith('/') || urlOrPath.startsWith('./') || urlOrPath.startsWith('../')) {
        return fs.readFile(path.resolve(urlOrPath));
    }
    
    // Otherwise, treat as URL with timeout protection
    try {
        const response = await axios.get(urlOrPath, {
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 5,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/png,image/jpeg,image/jpg,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.espn.com/'
            }
        });
        
        const buffer = Buffer.from(response.data);
        
        // Validate image format by checking magic bytes
        if (buffer.length < 4) {
            throw new Error('Image buffer too small to be valid');
        }
        
        // Check for common image formats (PNG, JPEG, GIF, WebP)
        const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
        const isWebP = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
        const isSVG = buffer.toString('utf8', 0, Math.min(1000, buffer.length)).includes('<svg');
        
        if (!isPNG && !isJPEG && !isGIF && !isWebP && !isSVG) {
            // Check if it looks like HTML (404 page, etc.)
            const preview = buffer.toString('utf8', 0, Math.min(200, buffer.length));
            if (preview.includes('<!DOCTYPE') || preview.includes('<html')) {
                throw new Error(`URL returned HTML instead of image: ${urlOrPath}`);
            }
            throw new Error(`Unsupported image format for URL: ${urlOrPath}`);
        }
        
        // SVG is not supported by node-canvas, reject it
        if (isSVG) {
            throw new Error(`SVG format not supported by canvas: ${urlOrPath}`);
        }
        
        return buffer;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms: ${urlOrPath}`);
        }
        // For 404 errors on ESPN athlete headshots, this is expected (many athletes don't have photos)
        // Only log in development mode to reduce noise
        // Silently fail for missing athlete headshots (404s are expected)
        const isAthleteHeadshot = urlOrPath.includes('espncdn.com/i/headshots/');
        const is404 = error.response?.status === 404;
        
        if (!isAthleteHeadshot || !is404) {
            // Log non-404 errors or non-athlete image errors
            logger.warn('Failed to download image', {
                url: urlOrPath,
                status: error.response?.status,
                statusText: error.response?.statusText,
                error: error.message
            });
        }
        throw error;
    }
}

async function selectBestLogo(team, backgroundColor) {
    try {
        // Validate that we have a primary logo
        if (!team.logo) {
            throw new Error('No logo available for team');
        }
        
        // If no logoAlt, use the primary logo
        if (!team.logoAlt) {
            return team.logo;
        }

        // Check if this is an athlete (headshot + flag scenario)
        const isAthlete = team.logo.includes('espncdn.com/i/headshots/');
        
        // Try to load primary logo first
        let primaryBuffer, primaryImage;
        try {
            primaryBuffer = await downloadImage(team.logo);
            primaryImage = await loadImage(primaryBuffer);
            
            // For athletes, always prefer headshot if it loads successfully
            if (isAthlete) {
                return team.logo;
            }
        } catch (error) {
            // Primary logo failed (e.g., 404 for athlete headshot), use logoAlt instead
            return team.logoAlt;
        }

        // For non-athletes (teams), try to load alternate logo and choose based on contrast
        let altBuffer, altImage;
        try {
            altBuffer = await downloadImage(team.logoAlt);
            altImage = await loadImage(altBuffer);
        } catch (error) {
            // Alt logo failed, use primary
            return team.logo;
        }

        // Both logos loaded successfully, calculate color distances
        const primaryAvgColor = getAverageColor(primaryImage);
        const primaryHex = rgbToHex(primaryAvgColor);
        const primaryDistance = colorDistance(primaryHex, backgroundColor);

        const altAvgColor = getAverageColor(altImage);
        const altHex = rgbToHex(altAvgColor);
        const altDistance = colorDistance(altHex, backgroundColor);

        // Check if background is dark (closer to black than white)
        const bgRgb = hexToRgb(backgroundColor);
        const bgBrightness = bgRgb ? (bgRgb.r + bgRgb.g + bgRgb.b) / 3 : 128;
        const isDarkBackground = bgBrightness < 128;

        // For dark backgrounds, prefer logoAlt (ESPN's alt logos are designed for dark backgrounds)
        // unless primary logo has significantly better contrast
        if (isDarkBackground) {
            // Use logoAlt unless primary is MUCH better (50+ points better contrast)
            if (altDistance > primaryDistance - 50) {
                return team.logoAlt;
            }
        } else {
            // For light backgrounds, use the original logic
            // If primary logo is a bad fit, use logoAlt instead
            if (primaryDistance < COLOR_SIMILARITY_THRESHOLD && altDistance > primaryDistance) {
                return team.logoAlt;
            }
        }

        // Otherwise use primary logo
        return team.logo;
    } catch (error) {
        logger.warn('Error selecting best logo', { error: error.message, team: team.name });
        // Fallback to primary logo on error
        return team.logo;
    }
}

/**
 * Load a team logo with automatic selection, downloading, and trimming
 * This is the recommended way to load logos as it handles all processing in one step
 * @param {Object} team - Team object with logo and logoAlt properties
 * @param {string} backgroundColor - Background color for contrast checking
 * @returns {Promise<Image>} Loaded and trimmed logo image ready to use
 */
async function loadTrimmedLogo(team, backgroundColor) {
    try {
        // Select best logo based on contrast (handles fallback to logoAlt automatically)
        const logoUrl = await selectBestLogo(team, backgroundColor);
        
        // Download and trim the logo (with URL as cache key)
        let logoBuffer = await downloadImage(logoUrl);
        logoBuffer = await trimImage(logoBuffer, logoUrl);
        
        // Load and return the image
        return await loadImage(logoBuffer);
    } catch (error) {
        logger.warn('Error loading trimmed logo', { 
            team: team.name, 
            error: error.message 
        });
        throw error;
    }
}

function trimImage(imageBuffer, enableCache = true) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate input
            if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
                reject(new Error('Invalid image buffer provided to trimImage'));
                return;
            }
            
            // Only cache if caching is enabled and explicitly requested
            // Pass false/null to skip caching for final composed outputs
            const shouldCache = CACHE_ENABLED && enableCache;
            
            // Check cache if we should cache
            // Use hash of original image buffer as cache key to detect if source changed
            if (shouldCache) {
                const sourceHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
                const cachedPath = path.join(TRIMMED_CACHE_DIR, `${sourceHash}.png`);
                
                try {
                    const cachedBuffer = await fs.readFile(cachedPath);
                    resolve(cachedBuffer);
                    return;
                } catch (err) {
                    // Cache miss, continue with trimming
                }
            }
            
            // Load the image from buffer
            const image = await loadImage(imageBuffer);
            
            // Create temporary canvas to analyze the image
            const tempCanvas = createCanvas(image.width, image.height);
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(image, 0, 0);
            
            const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
            const data = imageData.data;
            
            // Find the bounds of non-transparent pixels
            let minX = image.width, maxX = 0;
            let minY = image.height, maxY = 0;
            let opaquePixelCount = 0;
            
            for (let y = 0; y < image.height; y++) {
                for (let x = 0; x < image.width; x++) {
                    const alpha = data[(y * image.width + x) * 4 + 3];
                    if (alpha > 10) { // Non-transparent pixel (threshold to ignore very faint pixels)
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                        opaquePixelCount++;
                    }
                }
            }
            
            // If all pixels are transparent or image is essentially blank (< 1% opaque pixels)
            const totalPixels = image.width * image.height;
            const opaquePercentage = (opaquePixelCount / totalPixels) * 100;
            
            if (minX >= image.width || minY >= image.height || opaquePercentage < 1) {
                // Image is blank/transparent, throw error to trigger fallback
                reject(new Error(`Image is blank or mostly transparent (${opaquePercentage.toFixed(2)}% opaque)`));
                return;
            }
            
            // Calculate trimmed dimensions
            const trimmedWidth = maxX - minX + 1;
            const trimmedHeight = maxY - minY + 1;
            
            // Create new canvas with trimmed dimensions
            const trimmedCanvas = createCanvas(trimmedWidth, trimmedHeight);
            const trimmedCtx = trimmedCanvas.getContext('2d');
            
            // Draw the trimmed portion
            trimmedCtx.drawImage(image, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
            
            // Get trimmed image buffer
            const trimmedBuffer = trimmedCanvas.toBuffer('image/png');
            
            // Save to cache if we should cache
            // Use hash of original image buffer so we can detect if source changed
            if (shouldCache) {
                const sourceHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
                const cachedPath = path.join(TRIMMED_CACHE_DIR, `${sourceHash}.png`);
                
                // Save asynchronously, don't wait
                fs.writeFile(cachedPath, trimmedBuffer).catch(err => {
                    logger.warn('Failed to cache trimmed logo', { error: err.message });
                });
            }
            
            resolve(trimmedBuffer);
        } catch (error) {
            reject(error);
        }
    });
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
    return colorUtilsRgbToHex(rgb.r, rgb.g, rgb.b);
}

function colorDistance(color1, color2) {
    return calculateColorDistance(color1, color2);
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

/**
 * Add a badge overlay to an image buffer
 * @param {Buffer} imageBuffer - The input image buffer
 * @param {string} badgeText - The text to display on the badge ('ALT' or '4K')
 * @param {Object} options - Optional positioning and styling options
 * @returns {Promise<Buffer>} - The image buffer with badge overlay
 */
async function addBadgeOverlay(imageBuffer, badgeText, options = {}) {
    const {
        position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
        padding = 8, // Padding from edges
        badgeScale = 0.10, // Badge size as percentage of base dimension (default 10%)
    } = options;

    // Clean badge text: trim whitespace and collapse multiple spaces
    badgeText = badgeText.trim().replace(/\s+/g, ' ');

    // Load the image from buffer
    const image = await loadImage(imageBuffer);
    
    // Create canvas matching the original image dimensions
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the original image
    ctx.drawImage(image, 0, 0);
    
    // Create cache key based on badge text, scale, and image dimensions
    const cacheKey = `${badgeText}_${badgeScale}_${image.width}x${image.height}`;
    
    // Check if we have a cached badge canvas
    let badgeCanvas = badgeCache.get(cacheKey);
    
    if (!badgeCanvas) {
        // Calculate badge dimensions based on image size
        const baseSize = Math.min(image.width, image.height);
        const badgeHeight = Math.round(baseSize * badgeScale);
        const badgeRadius = Math.round(badgeHeight * 0.3); // 30% of height for rounded corners
        
        // Set font and measure text
        const fontSize = Math.round(badgeHeight * 0.55); // Font size is 55% of badge height
        const tempCtx = createCanvas(1, 1).getContext('2d');
        tempCtx.font = `bold ${fontSize}px Arial`;
        const textMetrics = tempCtx.measureText(badgeText);
        const textWidth = textMetrics.width;
        
        // Badge width is text width + padding on each side
        const badgeWidth = Math.round(textWidth + (badgeHeight * 0.8));
        
        // Shadow properties (reduced and softened)
        const shadowBlur = 4;
        const shadowOffsetX = 1;
        const shadowOffsetY = 1;
        
        // Calculate extra space needed for shadow
        const shadowMargin = shadowBlur + Math.max(Math.abs(shadowOffsetX), Math.abs(shadowOffsetY));
        
        // Create a canvas for the badge with extra space for shadow
        const canvasWidth = badgeWidth + (shadowMargin * 2);
        const canvasHeight = badgeHeight + (shadowMargin * 2);
        badgeCanvas = createCanvas(canvasWidth, canvasHeight);
        const badgeCtx = badgeCanvas.getContext('2d');
        
        // Store shadow margin on the canvas object for positioning later
        badgeCanvas.shadowMargin = shadowMargin;
        
        // Offset the drawing position to account for shadow margin
        const drawX = shadowMargin;
        const drawY = shadowMargin;
        
        // Add shadow to the rounded rectangle
        badgeCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        badgeCtx.shadowBlur = shadowBlur;
        badgeCtx.shadowOffsetX = shadowOffsetX;
        badgeCtx.shadowOffsetY = shadowOffsetY;
        
        // Draw rounded rectangle background (white)
        badgeCtx.fillStyle = 'white';
        badgeCtx.beginPath();
        badgeCtx.moveTo(drawX + badgeRadius, drawY);
        badgeCtx.lineTo(drawX + badgeWidth - badgeRadius, drawY);
        badgeCtx.arcTo(drawX + badgeWidth, drawY, drawX + badgeWidth, drawY + badgeRadius, badgeRadius);
        badgeCtx.lineTo(drawX + badgeWidth, drawY + badgeHeight - badgeRadius);
        badgeCtx.arcTo(drawX + badgeWidth, drawY + badgeHeight, drawX + badgeWidth - badgeRadius, drawY + badgeHeight, badgeRadius);
        badgeCtx.lineTo(drawX + badgeRadius, drawY + badgeHeight);
        badgeCtx.arcTo(drawX, drawY + badgeHeight, drawX, drawY + badgeHeight - badgeRadius, badgeRadius);
        badgeCtx.lineTo(drawX, drawY + badgeRadius);
        badgeCtx.arcTo(drawX, drawY, drawX + badgeRadius, drawY, badgeRadius);
        badgeCtx.closePath();
        badgeCtx.fill();
        
        // Reset shadow
        badgeCtx.shadowColor = 'transparent';
        badgeCtx.shadowBlur = 0;
        badgeCtx.shadowOffsetX = 0;
        badgeCtx.shadowOffsetY = 0;
        
        // Draw text (black, bold)
        badgeCtx.fillStyle = 'black';
        badgeCtx.font = `bold ${fontSize}px Arial`;
        badgeCtx.textAlign = 'center';
        badgeCtx.textBaseline = 'middle';
        badgeCtx.fillText(badgeText, drawX + badgeWidth / 2, drawY + badgeHeight / 2);
        
        // Cache the badge canvas (limit cache size)
        if (badgeCache.size >= MAX_CACHE_SIZE) {
            const firstKey = badgeCache.keys().next().value;
            badgeCache.delete(firstKey);
        }
        badgeCache.set(cacheKey, badgeCanvas);
    }
    
    // Calculate badge position based on position parameter
    // Account for shadow margin to position the visible badge correctly
    const shadowMargin = badgeCanvas.shadowMargin || 0;
    let badgeX, badgeY;
    switch (position) {
        case 'top-left':
            badgeX = padding - shadowMargin;
            badgeY = padding - shadowMargin;
            break;
        case 'bottom-left':
            badgeX = padding - shadowMargin;
            badgeY = image.height - badgeCanvas.height - padding + shadowMargin;
            break;
        case 'bottom-right':
            badgeX = image.width - badgeCanvas.width - padding + shadowMargin;
            badgeY = image.height - badgeCanvas.height - padding + shadowMargin;
            break;
        case 'top-right':
        default:
            badgeX = image.width - badgeCanvas.width - padding + shadowMargin;
            badgeY = padding - shadowMargin;
            break;
    }
    
    // Draw the cached badge onto the main canvas
    ctx.drawImage(badgeCanvas, badgeX, badgeY);
    
    // Return the buffer
    return canvas.toBuffer('image/png');
}
