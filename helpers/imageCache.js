// ------------------------------------------------------------------------------
// imageCache.js
// Save images to a cache folder and retrieve them if they exist
// Uses image data checksum for caching to avoid regenerating identical images
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '..', '.cache');

// Ensure cache directory exists, clear it on startup
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
} else {
    fs.readdirSync(CACHE_DIR).forEach(file => {
        fs.unlinkSync(path.join(CACHE_DIR, file));
    });
}

module.exports = { checkCacheMiddleware, addToCache, getCachedImage };

// ------------------------------------------------------------------------------

// Store URL to checksum mapping in memory
const urlToChecksumMap = new Map();

// Add a file to cache based on image data checksum
// this is not a middleware function
function addToCache(req, res, body) {
    // Generate checksum from image data
    const imageChecksum = crypto.createHash('md5').update(body).digest('hex');
    const cachePath = path.join(CACHE_DIR, imageChecksum + '.png');
    
    // Store the URL to checksum mapping
    urlToChecksumMap.set(req.originalUrl, imageChecksum);
    
    // Only write if file doesn't exist (avoid duplicate work)
    if (!fs.existsSync(cachePath)) {
        fs.writeFileSync(cachePath, body);
        console.log(`Cached new image with checksum: ${imageChecksum}`);
    } else {
        console.log(`Image already cached with checksum: ${imageChecksum}`);
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
    // Check for expired cache files and delete them
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const files = fs.readdirSync(CACHE_DIR);
    const now = Date.now();
    
    files.forEach(file => {
        const filePath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > maxAge) {
            console.log(`Deleting expired cache file: ${file}`);
            fs.unlinkSync(filePath);
            
            // Clean up URL mappings that point to this checksum
            const checksum = file.replace('.png', '');
            for (const [url, cachedChecksum] of urlToChecksumMap.entries()) {
                if (cachedChecksum === checksum) {
                    urlToChecksumMap.delete(url);
                }
            }
        }
    });
    
    // Check for cached image
    const cachedImage = getCachedImage(req.originalUrl);
    
    if (cachedImage) {
        console.log(`Serving cached image for ${req.originalUrl}`);
        res.set('Content-Type', 'image/png');
        return res.send(cachedImage);
    } else {
        next();
    }
}

// ------------------------------------------------------------------------------