// One-time script: download the remaining Wikimedia league logos and write them
// to assets/ as PNG. SVG sources are rasterized via the project's rasterizeLogo.
// Run with: node scripts/fetch-league-logos.js  (not part of the app runtime)

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { rasterizeLogo } = require('../helpers/svgUtils');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Wikimedia's User-Agent policy asks for a descriptive UA with contact info.
const HEADERS = {
    'User-Agent': 'game-thumbs/1.0 (https://github.com/; swvn10@gmail.com) axios',
    'Accept': 'image/svg+xml,image/png,image/*,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
};

// [url, outputFile]. Super Rugby (SUPER_RUGBY.png) already exists; skip it.
const LOGOS = [
    ['https://upload.wikimedia.org/wikipedia/en/thumb/1/1e/Canadian_Baseball_League.svg/1280px-Canadian_Baseball_League.svg.png', 'CBL.png'],
    ['https://upload.wikimedia.org/wikipedia/commons/6/69/The_Rugby_Championship_logo_%28white_background%29.png', 'RUGBY_CHAMPIONSHIP.png'],
    ['https://upload.wikimedia.org/wikipedia/en/8/8e/NPC-Logo_50_Years.png', 'NPC.png'],
    ['https://upload.wikimedia.org/wikipedia/en/1/1f/Urba_logo.png', 'URBA.png'],
    ['https://upload.wikimedia.org/wikipedia/commons/7/7d/Top_14_Logo.svg', 'TOP14.png'],
    ['https://upload.wikimedia.org/wikipedia/en/6/65/InvestecChampionsCupLogo.svg', 'CHAMPIONS_CUP.png'],
    ['https://upload.wikimedia.org/wikipedia/en/b/bd/Currie_Cup_logo.svg', 'CURRIE_CUP.png'],
    ['https://upload.wikimedia.org/wikipedia/en/9/97/World_Rugby_logo.svg', 'WORLD_RUGBY.png'],
    ['https://upload.wikimedia.org/wikipedia/en/9/93/British_%26_Irish_Lions_logo_%282023%29.svg', 'BRITISH_IRISH_LIONS.png'],
    ['https://upload.wikimedia.org/wikipedia/en/5/50/National_Rugby_League.svg', 'NRL.png'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, attempts = 5) {
    let delay = 3000;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: HEADERS, maxRedirects: 5 });
        } catch (err) {
            const status = err.response?.status;
            if (status === 429 && i < attempts) {
                console.log(`  429, backing off ${delay}ms (attempt ${i}/${attempts})`);
                await sleep(delay);
                delay *= 2;
                continue;
            }
            throw err;
        }
    }
}

async function main() {
    for (const [url, outFile] of LOGOS) {
        const dest = path.join(ASSETS_DIR, outFile);
        if (fs.existsSync(dest)) {
            console.log(`skip (exists) -> ${outFile}`);
            continue;
        }
        try {
            const res = await fetchWithRetry(url);
            const buf = Buffer.from(res.data);
            if (url.toLowerCase().endsWith('.svg')) {
                const { pngBuffer } = await rasterizeLogo(buf);
                fs.writeFileSync(dest, pngBuffer);
                console.log(`rasterized SVG -> ${outFile} (${pngBuffer.length} bytes)`);
            } else {
                fs.writeFileSync(dest, buf);
                console.log(`saved PNG     -> ${outFile} (${buf.length} bytes)`);
            }
        } catch (err) {
            console.error(`FAILED ${outFile}: ${err.response?.status || ''} ${err.message}`);
        }
        await sleep(2500); // be polite to Wikimedia
    }
}

main();
