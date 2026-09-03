// ------------------------------------------------------------------------------
// logo-background-removal.test.js
// Pixel-level coverage for conservative white-background removal on logo assets.
// ------------------------------------------------------------------------------

const assert = require('assert');
const crypto = require('crypto');
const { createCanvas, loadImage } = require('canvas');
const fsCache = require('../src/helpers/fsCache');
const { removeDetectedWhiteBackground } = require('../src/helpers/image/imageIO');

async function pixels(buffer) {
    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data };
}

function pixel(image, x, y) {
    const offset = (y * image.width + x) * 4;
    return Array.from(image.data.slice(offset, offset + 4));
}

function makeWhiteBackgroundLogo() {
    const canvas = createCanvas(40, 40);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 40, 40);
    ctx.fillStyle = '#1d613d';
    ctx.fillRect(8, 8, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 12, 16, 16);
    ctx.fillStyle = '#d5a619';
    ctx.fillRect(18, 12, 4, 16);
    return canvas.toBuffer('image/png');
}

async function run() {
    const source = makeWhiteBackgroundLogo();
    const processed = await removeDetectedWhiteBackground(source, { cache: false });
    const image = await pixels(processed);

    assert.strictEqual(pixel(image, 0, 0)[3], 0, 'outside white background should be transparent');
    assert.deepStrictEqual(pixel(image, 10, 10), [29, 97, 61, 255], 'colored outline should remain opaque');
    assert.deepStrictEqual(pixel(image, 14, 14), [255, 255, 255, 255], 'enclosed white logo detail should remain opaque');
    assert.deepStrictEqual(pixel(image, 19, 18), [213, 166, 25, 255], 'colored foreground should remain unchanged');

    const diagonalCanvas = createCanvas(40, 40);
    const diagonalCtx = diagonalCanvas.getContext('2d');
    diagonalCtx.fillStyle = '#ffffff';
    diagonalCtx.fillRect(0, 0, 40, 40);
    diagonalCtx.fillStyle = '#1d613d';
    diagonalCtx.beginPath();
    diagonalCtx.moveTo(8, 32);
    diagonalCtx.lineTo(20, 8);
    diagonalCtx.lineTo(32, 32);
    diagonalCtx.closePath();
    diagonalCtx.fill();
    const diagonalImage = await pixels(await removeDetectedWhiteBackground(diagonalCanvas.toBuffer('image/png'), { cache: false }));
    const hasFeatheredEdge = diagonalImage.data.some((value, index) => index % 4 === 3 && value > 0 && value < 255);
    assert(hasFeatheredEdge, 'anti-aliased outlines should retain a feathered alpha edge');

    const transparentCanvas = createCanvas(20, 20);
    const transparentSource = transparentCanvas.toBuffer('image/png');
    const transparentResult = await removeDetectedWhiteBackground(transparentSource, { cache: false });
    assert(transparentResult.equals(transparentSource), 'already transparent images should be unchanged');

    const coloredCanvas = createCanvas(20, 20);
    const coloredCtx = coloredCanvas.getContext('2d');
    coloredCtx.fillStyle = '#1d613d';
    coloredCtx.fillRect(0, 0, 20, 20);
    const coloredSource = coloredCanvas.toBuffer('image/png');
    const coloredResult = await removeDetectedWhiteBackground(coloredSource, { cache: false });
    assert(coloredResult.equals(coloredSource), 'non-white perimeter images should be unchanged');

    const whiteCanvas = createCanvas(20, 20);
    const whiteCtx = whiteCanvas.getContext('2d');
    whiteCtx.fillStyle = '#ffffff';
    whiteCtx.fillRect(0, 0, 20, 20);
    const whiteSource = whiteCanvas.toBuffer('image/png');
    const whiteResult = await removeDetectedWhiteBackground(whiteSource, { cache: false });
    assert(whiteResult.equals(whiteSource), 'all-white logos should be unchanged');

    const paleCanvas = createCanvas(40, 40);
    const paleCtx = paleCanvas.getContext('2d');
    paleCtx.fillStyle = '#ffffff';
    paleCtx.fillRect(0, 0, 40, 40);
    paleCtx.fillStyle = '#d0d0d0';
    paleCtx.fillRect(0, 20, 12, 3);
    const paleImage = await pixels(await removeDetectedWhiteBackground(paleCanvas.toBuffer('image/png'), { cache: false }));
    assert.deepStrictEqual(pixel(paleImage, 4, 21), [208, 208, 208, 255], 'pale foreground should not be removed');

    const cached = await removeDetectedWhiteBackground(source);
    const cacheKey = `v4:${crypto.createHash('md5').update(source).digest('hex')}`;
    const cachedBuffer = fsCache.getBuffer('logo-backgrounds', cacheKey);
    if (process.env.IMAGE_CACHE_HOURS !== '0') {
        assert(cachedBuffer && cachedBuffer.equals(cached), 'sanitized logo should be cached by source content');
    }

    console.log('PASS logo background removal');
}

run().catch(error => {
    console.error('FAIL logo background removal');
    console.error(error);
    process.exitCode = 1;
});
