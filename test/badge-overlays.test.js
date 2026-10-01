// Focused, network-free regression tests for badge parsing and composition.
const assert = require('assert');
const { createCanvas, loadImage } = require('canvas');
const { parseBadges, addBadgesOverlay } = require('../src/helpers/image/badge');

function sourceImage() {
    const canvas = createCanvas(600, 400);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toBuffer('image/png');
}

async function changedCorners(before, after) {
    const base = await loadImage(before);
    const overlay = await loadImage(after);
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);
    const original = ctx.getImageData(0, 0, base.width, base.height).data;
    ctx.clearRect(0, 0, base.width, base.height);
    ctx.drawImage(overlay, 0, 0);
    const modified = ctx.getImageData(0, 0, base.width, base.height).data;
    const corners = new Set();
    for (let y = 0; y < base.height; y++) {
        for (let x = 0; x < base.width; x++) {
            const i = (y * base.width + x) * 4;
            if ([0, 1, 2, 3].some(channel => original[i + channel] !== modified[i + channel])) {
                corners.add(`${y < base.height / 2 ? 'top' : 'bottom'}-${x < base.width / 2 ? 'left' : 'right'}`);
            }
        }
    }
    return [...corners].sort();
}

async function run() {
    const previousCustom = process.env.ALLOW_CUSTOM_BADGES;
    delete process.env.ALLOW_CUSTOM_BADGES;
    try {
        assert.deepStrictEqual(parseBadges(['10,6', '%23']), [
            { text: '#10', position: null }, { text: '#6', position: null }
        ]);
        assert.deepStrictEqual(parseBadges('#10,#6'), parseBadges('10,6'));
        assert.deepStrictEqual(parseBadges(['4K@br', '10,6']), [
            { text: '4K', position: 'bottom-right' },
            { text: '#10', position: null },
            { text: '#6', position: null }
        ]);
        assert.deepStrictEqual(parseBadges('INVALID,4K,HD,ESPN,FOX,ALT').map(b => b.text),
            ['4K', 'HD', 'ESPN', 'FOX']);
        assert.deepStrictEqual(parseBadges('INVALID,100'), []);

        const base = sourceImage();
        const cases = [
            ['4K', ['top-right']],
            ['10,6', ['top-left', 'top-right']],
            ['4K@br,10,6', ['bottom-right', 'top-left', 'top-right']],
            ['4K,HD,ALT,ESPN', ['bottom-left', 'bottom-right', 'top-left', 'top-right']],
            ['4K@tl,HD@tr,ALT@bl,ESPN@br', ['bottom-left', 'bottom-right', 'top-left', 'top-right']],
            ['INVALID,4K', ['top-right']]
        ];
        for (const [input, expected] of cases) {
            const result = await addBadgesOverlay(base, parseBadges(input));
            assert.deepStrictEqual(await changedCorners(base, result), expected, input);
        }
        assert((await addBadgesOverlay(base, parseBadges('INVALID'))).equals(base));
        console.log('Badge overlay tests passed');
    } finally {
        if (previousCustom === undefined) delete process.env.ALLOW_CUSTOM_BADGES;
        else process.env.ALLOW_CUSTOM_BADGES = previousCustom;
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
