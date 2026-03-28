// ------------------------------------------------------------------------------
// fsCache.js
// Filesystem-backed cache utility
// Replaces in-memory Maps with .cache/ subdirectories
// ------------------------------------------------------------------------------

const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

const CACHE_BASE = path.join(__dirname, '..', '.cache');

// Ensure the base cache directory exists
if (!fsSync.existsSync(CACHE_BASE)) {
    fsSync.mkdirSync(CACHE_BASE, { recursive: true });
}

/**
 * Hash a cache key to a safe filename
 * @param {string} key - Cache key (any string)
 * @returns {string} MD5 hex hash
 */
function hashKey(key) {
    return crypto.createHash('md5').update(key).digest('hex');
}

/**
 * Ensure a subdirectory exists under .cache/
 * @param {string} subdir - Subdirectory name
 * @returns {string} Full path to the subdirectory
 */
function ensureDir(subdir) {
    const dir = path.join(CACHE_BASE, subdir);
    if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Get a cached buffer (PNG, binary data)
 * @param {string} subdir - Cache subdirectory
 * @param {string} key - Cache key
 * @returns {Buffer|null} Cached buffer or null
 */
function getBuffer(subdir, key) {
    try {
        const filePath = path.join(CACHE_BASE, subdir, hashKey(key) + '.bin');
        if (fsSync.existsSync(filePath)) {
            return fsSync.readFileSync(filePath);
        }
    } catch {
        // File read error, treat as cache miss
    }
    return null;
}

/**
 * Store a buffer in the filesystem cache
 * @param {string} subdir - Cache subdirectory
 * @param {string} key - Cache key
 * @param {Buffer} buffer - Data to cache
 */
function setBuffer(subdir, key, buffer) {
    try {
        const dir = ensureDir(subdir);
        fsSync.writeFileSync(path.join(dir, hashKey(key) + '.bin'), buffer);
    } catch (error) {
        logger.warn('Failed to write buffer cache', { subdir, error: error.message });
    }
}

/**
 * Get cached JSON data with optional TTL based on file mtime
 * @param {string} subdir - Cache subdirectory
 * @param {string} key - Cache key
 * @param {number} maxAgeMs - Maximum age in milliseconds (0 = no expiry)
 * @returns {*|null} Parsed JSON data or null if missing/expired
 */
function getJSON(subdir, key, maxAgeMs = 0) {
    try {
        const filePath = path.join(CACHE_BASE, subdir, hashKey(key) + '.json');
        if (!fsSync.existsSync(filePath)) return null;
        if (maxAgeMs > 0) {
            const stat = fsSync.statSync(filePath);
            if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
        }
        return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Store JSON data in the filesystem cache
 * @param {string} subdir - Cache subdirectory
 * @param {string} key - Cache key
 * @param {*} data - Data to serialize and cache
 */
function setJSON(subdir, key, data) {
    try {
        const dir = ensureDir(subdir);
        fsSync.writeFileSync(path.join(dir, hashKey(key) + '.json'), JSON.stringify(data));
    } catch (error) {
        logger.warn('Failed to write JSON cache', { subdir, error: error.message });
    }
}

/**
 * Clear all files in a cache subdirectory
 * @param {string} subdir - Cache subdirectory
 * @returns {number} Number of files deleted
 */
function clearSubdir(subdir) {
    const dir = path.join(CACHE_BASE, subdir);
    if (!fsSync.existsSync(dir)) return 0;
    let count = 0;
    try {
        const files = fsSync.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fsSync.statSync(filePath).isFile()) {
                fsSync.unlinkSync(filePath);
                count++;
            }
        }
    } catch (error) {
        logger.warn('Failed to clear cache subdir', { subdir, error: error.message });
    }
    return count;
}

module.exports = { getBuffer, setBuffer, getJSON, setJSON, clearSubdir, hashKey, ensureDir };
