// ------------------------------------------------------------------------------
// fallback-logo.test.js
// Tests for fallback league logo functionality
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3002; // Use different port for testing
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const TIMEOUT = 15000; // 15 second timeout per request

// Test results tracking
const results = {
    suiteName: 'Fallback Logo Tests',
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
    {
        name: 'League logo fallback with environment variable set',
        endpoint: '/nba/leaguelogo',
        expectedStatus: 200,
        expectedType: 'image/png',
        description: 'Should return league logo (or fallback if configured)'
    },
    {
        name: 'Matchup logo with fallback on invalid team',
        endpoint: '/nba/invalid-team/celtics/logo?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        description: 'Should fallback to league logo when team not found'
    },
    {
        name: 'Thumb with fallback on invalid team',
        endpoint: '/nba/invalid-team/celtics/thumb?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        description: 'Should fallback to league thumb when team not found'
    },
    {
        name: 'Cover with fallback on invalid team',
        endpoint: '/nba/invalid-team/celtics/cover?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        description: 'Should fallback to league cover when team not found'
    }
];

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

function makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Request timeout after ${TIMEOUT}ms`));
        }, TIMEOUT);

        http.get(`${BASE_URL}${endpoint}`, (res) => {
            clearTimeout(timeout);

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    contentType: res.headers['content-type'],
                    data: Buffer.concat(chunks)
                });
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

function runTest(testCase) {
    return new Promise(async (resolve) => {
        const testResult = {
            name: testCase.name,
            endpoint: testCase.endpoint,
            description: testCase.description,
            passed: false,
            error: null,
            duration: 0
        };

        try {
            const startTime = Date.now();
            const response = await makeRequest(testCase.endpoint);
            testResult.duration = Date.now() - startTime;

            // Check status code
            if (response.status !== testCase.expectedStatus) {
                throw new Error(`Expected status ${testCase.expectedStatus}, got ${response.status}`);
            }

            // Check content type
            if (testCase.expectedType && !response.contentType.includes(testCase.expectedType)) {
                throw new Error(`Expected content type ${testCase.expectedType}, got ${response.contentType}`);
            }

            // For images, verify we got valid data
            if (testCase.expectedType === 'image/png' && response.data.length < 100) {
                throw new Error('Image data too small, possibly invalid');
            }

            testResult.passed = true;
            testResult.actualStatus = response.status;
            testResult.actualContentType = response.contentType;
            testResult.dataSize = response.data.length;

        } catch (error) {
            testResult.error = error.message;
        }

        resolve(testResult);
    });
}

// ------------------------------------------------------------------------------
// Server Management
// ------------------------------------------------------------------------------

let serverProcess;

function startServer() {
    return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');

        // Set environment variable for fallback logo
        const env = {
            ...process.env,
            PORT: PORT.toString(),
            NODE_ENV: 'test',
            RATE_LIMIT_PER_MINUTE: '0',
            IMAGE_CACHE_HOURS: '0',
            SHOW_TIMESTAMP: 'false',
            FALLBACK_LEAGUE_LOGO_URL: 'https://via.placeholder.com/500x500.png?text=Fallback+Logo'
        };

        serverProcess = spawn('node', ['index.js'], {
            env,
            cwd: path.join(__dirname, '..')
        });

        let output = '';

        serverProcess.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes(`Server listening on port ${PORT}`)) {
                // Give server a moment to fully initialize
                setTimeout(() => resolve(), 500);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error('Server error:', data.toString());
        });

        // Timeout if server doesn't start
        setTimeout(() => {
            reject(new Error('Server failed to start within timeout'));
        }, 10000);
    });
}

function stopServer() {
    return new Promise((resolve) => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            serverProcess.on('exit', () => {
                resolve();
            });

            // Force kill after 5 seconds
            setTimeout(() => {
                if (serverProcess) {
                    serverProcess.kill('SIGKILL');
                }
                resolve();
            }, 5000);
        } else {
            resolve();
        }
    });
}

// ------------------------------------------------------------------------------
// Main Test Runner
// ------------------------------------------------------------------------------

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Fallback Logo Feature Tests');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // Start server
        console.log('Starting test server...');
        await startServer();
        console.log(`✓ Server started on port ${PORT}\n`);

        // Run all tests
        results.totalTests = testCases.length;

        for (const testCase of testCases) {
            process.stdout.write(`Testing: ${testCase.name}... `);

            const result = await runTest(testCase);
            results.tests.push(result);

            if (result.passed) {
                console.log(`✓ (${result.duration}ms)`);
                results.passed++;
            } else {
                console.log(`✗`);
                console.log(`  Error: ${result.error}`);
                results.failed++;
            }
        }

    } catch (error) {
        console.error('Fatal error during tests:', error);
        results.failed = results.totalTests;
    } finally {
        // Stop server
        console.log('\nStopping test server...');
        await stopServer();
        console.log('✓ Server stopped\n');
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Test Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Tests: ${results.totalTests}`);
    console.log(`Passed:      ${results.passed}`);
    console.log(`Failed:      ${results.failed}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Save results
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'fallback-logo-test-results.json'),
        JSON.stringify(results, null, 2)
    );

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, cleaning up...');
    await stopServer();
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, cleaning up...');
    await stopServer();
    process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
    console.error('Unhandled error:', error);
    stopServer().then(() => process.exit(1));
});
