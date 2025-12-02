// ------------------------------------------------------------------------------
// providers.test.js
// Tests external provider integration (ESPN, TheSportsDB)
// Tests provider fallback, error handling, and data fetching
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3007; // Different port from other tests
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'providers-results.json');
const TIMEOUT = 20000; // Longer timeout for external API calls
const RATE_LIMIT_DELAY = 500; // Slower to respect external APIs

// Test results tracking
const results = {
    suiteName: 'Provider Integration Tests',
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
};

// Provider test cases - teams we know should have data in external providers
const PROVIDER_TESTS = [
    // NFL - should be available in both ESPN and TheSportsDB
    { league: 'nfl', team: 'chiefs', name: 'Kansas City Chiefs', hasESPN: true, hasSportsDB: true },
    { league: 'nfl', team: 'eagles', name: 'Philadelphia Eagles', hasESPN: true, hasSportsDB: true },
    { league: 'nfl', team: 'cowboys', name: 'Dallas Cowboys', hasESPN: true, hasSportsDB: true },
    
    // NBA
    { league: 'nba', team: 'lakers', name: 'Los Angeles Lakers', hasESPN: true, hasSportsDB: true },
    { league: 'nba', team: 'celtics', name: 'Boston Celtics', hasESPN: true, hasSportsDB: true },
    { league: 'nba', team: 'warriors', name: 'Golden State Warriors', hasESPN: true, hasSportsDB: true },
    
    // MLB
    { league: 'mlb', team: 'yankees', name: 'New York Yankees', hasESPN: true, hasSportsDB: true },
    { league: 'mlb', team: 'red-sox', name: 'Boston Red Sox', hasESPN: true, hasSportsDB: true },
    { league: 'mlb', team: 'dodgers', name: 'Los Angeles Dodgers', hasESPN: true, hasSportsDB: true },
    
    // NHL
    { league: 'nhl', team: 'bruins', name: 'Boston Bruins', hasESPN: true, hasSportsDB: true },
    { league: 'nhl', team: 'maple-leafs', name: 'Toronto Maple Leafs', hasESPN: true, hasSportsDB: true },
    { league: 'nhl', team: 'canadiens', name: 'Montreal Canadiens', hasESPN: true, hasSportsDB: true },
    
    // EPL
    { league: 'epl', team: 'manchester-united', name: 'Manchester United', hasESPN: true, hasSportsDB: true },
    { league: 'epl', team: 'liverpool', name: 'Liverpool', hasESPN: true, hasSportsDB: true },
    { league: 'epl', team: 'arsenal', name: 'Arsenal', hasESPN: true, hasSportsDB: true },
    
    // La Liga
    { league: 'laliga', team: 'barcelona', name: 'Barcelona', hasESPN: true, hasSportsDB: true },
    { league: 'laliga', team: 'real-madrid', name: 'Real Madrid', hasESPN: true, hasSportsDB: true },
    
    // NCAA - typically better coverage in ESPN
    { league: 'ncaaf', team: 'alabama', name: 'Alabama', hasESPN: true, hasSportsDB: false },
    { league: 'ncaam', team: 'duke', name: 'Duke', hasESPN: true, hasSportsDB: false },
    { league: 'ncaaw', team: 'uconn', name: 'UConn', hasESPN: true, hasSportsDB: false }
];

// Obscure teams to test fallback behavior
const FALLBACK_TESTS = [
    { league: 'nfl', team: 'texans', name: 'Houston Texans' },
    { league: 'nba', team: 'hornets', name: 'Charlotte Hornets' },
    { league: 'mlb', team: 'marlins', name: 'Miami Marlins' }
];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

function makeRequest(url, timeout = TIMEOUT) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);

        http.get(url, (res) => {
            clearTimeout(timeoutId);
            
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'],
                    body: buffer
                });
            });
        }).on('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}

function waitForServer(maxAttempts = 30, delayMs = 1000) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const checkServer = () => {
            attempts++;
            http.get(`${BASE_URL}/health`, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkServer, delayMs);
                } else {
                    reject(new Error('Server failed to start'));
                }
            }).on('error', () => {
                if (attempts < maxAttempts) {
                    setTimeout(checkServer, delayMs);
                } else {
                    reject(new Error('Server failed to start'));
                }
            });
        };

        checkServer();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function saveResults() {
    const json = JSON.stringify(results, null, 2);
    fs.writeFileSync(RESULTS_FILE, json);
    console.log(`\n📄 Results saved to: ${RESULTS_FILE}`);
}

// ------------------------------------------------------------------------------
// Test Functions
// ------------------------------------------------------------------------------

