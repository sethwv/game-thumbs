// ------------------------------------------------------------------------------
// aliases.test.js
// Comprehensive team alias testing with rate limiting
// Tests all team name variations and alias mappings
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3003; // Different port from other tests
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'aliases-results.json');
const TIMEOUT = 15000;
const RATE_LIMIT_DELAY = 300; // 300ms between requests to respect rate limits

// Load data
const teamAliases = require('../teams.json');

// Test results tracking
const results = {
    suiteName: 'Team Alias Tests',
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

function getTeamAliasesList() {
    const aliasList = [];
    for (const leagueKey in teamAliases) {
        const teams = teamAliases[leagueKey];
        for (const teamKey in teams) {
            const team = teams[teamKey];
            if (team.aliases && team.aliases.length > 0) {
                aliasList.push({
                    league: leagueKey,
                    teamKey,
                    aliases: team.aliases
                });
            }
        }
    }
    return aliasList;
}

// ------------------------------------------------------------------------------
// Test Execution
// ------------------------------------------------------------------------------

async function testTeamAlias(alias, teamKey, leagueKey) {
    const testResult = {
        name: `Team Alias - ${leagueKey.toUpperCase()}: "${alias}" → ${teamKey}`,
        endpoint: `/${leagueKey}/${alias}/raw`,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/${leagueKey}/${encodeURIComponent(alias)}/raw`);
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
        
        if (!data.displayName && !data.name) {
            throw new Error('Missing team name in response');
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testNcaaShorthand(shorthand, expectedLeague, leagueName) {
    const testResult = {
        name: `NCAA Shorthand - "${shorthand}" → ${leagueName}`,
        endpoint: `/ncaa/${shorthand}/raw`,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/ncaa/${encodeURIComponent(shorthand)}/raw`);
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

        // Verify it resolved to the correct NCAA league
        if (data.name !== leagueName) {
            throw new Error(`Expected "${leagueName}", got "${data.name}"`);
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

// ------------------------------------------------------------------------------
// Main Test Runner
// ------------------------------------------------------------------------------

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  TEAM ALIAS TESTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Output Directory: ${OUTPUT_DIR}`);
    console.log(`  Base URL: ${BASE_URL}`);
    console.log(`  Rate Limit Delay: ${RATE_LIMIT_DELAY}ms between requests`);
    console.log('═══════════════════════════════════════════════════════════');

    // Wait for server
    console.log('\n⏳ Waiting for server to be ready...');
    await waitForServer();
    console.log('✅ Server is ready!\n');

    const teamAliasesList = getTeamAliasesList();
    
    // Calculate total tests
    let totalTests = 0;
    teamAliasesList.forEach(team => {
        totalTests += team.aliases.length; // Team alias tests
    });
    
    results.totalTests = totalTests;
    
    console.log(`📊 Test Plan:`);
    console.log(`   - ${teamAliasesList.reduce((acc, t) => acc + t.aliases.length, 0)} team alias tests`);
    console.log(`   - Total: ${totalTests} tests`);
    console.log(`   - Estimated time: ~${Math.round((totalTests * RATE_LIMIT_DELAY) / 1000 / 60)} minutes\n`);

    let testNumber = 0;

    // Test 1: Team Aliases
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Team Aliases');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const team of teamAliasesList) {
        for (const alias of team.aliases) {
            testNumber++;
            console.log(`\n[${testNumber}/${totalTests}] Testing: ${team.league.toUpperCase()} "${alias}" → ${team.teamKey}`);
            
            const result = await testTeamAlias(alias, team.teamKey, team.league);
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

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

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
