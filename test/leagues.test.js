// ------------------------------------------------------------------------------
// leagues.test.js
// Comprehensive league and team alias testing with rate limiting
// Tests all leagues and team aliases using the raw endpoint
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3002; // Different port from endpoints test
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'leagues-results.json');
const TIMEOUT = 15000;
const RATE_LIMIT_DELAY = 300; // 300ms between requests to respect rate limits

// Load data
const leagues = require('../leagues.json');

// Test results tracking
const results = {
    suiteName: 'League Tests',
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
};

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(maxAttempts = 30, delayMs = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await makeRequest(BASE_URL + '/health', 2000);
            return;
        } catch (error) {
            if (i < maxAttempts - 1) {
                await sleep(delayMs);
            }
        }
    }
    throw new Error('Server failed to start');
}

function getLeaguesList() {
    const leagueList = [];
    const skipLeagues = ['tennis', 'ufc', 'atp', 'wta', 'pfl', 'bellator'];
    
    for (const key in leagues) {
        // Skip comment keys
        if (key.startsWith('__')) continue;
        
        // Skip tennis and MMA leagues (expensive/slow cache)
        if (skipLeagues.includes(key)) continue;
        
        const league = leagues[key];
        leagueList.push({
            key,
            name: league.name,
            aliases: league.aliases || []
        });
    }
    return leagueList;
}



// ------------------------------------------------------------------------------
// Test Execution
// ------------------------------------------------------------------------------

async function testLeagueRaw(leagueKey, leagueName) {
    const testResult = {
        name: `League Raw - ${leagueName}`,
        endpoint: `/${leagueKey}/raw`,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/${leagueKey}/raw`);
        testResult.statusCode = response.statusCode;
        testResult.contentType = response.contentType;
        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Expected 200, got ${response.statusCode}`);
        }

        if (!response.contentType?.includes('application/json')) {
            throw new Error(`Expected application/json, got ${response.contentType}`);
        }

        // Parse and validate JSON response
        const data = JSON.parse(response.body.toString());
        
        if (!data.name) {
            throw new Error('Missing league name in response');
        }

        if (data.name !== leagueName) {
            throw new Error(`Expected league name "${leagueName}", got "${data.name}"`);
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testLeagueAlias(alias, leagueKey, leagueName) {
    const testResult = {
        name: `League Alias - "${alias}" → ${leagueName}`,
        endpoint: `/${alias}/raw`,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/${encodeURIComponent(alias)}/raw`);
        testResult.statusCode = response.statusCode;
        testResult.contentType = response.contentType;
        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Expected 200, got ${response.statusCode}`);
        }

        if (!response.contentType?.includes('application/json')) {
            throw new Error(`Expected application/json, got ${response.contentType}`);
        }

        // Parse and validate JSON response
        const data = JSON.parse(response.body.toString());
        
        if (!data.name) {
            throw new Error('Missing league name in response');
        }

        if (data.name !== leagueName) {
            throw new Error(`Expected league name "${leagueName}", got "${data.name}"`);
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
    console.log('  LEAGUE TESTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('\n⏳ Waiting for server to be ready...');
    await waitForServer();
    console.log('✅ Server is ready!\n');

    const leaguesList = getLeaguesList();
    
    // Calculate total tests
    let totalTests = leaguesList.length; // League raw tests
    leaguesList.forEach(league => {
        totalTests += league.aliases.length; // League alias tests
    });
    
    results.totalTests = totalTests;
    
    console.log(`📊 Test Plan:`);
    console.log(`   - ${leaguesList.length} league raw data tests`);
    console.log(`   - ${leaguesList.reduce((acc, l) => acc + l.aliases.length, 0)} league alias tests`);
    console.log(`   - Total: ${totalTests} tests`);
    console.log(`   - Estimated time: ~${Math.round((totalTests * RATE_LIMIT_DELAY) / 1000 / 60)} minutes\n`);

    let testNumber = 0;

    // Test 1: League Raw Data
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing League Raw Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const league of leaguesList) {
        testNumber++;
        console.log(`\n[${testNumber}/${totalTests}] Testing: ${league.name} (${league.key})`);
        
        const result = await testLeagueRaw(league.key, league.name);
        results.tests.push(result);
        
        if (result.passed) {
            results.passed++;
            console.log(`   ✅ PASSED (${result.duration}ms)`);
        } else {
            results.failed++;
            console.log(`   ❌ FAILED: ${result.error} (${result.duration}ms)`);
        }
        
        // Rate limit delay
        await sleep(RATE_LIMIT_DELAY);
    }

    // Test 2: League Aliases
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing League Aliases');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const league of leaguesList) {
        for (const alias of league.aliases) {
            testNumber++;
            console.log(`\n[${testNumber}/${totalTests}] Testing: "${alias}" → ${league.name}`);
            
            const result = await testLeagueAlias(alias, league.key, league.name);
            results.tests.push(result);
            
            if (result.passed) {
                results.passed++;
                console.log(`   ✅ PASSED (${result.duration}ms)`);
            } else {
                results.failed++;
                console.log(`   ❌ FAILED: ${result.error} (${result.duration}ms)`);
            }
            
            // Rate limit delay
            await sleep(RATE_LIMIT_DELAY);
        }
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
    console.log(`  Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════');

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.tests
            .filter(t => !t.passed)
            .slice(0, 10) // Show first 10 failures
            .forEach(t => {
                console.log(`  • ${t.name}: ${t.error}`);
            });
        
        if (results.failed > 10) {
            console.log(`  ... and ${results.failed - 10} more failures`);
        }
    }

    // Save results to file
    const json = JSON.stringify(results, null, 2);
    fs.writeFileSync(RESULTS_FILE, json);
    console.log(`\n📊 Results saved to: ${RESULTS_FILE}`);
}

// ------------------------------------------------------------------------------
// Main Execution
// ------------------------------------------------------------------------------

if (require.main === module) {
    console.log('Starting test server...');
    process.env.PORT = PORT;
    process.env.NODE_ENV = 'development';
    process.env.TRUST_PROXY = '0';
    process.env.RATE_LIMIT_PER_MINUTE = '0'; // Disable rate limiting for tests
    process.env.IMAGE_CACHE_HOURS = '0'; // Disable caching for tests
    process.env.LOG_TO_FILE = 'false';
    process.env.SHOW_TIMESTAMP = 'false';
    process.env.XC_PROXY = 'false'; // Explicitly disable XC proxy
    
    require('../index');
    
    setTimeout(() => {
        runAllTests().catch(error => {
            console.error('\n💥 Test suite failed:', error);
            process.exit(1);
        });
    }, 2000);
}

// ------------------------------------------------------------------------------
