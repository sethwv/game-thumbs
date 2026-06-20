// ------------------------------------------------------------------------------
// snapshot.js
// Pixel-regression harness for the image generators.
//
// Boots the server in-process (like endpoints.test.js), renders a fixed matrix
// of representative requests, and hashes each PNG. Two modes:
//
//   node test/snapshots/snapshot.js --update   (npm run snapshot:update)
//     Render the matrix and write the committed baseline manifest
//     (test/snapshots/manifest.json), plus PNGs to baseline/ for eyeballing.
//
//   node test/snapshots/snapshot.js            (npm run snapshot)
//     Render the matrix and compare each PNG's sha256 to the manifest.
//     Exits non-zero if any case CHANGED, ERRORED, or is MISSING/NEW.
//
// Rendering is deterministic given identical source-logo bytes, so the reliable
// workflow for verifying a pixel-preserving refactor is, in one session:
//   1) git stash / checkout the pre-change tree, run `npm run snapshot:update`
//   2) apply the refactor
//   3) run `npm run snapshot`  -> expect every case PASS
// The committed manifest is a convenience baseline; upstream logo CDNs can drift
// over time, so regenerate it right before a refactor rather than trusting an
// old commit.
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3199;
const BASE_URL = `http://localhost:${PORT}`;
const DIR = __dirname;
const MANIFEST_FILE = path.join(DIR, 'manifest.json');
const BASELINE_DIR = path.join(DIR, 'baseline');
const CURRENT_DIR = path.join(DIR, 'current');
const TIMEOUT = 20000;

const UPDATE = process.argv.includes('--update');

// ------------------------------------------------------------------------------
// Request matrix: { id, url }. `id` is the stable key in the manifest and the
// PNG filename. Keep ids stable; changing one drops its baseline entry.
// ------------------------------------------------------------------------------

const MATCHUP = 'nba/lakers/celtics';
const THUMB_STYLES = [1, 2, 3, 4, 5, 6, 98, 99];
const LOGO_STYLES = [1, 2, 3, 4, 5, 6];

const matrix = [];
const add = (id, url) => matrix.push({ id, url });

// Thumbnail: every style
for (const s of THUMB_STYLES) add(`thumb-style${s}`, `/${MATCHUP}/thumb?style=${s}`);
// Thumbnail: aspect ratio variants
add('thumb-square', `/${MATCHUP}/thumb?style=1&aspect=square`);
add('thumb-16x9', `/${MATCHUP}/thumb?style=1&aspect=16-9`);
// Thumbnail: feature overlays on the matchup
add('thumb-badge', `/${MATCHUP}/thumb?style=1&badge=HD`);
add('thumb-winner', `/${MATCHUP}/thumb?style=1&winner=lakers`);
add('thumb-nologo', `/${MATCHUP}/thumb?style=1&logo=false`);

// Cover: every style
for (const s of THUMB_STYLES) add(`cover-style${s}`, `/${MATCHUP}/cover?style=${s}`);

// Logo: every style + light variant
for (const s of LOGO_STYLES) add(`logo-style${s}`, `/${MATCHUP}/logo?style=${s}`);
add('logo-light', `/${MATCHUP}/logo?style=1&useLight=true`);

// League-level images
add('league-thumb', '/nba/thumb');
add('league-cover', '/nba/cover');
add('league-logo', '/nba/logo');
add('league-leaguethumb', '/nba/leaguethumb');
add('league-leaguecover', '/nba/leaguecover');
add('league-leaguelogo', '/nba/leaguelogo');
add('league-thumb-overlay', '/nba/thumb?title=Game%20Night&subtitle=Tonight');

// Single-team images
add('team-thumb', '/nba/lakers/thumb');
add('team-cover', '/nba/lakers/cover');
add('team-logo', '/nba/lakers/logo');
add('team-teamlogo', '/nba/lakers/teamlogo');

// Cross-league breadth (different providers / asset shapes)
add('nfl-thumb', '/nfl/chiefs/eagles/thumb?style=1');
add('nfl-logo', '/nfl/chiefs/eagles/logo?style=3');
add('nhl-thumb', '/nhl/bruins/rangers/thumb?style=2');
add('mlb-cover', '/mlb/yankees/dodgers/cover?style=1');

// ------------------------------------------------------------------------------
// HTTP helper
// ------------------------------------------------------------------------------

function makeRequest(url, timeout = TIMEOUT) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error(`timeout after ${timeout}ms`)), timeout);
        http.get(url, (res) => {
            clearTimeout(timeoutId);
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({
                statusCode: res.statusCode,
                contentType: res.headers['content-type'],
                body: Buffer.concat(chunks)
            }));
        }).on('error', (err) => { clearTimeout(timeoutId); reject(err); });
    });
}

async function waitForServer(maxAttempts = 30, delayMs = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await makeRequest(BASE_URL + '/health', 2000);
            return;
        } catch (_) {
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
    throw new Error('Server failed to start');
}

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ------------------------------------------------------------------------------
// Render the matrix -> { id: { url, status, hash, bytes, error } }
// ------------------------------------------------------------------------------

