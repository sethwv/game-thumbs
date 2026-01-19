// ------------------------------------------------------------------------------
// fallback.test.js
// Comprehensive fallback mechanism testing
// Tests all fallback scenarios: provider fallback, feeder leagues, NCAA fallback
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'fallback-test-results.json');
const TIMEOUT = 15000;

// Test results tracking
const results = {
    suiteName: 'Fallback Tests',
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
// Test Cases
// ------------------------------------------------------------------------------

const testCases = [
    // Single team fallback - should return league image
    {
        name: 'Logo - Single Invalid Team with Fallback',
        endpoint: '/nba/invalidteam/logo?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-logo-single.png',
        description: 'Returns league logo when team not found'
    },
    {
        name: 'Thumb - Single Invalid Team with Fallback',
        endpoint: '/nba/invalidteam/thumb?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-thumb-single.png',
        description: 'Returns league thumb when team not found'
    },
    {
        name: 'Cover - Single Invalid Team with Fallback',
        endpoint: '/nfl/invalidteam/cover?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-cover-single.png',
        description: 'Returns league cover when team not found'
    },
    
    // Matchup with one invalid team - should use greyscale league logo
    {
        name: 'Logo - Matchup One Invalid Team',
        endpoint: '/nba/lakers/invalidteam/logo?style=1&fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-logo-matchup-one.png',
        description: 'Uses greyscale league logo for missing team'
    },
    {
        name: 'Thumb - Matchup One Invalid Team',
        endpoint: '/nba/lakers/invalidteam/thumb?style=1&fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-thumb-matchup-one.png',
        description: 'Uses greyscale league logo for missing team'
    },
    {
        name: 'Cover - Matchup One Invalid Team',
        endpoint: '/nfl/chiefs/invalidteam/cover?style=1&fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-cover-matchup-one.png',
        description: 'Uses greyscale league logo for missing team'
    },
    
    // Matchup with both invalid teams - should use greyscale league logo for both
    {
        name: 'Logo - Matchup Both Invalid Teams',
        endpoint: '/nba/invalidteam1/invalidteam2/logo?style=1&fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-logo-matchup-both.png',
        description: 'Uses greyscale league logo for both teams'
    },
    {
        name: 'Thumb - Matchup Both Invalid Teams',
        endpoint: '/nba/invalidteam1/invalidteam2/thumb?style=1&fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-thumb-matchup-both.png',
        description: 'Uses greyscale league logo for both teams'
    },
    
    // NCAA fallback to Men's Basketball
    {
        name: 'NCAA Volleyball - Fallback to Basketball',
        endpoint: '/ncaavb/invalidteam/logo?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-ncaa-volleyball.png',
        description: 'NCAA volleyball falls back to men\'s basketball roster'
    },
    {
        name: 'NCAA Soccer - Fallback to Basketball',
        endpoint: '/ncaas/invalidteam/logo?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-ncaa-soccer.png',
        description: 'NCAA soccer falls back to men\'s basketball roster'
    },
    {
        name: 'NCAA Women\'s Basketball - Fallback to Men\'s',
        endpoint: '/ncaaw/invalidteam/logo?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-ncaa-womens-bb.png',
        description: 'NCAA women\'s basketball falls back to men\'s basketball roster'
    },
    
    // Feeder league fallback (EPL -> Championship)
    {
        name: 'EPL - Feeder League Fallback',
        endpoint: '/epl/leeds/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-epl-feeder.png',
        description: 'EPL searches feeder leagues (Championship) for teams'
    },
    
    // Error without fallback - should fail
    {
        name: 'Invalid Team WITHOUT Fallback - Should Fail',
        endpoint: '/nba/invalidteam/logo',
        expectedStatus: 400,
        expectedType: 'application/json',
        saveImage: false,
        description: 'Returns error when fallback not enabled'
    },
    {
        name: 'Matchup Invalid Team WITHOUT Fallback - Should Fail',
        endpoint: '/nba/lakers/invalidteam/logo?style=1',
        expectedStatus: 400,
        expectedType: 'application/json',
        saveImage: false,
        description: 'Returns error when fallback not enabled in matchup'
    },
    
    // Different styles with fallback
    {
        name: 'Fallback - Style 2 Gradient',
        endpoint: '/nba/invalidteam1/invalidteam2/thumb?style=2&fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-style2.png',
        description: 'Fallback works with gradient style'
    },
    {
        name: 'Fallback - Style 3 Badge',
        endpoint: '/nba/invalidteam1/invalidteam2/thumb?style=3&fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'fallback-style3.png',
        description: 'Fallback works with badge style'
    }
];

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
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks)
                });
            });
            res.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        }).on('error', (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}

function isPNG(buffer) {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    return buffer.slice(0, 8).equals(pngSignature);
}

function isJPEG(buffer) {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
}

async function runTest(testCase) {
    const testResult = {
        name: testCase.name,
        endpoint: testCase.endpoint,
        description: testCase.description,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0,
        fileSize: 0
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}${testCase.endpoint}`);
        testResult.statusCode = response.statusCode;
        testResult.contentType = response.headers['content-type'];
        testResult.duration = Date.now() - startTime;
        testResult.fileSize = response.body.length;

        // Check status code
        if (response.statusCode !== testCase.expectedStatus) {
            throw new Error(
                `Expected status ${testCase.expectedStatus}, got ${response.statusCode}`
            );
        }

        // Check content type
        if (!response.headers['content-type']?.includes(testCase.expectedType)) {
            throw new Error(
                `Expected content-type ${testCase.expectedType}, got ${response.headers['content-type']}`
            );
        }

        // For image responses, verify format
        if (testCase.expectedType === 'image/png') {
            if (!isPNG(response.body)) {
                throw new Error('Response is not a valid PNG image');
            }

            // Save image if requested
            if (testCase.saveImage && testCase.filename) {
                const outputPath = path.join(OUTPUT_DIR, testCase.filename);
                fs.writeFileSync(outputPath, response.body);
                testResult.savedTo = testCase.filename;
            }
        } else if (testCase.expectedType === 'image/jpeg') {
            if (!isJPEG(response.body)) {
                throw new Error('Response is not a valid JPEG image');
            }

            if (testCase.saveImage && testCase.filename) {
                const outputPath = path.join(OUTPUT_DIR, testCase.filename);
                fs.writeFileSync(outputPath, response.body);
                testResult.savedTo = testCase.filename;
            }
        } else if (testCase.expectedType === 'application/json') {
            // Verify JSON is parseable
            const json = JSON.parse(response.body.toString());
            testResult.responseData = json;
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
    console.log('='.repeat(80));
    console.log('FALLBACK MECHANISM TESTS');
    console.log('='.repeat(80));
    console.log(`Starting ${testCases.length} fallback tests...`);
    console.log(`Server: ${BASE_URL}`);
    console.log(`Timeout: ${TIMEOUT}ms per request`);
    console.log('');

    // Run all tests
    for (const testCase of testCases) {
        console.log(`Running: ${testCase.name}`);
        console.log(`  Endpoint: ${testCase.endpoint}`);
        
        const result = await runTest(testCase);
        results.tests.push(result);
        results.totalTests++;

        if (result.passed) {
            results.passed++;
            console.log(`  ✓ PASSED (${result.duration}ms, ${result.fileSize} bytes)`);
            if (result.savedTo) {
                console.log(`    Saved to: ${result.savedTo}`);
            }
        } else {
            results.failed++;
            console.log(`  ✗ FAILED (${result.duration}ms)`);
            console.log(`    Error: ${result.error}`);
        }
        console.log('');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests:  ${results.totalTests}`);
    console.log(`Passed:       ${results.passed} (${((results.passed / results.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed:       ${results.failed} (${((results.failed / results.totalTests) * 100).toFixed(1)}%)`);
    console.log('');

    // Save results
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${RESULTS_FILE}`);
    console.log('');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// ------------------------------------------------------------------------------
// Main Execution
// ------------------------------------------------------------------------------

if (require.main === module) {
    // Start the server
    console.log('Starting test server...');
    process.env.PORT = PORT;
    process.env.NODE_ENV = 'development';
    process.env.TRUST_PROXY = '0';
    process.env.RATE_LIMIT_PER_MINUTE = '0'; // Disable rate limiting for tests
    process.env.IMAGE_CACHE_HOURS = '0'; // Disable caching for tests
    process.env.LOG_TO_FILE = 'false'; // Don't clutter logs during tests
    process.env.SHOW_TIMESTAMP = 'false';
    process.env.XC_PROXY = 'false'; // Explicitly disable XC proxy
    
    // Import and start server
    require('../index');
    
    // Give server a moment to initialize
    setTimeout(() => {
        runAllTests().catch(error => {
            console.error('\n💥 Test suite failed:', error);
            process.exit(1);
        });
    }, 2000);
}
