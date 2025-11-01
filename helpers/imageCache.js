// ------------------------------------------------------------------------------
// imageCache.js
// Save images to a cache folder and retrieve them if they exist
// Uses image data checksum for caching to avoid regenerating identical images
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

const CACHE_DIR = path.join(__dirname, '..', '.cache');

// Get cache duration from environment variable (in hours), default to 24 hours
// Set to 0 to disable caching
const CACHE_HOURS = parseInt(process.env.IMAGE_CACHE_HOURS || '24', 10);
const CACHE_ENABLED = CACHE_HOURS > 0;

logger.info(`Image cache: ${CACHE_ENABLED ? `enabled (${CACHE_HOURS} hours)` : 'disabled'}`);

// Ensure cache directory exists, clear it on startup
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
} else {
    const files = fs.readdirSync(CACHE_DIR);
    files.forEach(file => {
        fs.unlinkSync(path.join(CACHE_DIR, file));
    });
    if (files.length > 0) {
        logger.info(`Cleared ${files.length} cached image(s) from previous session`);
    }
}

module.exports = { checkCacheMiddleware, addToCache, getCachedImage };

// ------------------------------------------------------------------------------

// Store URL to checksum mapping in memory
const urlToChecksumMap = new Map();

// Add a file to cache based on image data checksum
// this is not a middleware function
function addToCache(req, res, body) {
    // Skip caching if disabled
    if (!CACHE_ENABLED) {
        return;
    }
    
    // Generate checksum from image data
    const imageChecksum = crypto.createHash('md5').update(body).digest('hex');
    const cachePath = path.join(CACHE_DIR, imageChecksum + '.png');
    
    // Store the URL to checksum mapping
    urlToChecksumMap.set(req.originalUrl, imageChecksum);
    
    // Only write if file doesn't exist (avoid duplicate work)
    if (!fs.existsSync(cachePath)) {
        fs.writeFileSync(cachePath, body);
        logger.cache('New image cached', {
            Checksum: imageChecksum,
            URL: req.originalUrl
        });
    }
}

// Get cached image by URL (returns buffer or null)
function getCachedImage(url) {
    const checksum = urlToChecksumMap.get(url);
    if (!checksum) return null;
    
    const cachePath = path.join(CACHE_DIR, checksum + '.png');
    if (fs.existsSync(cachePath)) {
        return fs.readFileSync(cachePath);
    }
    
    // Checksum mapping exists but file doesn't, clean up
    urlToChecksumMap.delete(url);
    return null;
}

// Check if image exists in cache
// this is a middleware function
function checkCacheMiddleware(req, res, next) {
    // Skip cache check if caching is disabled
    if (!CACHE_ENABLED) {
        return next();
    }
    
    // Check for expired cache files and delete them
    const maxAge = CACHE_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    let expiredCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > maxAge) {
            fs.unlinkSync(filePath);
            expiredCount++;
            
            // Clean up URL mappings that point to this checksum
            const checksum = file.replace('.png', '');
            for (const [url, cachedChecksum] of urlToChecksumMap.entries()) {
                if (cachedChecksum === checksum) {
                    urlToChecksumMap.delete(url);
                }
            }
        }
    });
    
    if (expiredCount > 0) {
        logger.cache(`Deleted ${expiredCount} expired image(s)`);
    }
    
    // Check for cached image
    const cachedImage = getCachedImage(req.originalUrl);
    
    if (cachedImage) {
        logger.request(req, true);
        res.set('Content-Type', 'image/png');
        return res.send(cachedImage);
    } else {
        next();
    }
}

// ------------------------------------------------------------------------------