async function renderMatrix(saveDir) {
    ensureDir(saveDir);
    const out = {};
    for (const { id, url } of matrix) {
        try {
            const res = await makeRequest(BASE_URL + url);
            if (res.statusCode !== 200 || !res.contentType?.includes('image/png')) {
                out[id] = { url, status: res.statusCode, error: `status ${res.statusCode} (${res.contentType})` };
                console.log(`  ⚠️  ${id.padEnd(22)} status ${res.statusCode}`);
                continue;
            }
            fs.writeFileSync(path.join(saveDir, `${id}.png`), res.body);
            out[id] = { url, status: 200, hash: sha256(res.body), bytes: res.body.length };
            console.log(`  ·   ${id.padEnd(22)} ${res.body.length} bytes`);
        } catch (err) {
            out[id] = { url, error: err.message };
            console.log(`  ✗   ${id.padEnd(22)} ${err.message}`);
        }
    }
    return out;
}

// ------------------------------------------------------------------------------
// Modes
// ------------------------------------------------------------------------------

async function runUpdate() {
    console.log(`\nRendering ${matrix.length} cases to baseline...\n`);
    const rendered = await renderMatrix(BASELINE_DIR);
    const errored = Object.entries(rendered).filter(([, r]) => !r.hash);
    if (errored.length) {
        console.log(`\n❌ ${errored.length} case(s) failed to render; baseline NOT written.`);
        errored.forEach(([id, r]) => console.log(`   • ${id}: ${r.error}`));
        process.exit(1);
    }
    const manifest = {
        generatedAt: new Date().toISOString(),
        note: 'sha256 of each rendered PNG. Regenerate right before a refactor (npm run snapshot:update); upstream logo CDNs drift over time.',
        cases: rendered
    };
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`\n✅ Baseline written: ${matrix.length} cases -> ${path.relative(process.cwd(), MANIFEST_FILE)}`);
    process.exit(0);
}

async function runCheck() {
    if (!fs.existsSync(MANIFEST_FILE)) {
        console.log('❌ No manifest. Run `npm run snapshot:update` first.');
        process.exit(1);
    }
    const baseline = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8')).cases;
    console.log(`\nRendering ${matrix.length} cases and comparing to baseline...\n`);
    const current = await renderMatrix(CURRENT_DIR);

    const changed = [], errored = [], missing = [], added = [], passed = [];
    for (const { id } of matrix) {
        const base = baseline[id];
        const cur = current[id];
        if (!cur.hash) { errored.push(id); continue; }
        if (!base) { added.push(id); continue; }
        if (!base.hash) { errored.push(id); continue; }
        if (base.hash === cur.hash) passed.push(id);
        else changed.push(id);
    }
    for (const id of Object.keys(baseline)) {
        if (!current[id]) missing.push(id);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  SNAPSHOT REGRESSION SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ identical: ${passed.length}`);
    console.log(`  🔴 CHANGED:   ${changed.length}`);
    console.log(`  ✗  errored:   ${errored.length}`);
    console.log(`  ?  missing:   ${missing.length}`);
    console.log(`  +  new:       ${added.length}`);
    console.log('═══════════════════════════════════════════════');

    if (changed.length) {
        console.log('\n🔴 Pixel output CHANGED (refactor was NOT pixel-preserving):');
        changed.forEach((id) => console.log(`   • ${id}  (${baseline[id].url})\n       baseline ${baseline[id].hash.slice(0, 12)} -> current ${current[id].hash.slice(0, 12)}`));
        console.log(`\n   Inspect: ${path.relative(process.cwd(), BASELINE_DIR)}/<id>.png vs ${path.relative(process.cwd(), CURRENT_DIR)}/<id>.png`);
    }
    if (errored.length) {
        console.log('\n✗ Errored cases (could not compare):');
        errored.forEach((id) => console.log(`   • ${id}: ${current[id]?.error || baseline[id]?.error || 'no baseline hash'}`));
    }
    if (missing.length) console.log(`\n? In baseline but not rendered: ${missing.join(', ')}`);
    if (added.length) console.log(`\n+ Rendered but absent from baseline (run --update): ${added.join(', ')}`);

    const ok = changed.length === 0 && errored.length === 0 && missing.length === 0 && added.length === 0;
    console.log(ok ? '\n✅ All cases pixel-identical to baseline.\n' : '\n❌ Snapshot regression detected.\n');
    process.exit(ok ? 0 : 1);
}

// ------------------------------------------------------------------------------
// Boot server, then run
// ------------------------------------------------------------------------------

if (require.main === module) {
    process.env.PORT = String(PORT);
    process.env.NODE_ENV = 'development';
    process.env.TRUST_PROXY = '0';
    process.env.RATE_LIMIT_PER_MINUTE = '0';
    process.env.IMAGE_CACHE_HOURS = '0';   // never serve a cached final render; always re-render
    process.env.LOG_TO_FILE = 'false';
    process.env.SHOW_TIMESTAMP = 'false';
    process.env.XC_PROXY = 'false';
    process.env.ALLOW_CUSTOM_BADGES = 'true';
    process.env.ALLOW_EVENT_OVERLAYS = 'true';

    require('../../index');

    setTimeout(async () => {
        try {
            await waitForServer();
            await (UPDATE ? runUpdate() : runCheck());
        } catch (err) {
            console.error('\n💥 Snapshot harness failed:', err.message);
            process.exit(1);
        }
    }, 1500);
}
