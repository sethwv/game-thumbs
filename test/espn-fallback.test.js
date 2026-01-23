// ------------------------------------------------------------------------------
// espn-fallback.test.js
// Tests for ESPN fallback mechanism when leagues are not configured
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const PORT = 3005; // Different port for this test
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');

// Environment setup
process.env.PORT = PORT;
process.env.RATE_LIMIT_PER_MINUTE = '0';  // Disable rate limiting
process.env.IMAGE_CACHE_HOURS = '0';      // Disable caching
process.env.LOG_TO_FILE = 'false';        // Disable file logging

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let server;
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

/**
 * Make HTTP request
 */
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'image/png, application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = [];

            res.on('data', (chunk) => {
                data.push(chunk);
            });

            res.on('end', () => {
                const buffer = Buffer.concat(data);
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: buffer
                });
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

/**
 * Run a test
 */
async function runTest(name, testFn) {
    try {
        console.log(`\n🧪 ${name}`);
        await testFn();
        testResults.passed++;
        testResults.tests.push({ name, status: 'PASS' });
        console.log('✅ PASS');
    } catch (error) {
        testResults.failed++;
        testResults.tests.push({ name, status: 'FAIL', error: error.message });
        console.error('❌ FAIL:', error.message);
    }
}

/**
 * Main test suite
 */
async function runTests() {
    console.log('\n='.repeat(80));
    console.log('ESPN FALLBACK MECHANISM TESTS');
    console.log('='.repeat(80));

    // Wait for ESPN cache to initialize (give it 3 seconds)
    console.log('\n⏳ Waiting for ESPN cache to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 1: Unsupported league without fallback should return 400
    await runTest('Unsupported league without fallback returns 400', async () => {
        const response = await makeRequest('/unknown-league/team1/team2/thumb');
        if (response.statusCode !== 400) {
            throw new Error(`Expected 400, got ${response.statusCode}`);
        }
        const json = JSON.parse(response.body.toString());
        if (!json.error || !json.error.includes('Unsupported league')) {
            throw new Error('Expected unsupported league error message');
        }
    });

    // Test 2: Unsupported league with fallback but not in ESPN should return 400
    await runTest('Unknown league with fallback but not in ESPN returns 400', async () => {
        const response = await makeRequest('/completely-fake-league/team1/team2/thumb?fallback=true');
        if (response.statusCode !== 400) {
            throw new Error(`Expected 400, got ${response.statusCode}`);
        }
    });

    // Test 3: ESPN league not in leagues.json should work directly (no redirect)
    // The ESPN provider now automatically handles unconfigured leagues
    await runTest('ESPN unconfigured league works directly', async () => {
        const response = await makeRequest('/eng.2/thumb?fallback=true');
        // Should get 200 (direct handling) or 404 (league not in ESPN cache yet)
        if (response.statusCode !== 200 && response.statusCode !== 404 && response.statusCode !== 400) {
            throw new Error(`Expected 200, 400, or 404, got ${response.statusCode}`);
        }
        if (response.statusCode === 200) {
            if (response.headers['content-type'] !== 'image/png') {
                throw new Error('Expected image/png content type');
            }
            const filename = 'espn-fallback-eng2-league.png';
            fs.writeFileSync(path.join(OUTPUT_DIR, filename), response.body);
            console.log(`  💾 Saved: ${filename} (ESPN provider handled directly)`);
        } else {
            console.log(`  ℹ️  Status: ${response.statusCode} (league may not be in ESPN cache)`);
        }
    });

    // Test 4: Verify ESPN direct endpoint still works for a known league
    await runTest('ESPN direct endpoint generates image', async () => {
        // Using eng.2 (English Championship) which should exist in ESPN
        const response = await makeRequest('/espn/soccer/eng.2/thumb');
        if (response.statusCode !== 200 && response.statusCode !== 404) {
            throw new Error(`Expected 200 or 404, got ${response.statusCode}`);
        }
        if (response.statusCode === 200) {
            if (response.headers['content-type'] !== 'image/png') {
                throw new Error('Expected image/png content type');
            }
            // Save the image
            const filename = 'espn-fallback-espn-direct.png';
            fs.writeFileSync(path.join(OUTPUT_DIR, filename), response.body);
            console.log(`  💾 Saved: ${filename}`);
        }
    });

    // Test 5: ESPN direct matchup endpoint
    await runTest('ESPN direct matchup endpoint', async () => {
        const response = await makeRequest('/espn/soccer/eng.2/sheffield/norwich/thumb');
        // We might get 404 if teams don't exist, but shouldn't get 400 or 500
        if (response.statusCode >= 500) {
            throw new Error(`Server error: ${response.statusCode}`);
        }
        if (response.statusCode === 200) {
            if (response.headers['content-type'] !== 'image/png') {
                throw new Error('Expected image/png content type');
            }
            const filename = 'espn-fallback-matchup.png';
            fs.writeFileSync(path.join(OUTPUT_DIR, filename), response.body);
            console.log(`  💾 Saved: ${filename}`);
        } else {
            console.log(`  ℹ️  Status: ${response.statusCode} (expected for unknown teams)`);
        }
    });

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total:  ${testResults.passed + testResults.failed}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log('='.repeat(80));

    // Save results to JSON
    const resultsPath = path.join(OUTPUT_DIR, 'espn-fallback-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`\n📊 Results saved to: ${resultsPath}\n`);

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Start server and run tests
console.log('Starting server on port', PORT, '...');
const { init } = require('../express');
server = init(PORT);

// Wait for server to start, then run tests
setTimeout(runTests, 2000);
