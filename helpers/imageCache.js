// ------------------------------------------------------------------------------
// imageCache.js
// Save images to a cache folder and retrieve them if they exist
// Uses image data checksum for caching to avoid regenerating identical images
// ------------------------------------------------------------------------------

const fs = require('fs').promises;
const fsSync = require('fs');
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
if (!fsSync.existsSync(CACHE_DIR)) {
    fsSync.mkdirSync(CACHE_DIR);
} else {
    const files = fsSync.readdirSync(CACHE_DIR);
    let clearedCount = 0;
    files.forEach(file => {
        const filePath = path.join(CACHE_DIR, file);
        const stat = fsSync.statSync(filePath);
        if (stat.isFile()) {
            fsSync.unlinkSync(filePath);
            clearedCount++;
        }
    });
    if (clearedCount > 0) {
        logger.info(`Cleared ${clearedCount} cached image(s) from previous session`);
    }
}

module.exports = { checkCacheMiddleware, addToCache, getCachedImage, cleanupExpiredCache };

// ------------------------------------------------------------------------------

// Track last cache cleanup to avoid checking on every request
let lastCacheCleanup = Date.now();

// Hash URL to a safe filesystem-friendly filename
function urlHash(url) {
    return crypto.createHash('md5').update(url).digest('hex');
}


// Add a file to cache based on URL hash
// this is not a middleware function
function addToCache(req, res, body) {
    // Skip caching if disabled
    if (!CACHE_ENABLED) {
        return;
    }
    
    const hash = urlHash(req.originalUrl);
    const cachePath = path.join(CACHE_DIR, hash + '.png');
    
    // Only write if file doesn't exist (avoid duplicate work)
    if (!fsSync.existsSync(cachePath)) {
        fsSync.writeFileSync(cachePath, body);
        logger.cache('New image cached', {
            Hash: hash,
            URL: req.originalUrl
        });
    }
}


// Get cached image by URL (returns buffer or null)
function getCachedImage(url) {
    const hash = urlHash(url);
    const cachePath = path.join(CACHE_DIR, hash + '.png');
    
    if (fsSync.existsSync(cachePath)) {
        // Check if the cached file has expired
        try {
            const stats = fsSync.statSync(cachePath);
            const maxAge = CACHE_HOURS * 60 * 60 * 1000;
            if (Date.now() - stats.mtimeMs > maxAge) {
                // File expired, delete and return null
                fsSync.unlinkSync(cachePath);
                return null;
            }
        } catch {
            return null;
        }
        return fsSync.readFileSync(cachePath);
    }
    
    return null;
}

// Cleanup expired cache files (async, non-blocking)
async function cleanupExpiredCache() {
    if (!CACHE_ENABLED) {
        return 0;
    }
    
    try {
        const maxAge = CACHE_HOURS * 60 * 60 * 1000;
        const files = await fs.readdir(CACHE_DIR);
        const now = Date.now();
        let expiredCount = 0;
        
        for (const file of files) {
            const filePath = path.join(CACHE_DIR, file);
            try {
                const stats = await fs.stat(filePath);
                // Only clean up .png files (not subdirectories)
                if (!stats.isFile()) continue;
                
                const fileAge = now - stats.mtimeMs;
                
                if (fileAge > maxAge) {
                    await fs.unlink(filePath);
                    expiredCount++;
                }
            } catch (err) {
                // File might have been deleted, continue
                continue;
            }
        }
        
        if (expiredCount > 0) {
            logger.cache(`Deleted ${expiredCount} expired image(s)`);
        }
        
        return expiredCount;
    } catch (error) {
        logger.error('Cache cleanup error', { Error: error.message });
        return 0;
    }
}

// Check if image exists in cache
// this is a middleware function
async function checkCacheMiddleware(req, res, next) {
    // Skip cache check if caching is disabled
    if (!CACHE_ENABLED) {
        return next();
    }
    
    // Check for cached image first (fast path)
    const cachedImage = getCachedImage(req.originalUrl);
    
    if (cachedImage) {
        req._logged = true;
        logger.request(req, true);
        res.set('Content-Type', 'image/png');
        return res.send(cachedImage);
    }
    
    // Run cache cleanup in background every 5 minutes (non-blocking)
    const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - lastCacheCleanup > CLEANUP_INTERVAL) {
        lastCacheCleanup = Date.now();
        // Run cleanup asynchronously without blocking the request
        cleanupExpiredCache().catch(err => {
            logger.error('Background cache cleanup failed', { Error: err.message });
        });
    }
    
    next();
}

// ------------------------------------------------------------------------------