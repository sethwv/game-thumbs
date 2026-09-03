// ------------------------------------------------------------------------------
// image/imageIO.js
// Image download (with SVG support), transparent-padding trim, and the combined
// download->trim->load helper. Owns the trimmed-logo cache directory.
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('../logger');
const fsCache = require('../fsCache');
const { REQUEST_TIMEOUT, getHockeytechAssetProxyConfig } = require('../requestConfig');

// Cache settings from environment
const CACHE_HOURS = parseInt(process.env.IMAGE_CACHE_HOURS || '24', 10);
const CACHE_ENABLED = CACHE_HOURS > 0;
const BACKGROUND_REMOVAL_ENABLED = process.env.DISABLE_LOGO_BACKGROUND_REMOVAL?.trim().toLowerCase() !== 'true';
const BACKGROUND_REMOVAL_CACHE_VERSION = 'v4';
const WHITE_BACKGROUND_MIN_CHANNEL = 235;
const WHITE_BACKGROUND_TOLERANCE = 64;
const MIN_BACKGROUND_EDGE_COVERAGE = 0.92;
const BACKGROUND_PREVIEW_SIZE = 64;

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
        const response = await axios.get(urlOrPath, {
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/png,image/jpeg,image/jpg,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.espn.com/'
            },
            ...getHockeytechAssetProxyConfig(urlOrPath)
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

function colorDistanceAt(data, index, background) {
    return Math.max(
        Math.abs(data[index] - background[0]),
        Math.abs(data[index + 1] - background[1]),
        Math.abs(data[index + 2] - background[2])
    );
}

function isNearWhite(data, index) {
    return data[index] >= WHITE_BACKGROUND_MIN_CHANNEL
        && data[index + 1] >= WHITE_BACKGROUND_MIN_CHANNEL
        && data[index + 2] >= WHITE_BACKGROUND_MIN_CHANNEL;
}

function isColored(data, index) {
    return Math.max(data[index], data[index + 1], data[index + 2])
        - Math.min(data[index], data[index + 1], data[index + 2]) > 8;
}

function getEdgePixels(width, height) {
    const edgePixels = [];
    for (let x = 0; x < width; x++) {
        edgePixels.push(x * 4, ((height - 1) * width + x) * 4);
    }
    for (let y = 1; y < height - 1; y++) {
        edgePixels.push(y * width * 4, (y * width + width - 1) * 4);
    }

    return edgePixels;
}

function getWhiteEdgeBackground(data, edgePixels) {
    let count = 0;
    let red = 0;
    let green = 0;
    let blue = 0;
    for (const index of edgePixels) {
        if (data[index + 3] <= 250 || !isNearWhite(data, index)) continue;
        count++;
        red += data[index];
        green += data[index + 1];
        blue += data[index + 2];
    }
    if (count / edgePixels.length < MIN_BACKGROUND_EDGE_COVERAGE) {
        return null;
    }

    return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
}

function cacheBackgroundResult(cacheKey, buffer, cache) {
    if (cache && CACHE_ENABLED) {
        fsCache.setBuffer('logo-backgrounds', cacheKey, buffer);
    }
    return buffer;
}

/**
 * Remove a uniform near-white background only when it is connected to the image
 * edge. Enclosed white logo details remain untouched.
 */
async function removeDetectedWhiteBackground(imageBuffer, { cache = true } = {}) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        throw new Error('Invalid image buffer provided for background removal');
    }
    if (!BACKGROUND_REMOVAL_ENABLED) return imageBuffer;

    const cacheKey = `${BACKGROUND_REMOVAL_CACHE_VERSION}:${crypto.createHash('md5').update(imageBuffer).digest('hex')}`;
    if (cache && CACHE_ENABLED) {
        const cached = fsCache.getBuffer('logo-backgrounds', cacheKey);
        if (cached) return cached;
    }

    const image = await loadImage(imageBuffer);
    const previewScale = Math.min(1, BACKGROUND_PREVIEW_SIZE / Math.max(image.width, image.height));
    const previewWidth = Math.max(1, Math.round(image.width * previewScale));
    const previewHeight = Math.max(1, Math.round(image.height * previewScale));
    const previewCanvas = createCanvas(previewWidth, previewHeight);
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.drawImage(image, 0, 0, previewWidth, previewHeight);
    const preview = previewCtx.getImageData(0, 0, previewWidth, previewHeight);
    if (!getWhiteEdgeBackground(preview.data, getEdgePixels(previewWidth, previewHeight))) {
        return cacheBackgroundResult(cacheKey, imageBuffer, cache);
    }

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const { data } = imageData;
    const edgePixels = getEdgePixels(image.width, image.height);
    const background = getWhiteEdgeBackground(data, edgePixels);
    if (!background) return cacheBackgroundResult(cacheKey, imageBuffer, cache);
    const matchesBackground = index => data[index + 3] > 0
        && colorDistanceAt(data, index, background) <= WHITE_BACKGROUND_TOLERANCE
        && (isNearWhite(data, index) || isColored(data, index));

    let foregroundPixels = 0;
    for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] > 0 && !matchesBackground(index)) foregroundPixels++;
    }
    if (foregroundPixels === 0) return cacheBackgroundResult(cacheKey, imageBuffer, cache);

    const visited = new Uint8Array(image.width * image.height);
    const queue = [];
    for (const index of edgePixels) {
        const pixel = index / 4;
        if (matchesBackground(index) && !visited[pixel]) {
            visited[pixel] = 1;
            queue.push(pixel);
        }
    }

    let removed = 0;
    for (let cursor = 0; cursor < queue.length; cursor++) {
        const pixel = queue[cursor];
        const x = pixel % image.width;
        const y = Math.floor(pixel / image.width);
        const index = pixel * 4;
        data[index + 3] = 0;
        removed++;

        const neighbors = [pixel - 1, pixel + 1, pixel - image.width, pixel + image.width];
        for (const neighbor of neighbors) {
            const neighborX = neighbor % image.width;
            if (neighbor < 0 || neighbor >= visited.length || (Math.abs(neighborX - x) > 1)) continue;
            const neighborIndex = neighbor * 4;
            if (!visited[neighbor] && matchesBackground(neighborIndex)) {
                visited[neighbor] = 1;
                queue.push(neighbor);
            }
        }
    }

    if (removed === 0) return cacheBackgroundResult(cacheKey, imageBuffer, cache);

    // Fully clear the connected background. Restore a fractional alpha only for
    // its one-pixel anti-aliased boundary next to real foreground, which avoids
    // leaving low-opacity JPEG noise spread across the image.
    for (const pixel of queue) {
        const x = pixel % image.width;
        const y = Math.floor(pixel / image.width);
        const index = pixel * 4;
        const neighbors = [pixel - 1, pixel + 1, pixel - image.width, pixel + image.width];
        const touchesForeground = neighbors.some(neighbor => {
            const neighborX = neighbor % image.width;
            return neighbor >= 0
                && neighbor < visited.length
                && Math.abs(neighborX - x) <= 1
                && !visited[neighbor]
                && data[neighbor * 4 + 3] > 0;
        });
        if (touchesForeground) {
            const distance = colorDistanceAt(data, index, background);
            data[index + 3] = Math.round(255 * (distance / WHITE_BACKGROUND_TOLERANCE));
        }
    }

    ctx.putImageData(imageData, 0, 0);
    const processedBuffer = canvas.toBuffer('image/png');
    return cacheBackgroundResult(cacheKey, processedBuffer, cache);
}

async function downloadProcessedLogo(url, { svgSupport = false, removeBackground = true } = {}) {
    let buffer = svgSupport ? await downloadImageWithSvgSupport(url) : await downloadImage(url);
    if (removeBackground) {
        buffer = await removeDetectedWhiteBackground(buffer);
    }
    return buffer;
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
async function loadProcessedLogo(url, { svgSupport = false, trim = true, removeBackground = true } = {}) {
    let buffer = await downloadProcessedLogo(url, { svgSupport, removeBackground });
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
    downloadProcessedLogo,
    removeDetectedWhiteBackground,
    trimImage,
    loadProcessedLogo
};
