// ------------------------------------------------------------------------------
// image/imageIO.js
// Image download (with SVG support), transparent-padding trim, and the combined
// download->trim->load helper. Owns the trimmed-logo cache directory.
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../logger');
const { REQUEST_TIMEOUT } = require('../requestConfig');
const httpClient = require('../httpClient');

// Cache settings from environment
const CACHE_HOURS = parseInt(process.env.IMAGE_CACHE_HOURS || '24', 10);
const CACHE_ENABLED = CACHE_HOURS > 0;

// Cache directory for trimmed logos (project root /.cache/trimmed). Ensure it
// exists so trimImage can write to it; startup clearing happens in the
// imageUtils shim so the one-time reset stays in one place.
const TRIMMED_CACHE_DIR = path.join(__dirname, '..', '..', '..', '.cache', 'trimmed');
if (!fsSync.existsSync(TRIMMED_CACHE_DIR)) {
    fsSync.mkdirSync(TRIMMED_CACHE_DIR, { recursive: true });
}

async function downloadImage(urlOrPath, { allowSvg = false } = {}) {
    // Validate URL exists
    if (!urlOrPath || typeof urlOrPath !== 'string') {
        throw new Error(`Invalid URL or path: ${urlOrPath}`);
    }

    // Handle data URLs (base64 embedded images)
    if (urlOrPath.startsWith('data:image/')) {
        const matches = urlOrPath.match(/^data:image\/[^;]+;base64,(.+)$/);
        if (matches && matches[1]) {
            return Buffer.from(matches[1], 'base64');
        }
        throw new Error(`Invalid data URL format: ${urlOrPath.substring(0, 50)}...`);
    }

    // If it's a local file path, load from filesystem
    if (urlOrPath.startsWith('/') || urlOrPath.startsWith('./') || urlOrPath.startsWith('../')) {
        return fs.readFile(path.resolve(urlOrPath));
    }

    // Otherwise, treat as URL with timeout protection
    try {
        const response = await httpClient.downloadBinary(urlOrPath);

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

        // SVG is not supported by node-canvas directly; reject unless caller opts in
        if (isSVG && !allowSvg) {
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
        const isAthleteHeadshot = urlOrPath.includes('espncdn.com/i/headshots/') || urlOrPath.includes('/v1/espn-cdn/i/headshots/');
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

/**
 * Download an image, converting SVG to PNG if needed
 * @param {string} urlOrPath - URL or path to the image
 * @returns {Promise<Buffer>} Image buffer
 */
async function downloadImageWithSvgSupport(urlOrPath) {
    // Check if it's an SVG by URL extension
    const isSvgUrl = urlOrPath.toLowerCase().endsWith('.svg');

    if (isSvgUrl) {
        try {
            // Fetch SVG bytes (downloadImage handles local paths, data URIs and
            // remote URLs uniformly) and convert to PNG.
            const { rasterizeLogo } = require('../svgUtils');
            const svgBuffer = await downloadImage(urlOrPath, { allowSvg: true });
            const { pngBuffer } = await rasterizeLogo(svgBuffer);
            return pngBuffer;
        } catch (error) {
            logger.warn('Failed to download/convert SVG', {
                url: urlOrPath,
                error: error.message
            });
            throw error;
        }
    }

    // Not SVG, use regular download
    return downloadImage(urlOrPath);
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

/**
 * Download a logo, optionally trim transparent padding, and load it into an Image.
 * Collapses the download -> trim -> loadImage triple repeated across the generators.
 *
 * @param {string} url - logo URL or data URI
 * @param {object} [opts]
 * @param {boolean} [opts.svgSupport=false] - use the SVG-aware download path (league/icon logos)
 * @param {boolean} [opts.trim=true] - trim transparent padding before loading
 * @returns {Promise<Image>} canvas Image ready to draw
 */
async function loadProcessedLogo(url, { svgSupport = false, trim = true } = {}) {
    let buffer = svgSupport ? await downloadImageWithSvgSupport(url) : await downloadImage(url);
    if (trim) {
        buffer = await trimImage(buffer, true);
    }
    return loadImage(buffer);
}

module.exports = {
    CACHE_ENABLED,
    TRIMMED_CACHE_DIR,
    downloadImage,
    downloadImageWithSvgSupport,
    trimImage,
    loadProcessedLogo
};
