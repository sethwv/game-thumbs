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
const MAX_CACHE_MAP_SIZE = 10000; // Prevent unbounded memory growth

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

// Store URL to checksum mapping in memory with LRU-like cleanup
const urlToChecksumMap = new Map();

// Track last cache cleanup to avoid checking on every request
let lastCacheCleanup = Date.now();


// Add a file to cache based on image data checksum
// this is not a middleware function
function addToCache(req, res, body) {
    // Skip caching if disabled
    if (!CACHE_ENABLED) {
        return;
    }
    
    // Prevent unbounded memory growth
    if (urlToChecksumMap.size >= MAX_CACHE_MAP_SIZE) {
        // Remove oldest 10% of entries (LRU-like cleanup)
        const entriesToRemove = Math.floor(MAX_CACHE_MAP_SIZE * 0.1);
        const keys = Array.from(urlToChecksumMap.keys());
        for (let i = 0; i < entriesToRemove; i++) {
            urlToChecksumMap.delete(keys[i]);
        }
        logger.cache(`Cleared ${entriesToRemove} old entries from URL cache map to prevent memory leak`);
    }
    
    // Generate checksum from image data
    const imageChecksum = crypto.createHash('md5').update(body).digest('hex');
    const cachePath = path.join(CACHE_DIR, imageChecksum + '.png');
    
    // Store the URL to checksum mapping
    urlToChecksumMap.set(req.originalUrl, imageChecksum);
    
    // Only write if file doesn't exist (avoid duplicate work)
    if (!fsSync.existsSync(cachePath)) {
        fsSync.writeFileSync(cachePath, body);
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
    if (fsSync.existsSync(cachePath)) {
        return fsSync.readFileSync(cachePath);
    }
    
    // Checksum mapping exists but file doesn't, clean up
    urlToChecksumMap.delete(url);
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
                const fileAge = now - stats.mtimeMs;
                
                if (fileAge > maxAge) {
                    await fs.unlink(filePath);
                    expiredCount++;
                    
                    // Clean up URL mappings that point to this checksum
                    const checksum = file.replace('.png', '');
                    for (const [url, cachedChecksum] of urlToChecksumMap.entries()) {
                        if (cachedChecksum === checksum) {
                            urlToChecksumMap.delete(url);
                        }
                    }
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