async function testProviderData(league, team, teamName) {
    const testResult = {
        name: `Provider Data - ${league.toUpperCase()}: ${teamName}`,
        endpoint: `/${league}/${team}/raw`,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0,
        hasLogo: false,
        hasColors: false,
        providerInfo: null
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/${league}/${team}/raw`);
        testResult.statusCode = response.statusCode;
        testResult.contentType = response.contentType;
        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Expected 200, got ${response.statusCode}`);
        }

        if (!response.contentType?.includes('application/json')) {
            throw new Error(`Expected application/json, got ${response.contentType}`);
        }

        const data = JSON.parse(response.body.toString());
        
        // Verify we got team data (name or fullName should be present)
        if (!data.name && !data.fullName) {
            throw new Error('Missing team name in response');
        }

        // Check for logo URL
        if (data.logo) {
            testResult.hasLogo = true;
        }

        // Check for colors
        if (data.color || data.alternateColor) {
            testResult.hasColors = true;
        }

        // Check provider information
        if (data.provider) {
            testResult.providerInfo = data.provider;
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testLogoGeneration(league, team, teamName) {
    const testResult = {
        name: `Logo Generation - ${league.toUpperCase()}: ${teamName}`,
        endpoint: `/${league}/${team}/logo`,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0,
        imageSize: null
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/${league}/${team}/logo`);
        testResult.statusCode = response.statusCode;
        testResult.contentType = response.contentType;
        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Expected 200, got ${response.statusCode}`);
        }

        if (!response.contentType?.includes('image/png')) {
            throw new Error(`Expected image/png, got ${response.contentType}`);
        }

        // Verify it's a valid PNG
        if (!response.body.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
            throw new Error('Response is not a valid PNG image');
        }

        testResult.imageSize = response.body.length;

        // Verify reasonable image size (should be at least 1KB)
        if (testResult.imageSize < 1024) {
            throw new Error(`Image size too small: ${testResult.imageSize} bytes`);
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testCacheBehavior(league, team) {
    const testResult = {
        name: `Cache Behavior - ${league.toUpperCase()}: ${team}`,
        endpoint: `/${league}/${team}/logo`,
        passed: false,
        error: null,
        duration: 0,
        firstRequestTime: 0,
        secondRequestTime: 0,
        cacheSpeedup: null
    };

    const overallStart = Date.now();

    try {
        // First request (cold cache)
        const start1 = Date.now();
        const response1 = await makeRequest(`${BASE_URL}/${league}/${team}/logo`);
        testResult.firstRequestTime = Date.now() - start1;

        if (response1.statusCode !== 200) {
            throw new Error(`First request failed: ${response1.statusCode}`);
        }

        // Wait a moment
        await sleep(100);

        // Second request (should be cached)
        const start2 = Date.now();
        const response2 = await makeRequest(`${BASE_URL}/${league}/${team}/logo`);
        testResult.secondRequestTime = Date.now() - start2;

        if (response2.statusCode !== 200) {
            throw new Error(`Second request failed: ${response2.statusCode}`);
        }

        // Verify images are identical
        if (!response1.body.equals(response2.body)) {
            throw new Error('Cached image differs from original');
        }

        // Note: Cache is disabled in tests, so we won't see speedup
        // This test verifies the endpoint can handle repeat requests
        testResult.cacheSpeedup = testResult.firstRequestTime - testResult.secondRequestTime;
        testResult.duration = Date.now() - overallStart;
        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - overallStart;
    }

    return testResult;
}

async function testProviderFallback(league, team, teamName) {
    const testResult = {
        name: `Provider Fallback - ${league.toUpperCase()}: ${teamName}`,
        endpoint: `/${league}/${team}/logo`,
        passed: false,
        error: null,
        statusCode: null,
        duration: 0,
        note: 'Tests graceful degradation when providers fail'
    };

    const startTime = Date.now();

    try {
        // This tests that even if providers have issues, we still generate something
        const response = await makeRequest(`${BASE_URL}/${league}/${team}/logo`);
        testResult.statusCode = response.statusCode;
        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Expected 200, got ${response.statusCode}`);
        }

        // Verify we got a valid image even if provider data is incomplete
        if (!response.body.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
            throw new Error('Failed to generate fallback image');
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

// ------------------------------------------------------------------------------
// Main Test Execution
// ------------------------------------------------------------------------------

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  PROVIDER INTEGRATION TESTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('\n⏳ Waiting for server to be ready...');
    await waitForServer();
    console.log('✅ Server is ready!\n');

    // Calculate total tests
    const totalTests = 
        PROVIDER_TESTS.length + // Provider data tests
        3 + // Cache behavior tests
        FALLBACK_TESTS.length; // Fallback tests
    
    results.totalTests = totalTests;
    
    console.log(`📊 Test Plan:`);
    console.log(`   - ${PROVIDER_TESTS.length} provider data tests`);
    console.log(`   - 3 cache behavior tests`);
    console.log(`   - ${FALLBACK_TESTS.length} provider fallback tests`);
    console.log(`   - Total: ${totalTests} tests`);
    console.log(`   - Estimated time: ~${Math.round((totalTests * RATE_LIMIT_DELAY) / 1000 / 60)} minutes\n`);

    let testNumber = 0;

    // Test 1: Provider Data Fetching
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Provider Data Fetching');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const test of PROVIDER_TESTS) {
        testNumber++;
        console.log(`\n[${testNumber}/${totalTests}] Testing: ${test.league.toUpperCase()} - ${test.name}`);
        
        const result = await testProviderData(test.league, test.team, test.name);
        results.tests.push(result);
        
        if (result.passed) {
            results.passed++;
            console.log(`   ✅ PASSED (${result.duration}ms)`);
            console.log(`      Logo: ${result.hasLogo ? '✓' : '✗'}, Colors: ${result.hasColors ? '✓' : '✗'}`);
            if (result.providerInfo) {
                console.log(`      Provider: ${result.providerInfo}`);
            }
        } else {
            results.failed++;
            console.log(`   ❌ FAILED: ${result.error} (${result.duration}ms)`);
        }
        
        await sleep(RATE_LIMIT_DELAY);
    }

    // Test 2: Cache Behavior
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Cache Behavior (Repeat Requests)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const cacheTests = [
        { league: 'nfl', team: 'chiefs' },
        { league: 'nba', team: 'lakers' },
        { league: 'mlb', team: 'yankees' }
    ];

    for (const test of cacheTests) {
        testNumber++;
        console.log(`\n[${testNumber}/${totalTests}] Testing: ${test.league.toUpperCase()} - ${test.team}`);
        
        const result = await testCacheBehavior(test.league, test.team);
        results.tests.push(result);
        
        if (result.passed) {
            results.passed++;
            console.log(`   ✅ PASSED (${result.duration}ms total)`);
            console.log(`      Request 1: ${result.firstRequestTime}ms, Request 2: ${result.secondRequestTime}ms`);
        } else {
            results.failed++;
            console.log(`   ❌ FAILED: ${result.error} (${result.duration}ms)`);
        }
        
        await sleep(RATE_LIMIT_DELAY);
    }

    // Test 3: Provider Fallback
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Provider Fallback');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const test of FALLBACK_TESTS) {
        testNumber++;
        console.log(`\n[${testNumber}/${totalTests}] Testing: ${test.league.toUpperCase()} - ${test.name}`);
        
        const result = await testProviderFallback(test.league, test.team, test.name);
        results.tests.push(result);
        
        if (result.passed) {
            results.passed++;
            console.log(`   ✅ PASSED (${result.duration}ms)`);
        } else {
            results.failed++;
            console.log(`   ❌ FAILED: ${result.error} (${result.duration}ms)`);
        }
        
        await sleep(RATE_LIMIT_DELAY);
    }

    // Print summary
    printSummary();

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------

function printSummary() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total Tests:  ${results.totalTests}`);
    console.log(`  ✅ Passed:     ${results.passed}`);
    console.log(`  ❌ Failed:     ${results.failed}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Provider statistics
    const providerStats = {
        withLogo: 0,
        withColors: 0,
        withoutData: 0
    };

    results.tests.forEach(test => {
        if (test.hasLogo !== undefined) {
            if (test.hasLogo) providerStats.withLogo++;
            if (test.hasColors) providerStats.withColors++;
            if (!test.hasLogo && !test.hasColors) providerStats.withoutData++;
        }
    });

    if (providerStats.withLogo > 0 || providerStats.withColors > 0) {
        console.log('Provider Data Coverage:');
        console.log(`  Teams with logos: ${providerStats.withLogo}`);
        console.log(`  Teams with colors: ${providerStats.withColors}`);
        if (providerStats.withoutData > 0) {
            console.log(`  Teams without provider data: ${providerStats.withoutData}`);
        }
        console.log('');
    }

    if (results.failed > 0) {
        console.log('Failed Tests:');
        results.tests.filter(t => !t.passed).forEach(test => {
            console.log(`  ❌ ${test.name}`);
            console.log(`     Error: ${test.error}`);
        });
        console.log('');
    }

    saveResults();
}

// ------------------------------------------------------------------------------
// Start Server and Run Tests
// ------------------------------------------------------------------------------

if (require.main === module) {
    process.env.PORT = PORT;
    process.env.NODE_ENV = 'development';
    process.env.TRUST_PROXY = '0';
    process.env.RATE_LIMIT_PER_MINUTE = '0';
    process.env.IMAGE_CACHE_HOURS = '0';
    process.env.LOG_TO_FILE = 'false';
    process.env.SHOW_TIMESTAMP = 'false';
    process.env.XC_PROXY = 'false';
    
    require('../index');
    
    setTimeout(() => {
        runAllTests().catch(error => {
            console.error('\n💥 Test suite failed:', error);
            process.exit(1);
        });
    }, 2000);
}

// ------------------------------------------------------------------------------
