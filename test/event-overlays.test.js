// ------------------------------------------------------------------------------
// event-overlays.test.js
// Integration tests for the league event overlay feature (PR #116).
// Tests the title/subtitle/iconurl query parameters, the ALLOW_EVENT_OVERLAYS
// feature flag, and the ALLOW_INSECURE_OVERLAY_URLS allowlist behavior.
// Requires network access for league logo fetching.
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3011;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'event-overlays-results.json');
const TIMEOUT = 20000;

const results = {
    suiteName: 'Event Overlay Tests',
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
};

let serverProcess = null;

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

function makeRequest(url, timeout = TIMEOUT) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const timeoutId = setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);

        http.get(url, (res) => {
            clearTimeout(timeoutId);
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'],
                    body: buffer,
                    bodyText: buffer.toString(),
                    duration: Date.now() - startTime
                });
            });
        }).on('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}

function waitForServer(maxAttempts = 40, delayMs = 500) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            http.get(`${BASE_URL}/health`, (res) => {
                if (res.statusCode === 200) resolve();
                else if (attempts < maxAttempts) setTimeout(check, delayMs);
                else reject(new Error(`Server not ready after ${maxAttempts} attempts`));
                res.resume();
            }).on('error', () => {
                if (attempts < maxAttempts) setTimeout(check, delayMs);
                else reject(new Error(`Server not ready after ${maxAttempts} attempts`));
            });
        };
        check();
    });
}

function startServer(env = {}) {
    return new Promise((resolve, reject) => {
        serverProcess = spawn('node', [path.join(__dirname, '..', 'index.js')], {
            env: {
                ...process.env,
                PORT: PORT.toString(),
                NODE_ENV: 'development',
                TRUST_PROXY: '0',
                RATE_LIMIT_PER_MINUTE: '0',
                IMAGE_CACHE_HOURS: '0',
                LOG_TO_FILE: 'false',
                SHOW_TIMESTAMP: 'false',
                XC_PROXY: 'false',
                ...env
            },
            stdio: 'pipe'
        });

        serverProcess.on('error', reject);

        setTimeout(() => {
            waitForServer().then(resolve).catch(reject);
        }, 1500);
    });
}

function stopServer() {
    return new Promise((resolve) => {
        if (!serverProcess) return resolve();
        let done = false;
        serverProcess.on('exit', () => { if (!done) { done = true; serverProcess = null; resolve(); } });
        serverProcess.kill('SIGTERM');
        setTimeout(() => {
            if (!done) { done = true; serverProcess?.kill('SIGKILL'); serverProcess = null; resolve(); }
        }, 5000);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function recordResult(testResult) {
    results.tests.push(testResult);
    if (testResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED  ${testResult.name} (${testResult.duration}ms)`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED  ${testResult.name} (${testResult.duration}ms)`);
        console.log(`            ${testResult.error}`);
    }
}

// ------------------------------------------------------------------------------
// Test Suites
// ------------------------------------------------------------------------------

async function testOverlaysEnabled() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Config 1: ALLOW_EVENT_OVERLAYS=true');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const happyPath = [
        {
            name: 'League Thumb - title only',
            endpoint: '/nfl/thumb?title=Test%20Event',
            filename: 'overlay-thumb-title.png'
        },
        {
            name: 'League Thumb - title + subtitle',
            endpoint: '/nfl/thumb?title=Test%20Event&subtitle=Round%201',
            filename: 'overlay-thumb-title-subtitle.png'
        },
        {
            name: 'League Cover - title + subtitle',
            endpoint: '/nfl/cover?title=Test%20Event&subtitle=Round%201',
            filename: 'overlay-cover-title-subtitle.png'
        },
        {
            name: 'League Thumb 16:9 - title + subtitle',
            endpoint: '/nfl/thumb?title=Test%20Event&subtitle=Round%201&aspect=16-9',
            filename: 'overlay-thumb-16x9-title-subtitle.png'
        },
    ];

    for (const tc of happyPath) {
        results.totalTests++;
        const start = Date.now();
        const testResult = { name: tc.name, passed: false, error: null, duration: 0 };
        try {
            const res = await makeRequest(`${BASE_URL}${tc.endpoint}`);
            if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.bodyText.slice(0, 200)}`);
            if (!res.contentType?.includes('image/png')) throw new Error(`Expected image/png, got ${res.contentType}`);
            if (res.body.length < 100) throw new Error(`Image too small (${res.body.length} bytes)`);
            fs.writeFileSync(path.join(OUTPUT_DIR, tc.filename), res.body);
            testResult.passed = true;
        } catch (err) {
            testResult.error = err.message;
        }
        testResult.duration = Date.now() - start;
        recordResult(testResult);
        await sleep(200);
    }

    // iconurl validation — these should all return 400 with "Invalid iconurl:" in the body
    const badUrls = [
        ['iconurl - cloud metadata endpoint',   'http://169.254.169.254/latest/meta-data/'],
        ['iconurl - loopback IP',               'http://127.0.0.1/'],
        ['iconurl - localhost hostname',         'http://localhost/image.png'],
        ['iconurl - RFC-1918 address',           'http://192.168.1.1/image.png'],
        ['iconurl - file:// scheme',             'file:///etc/passwd'],
        ['iconurl - local path',                 '/etc/passwd'],
    ];

    for (const [label, iconurl] of badUrls) {
        results.totalTests++;
        const start = Date.now();
        const testResult = { name: label, passed: false, error: null, duration: 0 };
        try {
            const encoded = encodeURIComponent(iconurl);
            const res = await makeRequest(`${BASE_URL}/nfl/thumb?iconurl=${encoded}`);
            if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}`);
            if (!res.bodyText.includes('Invalid iconurl:')) throw new Error(`Expected "Invalid iconurl:" in body, got: ${res.bodyText.slice(0, 200)}`);
            testResult.passed = true;
        } catch (err) {
            testResult.error = err.message;
        }
        testResult.duration = Date.now() - start;
        recordResult(testResult);
        await sleep(100);
    }
}

async function testOverlaysDisabled() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Config 2: ALLOW_EVENT_OVERLAYS=false (default off)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // All overlay params (including a private iconurl) should be silently ignored.
    // The endpoint should return a normal league image.
    const cases = [
        {
            name: 'Thumb - overlay params ignored when flag off',
            endpoint: '/nfl/thumb?title=Test&subtitle=X&iconurl=' + encodeURIComponent('http://169.254.169.254/'),
            filename: 'overlay-flag-off-thumb.png'
        },
        {
            name: 'Cover - overlay params ignored when flag off',
            endpoint: '/nfl/cover?title=Test&subtitle=X&iconurl=' + encodeURIComponent('http://127.0.0.1/'),
            filename: 'overlay-flag-off-cover.png'
        },
    ];

    for (const tc of cases) {
        results.totalTests++;
        const start = Date.now();
        const testResult = { name: tc.name, passed: false, error: null, duration: 0 };
        try {
            const res = await makeRequest(`${BASE_URL}${tc.endpoint}`);
            if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.bodyText.slice(0, 200)}`);
            if (!res.contentType?.includes('image/png')) throw new Error(`Expected image/png, got ${res.contentType}`);
            if (res.body.length < 100) throw new Error(`Image too small (${res.body.length} bytes)`);
            fs.writeFileSync(path.join(OUTPUT_DIR, tc.filename), res.body);
            testResult.passed = true;
        } catch (err) {
            testResult.error = err.message;
        }
        testResult.duration = Date.now() - start;
        recordResult(testResult);
        await sleep(200);
    }
}

async function testInsecureAllowlist() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Config 3: ALLOW_EVENT_OVERLAYS=true, ALLOW_INSECURE_OVERLAY_URLS=127.0.0.1');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Allowed host: validation bypassed. Fetch fails but the response will not
    // contain "Invalid iconurl:" — that specific message only appears on validation rejection.
    results.totalTests++;
    const start1 = Date.now();
    const allowed = { name: 'iconurl - allowed host bypasses validation', passed: false, error: null, duration: 0 };
    try {
        const res = await makeRequest(`${BASE_URL}/nfl/thumb?iconurl=` + encodeURIComponent('http://127.0.0.1/'));
        if (res.bodyText.includes('Invalid iconurl:')) throw new Error('Validation ran despite host being in allowlist');
        allowed.passed = true;
    } catch (err) {
        allowed.error = err.message;
    }
    allowed.duration = Date.now() - start1;
    recordResult(allowed);

    await sleep(100);

    // Non-allowed host on same server: validation should still reject it.
    results.totalTests++;
    const start2 = Date.now();
    const blocked = { name: 'iconurl - non-allowlisted host still rejected', passed: false, error: null, duration: 0 };
    try {
        const res = await makeRequest(`${BASE_URL}/nfl/thumb?iconurl=` + encodeURIComponent('http://192.168.1.1/'));
        if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}`);
        if (!res.bodyText.includes('Invalid iconurl:')) throw new Error(`Expected "Invalid iconurl:" in body, got: ${res.bodyText.slice(0, 200)}`);
        blocked.passed = true;
    } catch (err) {
        blocked.error = err.message;
    }
    blocked.duration = Date.now() - start2;
    recordResult(blocked);
}

// ------------------------------------------------------------------------------
// Main Execution
// ------------------------------------------------------------------------------

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  EVENT OVERLAY TESTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Config 1: overlays on, validation on
    console.log('\n🚀 Starting server (ALLOW_EVENT_OVERLAYS=true)...');
    await startServer({ ALLOW_EVENT_OVERLAYS: 'true' });
    console.log('✅ Server ready\n');

    await testOverlaysEnabled();

    await stopServer();
    await sleep(500);

    // Config 2: overlays off
    console.log('\n🚀 Starting server (ALLOW_EVENT_OVERLAYS=false)...');
    await startServer({ ALLOW_EVENT_OVERLAYS: 'false' });
    console.log('✅ Server ready\n');

    await testOverlaysDisabled();

    await stopServer();
    await sleep(500);

    // Config 3: overlays on, allowlist
    console.log('\n🚀 Starting server (ALLOW_EVENT_OVERLAYS=true, ALLOW_INSECURE_OVERLAY_URLS=127.0.0.1)...');
    await startServer({ ALLOW_EVENT_OVERLAYS: 'true', ALLOW_INSECURE_OVERLAY_URLS: '127.0.0.1' });
    console.log('✅ Server ready\n');

    await testInsecureAllowlist();

    await stopServer();

    // Summary
    const fs2 = require('fs');
    fs2.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════');
    if (results.failed === 0) {
        console.log(`  ✅ ALL TESTS PASSED (${results.passed}/${results.totalTests})`);
    } else {
        console.log(`  ❌ ${results.failed} FAILED, ${results.passed} PASSED (${results.totalTests} total)`);
        results.tests.filter(t => !t.passed).forEach(t => {
            console.log(`     - ${t.name}: ${t.error}`);
        });
    }
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`📄 Results saved to: ${RESULTS_FILE}`);
}

if (require.main === module) {
    runAllTests().catch(err => {
        stopServer().finally(() => {
            console.error('\n💥 Test suite failed:', err);
            process.exit(1);
        });
    }).then(() => {
        process.exit(results.failed > 0 ? 1 : 0);
    });
}

module.exports = { runAllTests, results };
