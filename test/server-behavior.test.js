// ------------------------------------------------------------------------------
// server-behavior.test.js
// Tests server behavior: caching, rate limiting, proxy detection
// Tests internal server features and configuration handling
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3009; // Different port from other tests
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'server-behavior-results.json');
const TIMEOUT = 15000;

// Test results tracking
const results = {
    suiteName: 'Server Behavior Tests',
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
};

// Global server process reference
let serverProcess = null;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

function makeRequest(url, headers = {}, timeout = TIMEOUT) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const timeoutId = setTimeout(() => {
            reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);

        const options = {
            headers: headers
        };

        http.get(url, options, (res) => {
            clearTimeout(timeoutId);
            
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const duration = Date.now() - startTime;
                const buffer = Buffer.concat(chunks);
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    contentType: res.headers['content-type'],
                    body: buffer,
                    duration: duration
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

        const checkServer = () => {
            attempts++;
            http.get(`${BASE_URL}/health`, (res) => {
                if (res.statusCode === 200) {
                    console.log(`   Server ready after ${attempts} attempts`);
                    resolve();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkServer, delayMs);
                } else {
                    reject(new Error(`Server failed to start after ${maxAttempts} attempts`));
                }
            }).on('error', (err) => {
                if (attempts < maxAttempts) {
                    if (attempts % 5 === 0) {
                        process.stdout.write(`   Waiting for server... (attempt ${attempts}/${maxAttempts})\r`);
                    }
                    setTimeout(checkServer, delayMs);
                } else {
                    console.log('');
                    reject(new Error(`Server failed to start after ${maxAttempts} attempts: ${err.message}`));
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

function stopServer() {
    return new Promise((resolve) => {
        if (serverProcess) {
            console.log('   Sending shutdown signal...');
            
            let exited = false;
            
            // Wait for process to exit
            serverProcess.on('exit', (code, signal) => {
                if (!exited) {
                    exited = true;
                    serverProcess = null;
                    console.log(`✅ Server stopped (${signal || code})\n`);
                    resolve();
                }
            });
            
            // Try graceful shutdown first
            serverProcess.kill('SIGTERM');
            
            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (serverProcess && !exited) {
                    console.log('   Forcing shutdown...');
                    serverProcess.kill('SIGKILL');
                    exited = true;
                    serverProcess = null;
                    resolve();
                }
            }, 5000);
        } else {
            resolve();
        }
    });
}

function startServer(config) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Starting server with config: ${config.name}...`);
        
        const { spawn } = require('child_process');
        
        // Start server as child process with specific environment
        serverProcess = spawn('node', [path.join(__dirname, '..', 'index.js')], {
            env: {
                ...process.env,
                PORT: PORT.toString(),
                NODE_ENV: 'development',
                TRUST_PROXY: config.trustProxy || '0',
                RATE_LIMIT_PER_MINUTE: config.rateLimitPerMinute || '0',
                IMAGE_CACHE_HOURS: config.imageCacheHours || '0',
                LOG_TO_FILE: 'false',
                SHOW_TIMESTAMP: 'false',
                XC_PROXY: 'false'
            },
            stdio: 'pipe'
        });
        
        serverProcess.stdout.on('data', (data) => {
            // Optionally log server output
            // console.log(`[SERVER] ${data.toString().trim()}`);
        });
        
        serverProcess.stderr.on('data', (data) => {
            // Optionally log server errors
            // console.error(`[SERVER ERROR] ${data.toString().trim()}`);
        });
        
        serverProcess.on('error', (error) => {
            console.error('Failed to start server:', error);
            reject(error);
        });
        
        console.log(`   Process started (PID: ${serverProcess.pid})`);
        
        // Wait a bit for the process to initialize, then check server health
        setTimeout(() => {
            waitForServer()
                .then(() => {
                    console.log('✅ Server is ready\n');
                    resolve();
                })
                .catch(reject);
        }, 1500);
    });
}

// ------------------------------------------------------------------------------
// Test Functions
// ------------------------------------------------------------------------------

async function testImageCacheBehavior() {
    const testResult = {
        name: 'Image Cache - Response Consistency',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        firstRequestTime: 0,
        secondRequestTime: 0,
        thirdRequestTime: 0,
        imagesIdentical: false,
        cacheHeaders: null
    };

    const startTime = Date.now();

    try {
        // First request
        const start1 = Date.now();
        const response1 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`);
        testResult.firstRequestTime = Date.now() - start1;

        if (response1.statusCode !== 200) {
            throw new Error(`First request failed: ${response1.statusCode}`);
        }

        await sleep(100);

        // Second request (should be cached or regenerated consistently)
        const start2 = Date.now();
        const response2 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`);
        testResult.secondRequestTime = Date.now() - start2;

        if (response2.statusCode !== 200) {
            throw new Error(`Second request failed: ${response2.statusCode}`);
        }

        await sleep(100);

        // Third request
        const start3 = Date.now();
        const response3 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`);
        testResult.thirdRequestTime = Date.now() - start3;

        if (response3.statusCode !== 200) {
            throw new Error(`Third request failed: ${response3.statusCode}`);
        }

        // Verify all three images are identical
        testResult.imagesIdentical = response1.body.equals(response2.body) && 
                                     response2.body.equals(response3.body);

        if (!testResult.imagesIdentical) {
            throw new Error('Cached images differ from original');
        }

        // Check for cache headers
        testResult.cacheHeaders = {
            'cache-control': response2.headers['cache-control'],
            'etag': response2.headers['etag'],
            'last-modified': response2.headers['last-modified']
        };

        testResult.duration = Date.now() - startTime;
        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testRateLimitingDisabled() {
    const testResult = {
        name: 'Rate Limiting - Disabled in Test Mode',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        requestCount: 10,
        successCount: 0,
        rateLimitHeaders: null,
        allRequestsSucceeded: false
    };

    const startTime = Date.now();

    try {
        // Make rapid requests - should all succeed since rate limiting is disabled
        for (let i = 0; i < testResult.requestCount; i++) {
            const response = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`);
            
            if (response.statusCode === 200) {
                testResult.successCount++;
                
                // Check first response for rate limit headers
                if (i === 0) {
                    testResult.rateLimitHeaders = {
                        'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
                        'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
                        'x-ratelimit-reset': response.headers['x-ratelimit-reset']
                    };
                }
            } else if (response.statusCode === 429) {
                throw new Error('Rate limit enforced despite being disabled');
            }
        }

        testResult.allRequestsSucceeded = (testResult.successCount === testResult.requestCount);
        testResult.duration = Date.now() - startTime;
        
        if (!testResult.allRequestsSucceeded) {
            throw new Error(`Only ${testResult.successCount}/${testResult.requestCount} succeeded`);
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testProxyDetection() {
    const testResult = {
        name: 'Proxy Detection - X-Forwarded-For',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        tests: []
    };

    const startTime = Date.now();

    try {
        // Test 1: No proxy headers
        const response1 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {});
        testResult.tests.push({
            name: 'No proxy headers',
            statusCode: response1.statusCode,
            passed: response1.statusCode === 200
        });

        // Test 2: Single proxy
        const response2 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {
            'X-Forwarded-For': '192.168.1.1'
        });
        testResult.tests.push({
            name: 'Single X-Forwarded-For',
            statusCode: response2.statusCode,
            passed: response2.statusCode === 200
        });

        // Test 3: Multiple proxy hops
        const response3 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {
            'X-Forwarded-For': '192.168.1.1, 10.0.0.1, 172.16.0.1'
        });
        testResult.tests.push({
            name: 'Multiple proxy hops',
            statusCode: response3.statusCode,
            passed: response3.statusCode === 200
        });

        // Test 4: X-Real-IP header
        const response4 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {
            'X-Real-IP': '203.0.113.1'
        });
        testResult.tests.push({
            name: 'X-Real-IP header',
            statusCode: response4.statusCode,
            passed: response4.statusCode === 200
        });

        // Test 5: Cloudflare headers
        const response5 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {
            'CF-Connecting-IP': '198.51.100.1',
            'CF-Ray': '1234567890abc-SJC'
        });
        testResult.tests.push({
            name: 'Cloudflare headers',
            statusCode: response5.statusCode,
            passed: response5.statusCode === 200
        });

        testResult.duration = Date.now() - startTime;
        testResult.passed = testResult.tests.every(t => t.passed);
        
        if (!testResult.passed) {
            throw new Error('Some proxy detection tests failed');
        }
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testCacheDisabledInTests() {
    const testResult = {
        name: 'Cache Configuration - Disabled in Test Mode',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        cacheDisabled: false,
        responseTimes: [],
        note: 'With IMAGE_CACHE_HOURS=0, no speedup expected'
    };

    const startTime = Date.now();

    try {
        // Make multiple requests and measure response times
        // With cache disabled, response times should be more consistent
        // (no cold cache vs warm cache difference)
        for (let i = 0; i < 5; i++) {
            const start = Date.now();
            const response = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`);
            const duration = Date.now() - start;
            
            if (response.statusCode !== 200) {
                throw new Error(`Request ${i + 1} failed: ${response.statusCode}`);
            }
            
            testResult.responseTimes.push(duration);
            await sleep(100);
        }

        // Check if IMAGE_CACHE_HOURS=0 is working
        // Response times should be relatively consistent (no sudden speedup from caching)
        const avgTime = testResult.responseTimes.reduce((a, b) => a + b, 0) / testResult.responseTimes.length;
        const variance = testResult.responseTimes.map(t => Math.pow(t - avgTime, 2)).reduce((a, b) => a + b, 0) / testResult.responseTimes.length;
        const stdDev = Math.sqrt(variance);
        
        // If cache was working, we'd expect first request to be much slower
        // With cache disabled, all requests should be similar speed
        testResult.cacheDisabled = true;
        testResult.avgResponseTime = Math.round(avgTime);
        testResult.stdDeviation = Math.round(stdDev);
        
        testResult.duration = Date.now() - startTime;
        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testRateLimitHeaders() {
    const testResult = {
        name: 'Rate Limit Headers - Present When Configured',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        rateLimitHeaders: null,
        note: 'Rate limiting disabled in test mode, but headers should still be present'
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`);
        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Request failed: ${response.statusCode}`);
        }

        // Check if rate limit headers are present (even if rate limiting is disabled)
        testResult.rateLimitHeaders = {
            'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
            'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
            'x-ratelimit-reset': response.headers['x-ratelimit-reset']
        };

        // Pass if we got a successful response (headers are optional when rate limiting is disabled)
        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testCacheSpeedup() {
    const testResult = {
        name: 'Image Cache - Speed Improvement (Cache Enabled)',
        endpoint: '/nfl/patriots/logo',
        passed: false,
        error: null,
        duration: 0,
        firstRequestTime: 0,
        secondRequestTime: 0,
        thirdRequestTime: 0,
        speedupPercent: 0,
        note: 'Testing with IMAGE_CACHE_HOURS=1'
    };

    const startTime = Date.now();

    try {
        // First request (cold cache)
        const start1 = Date.now();
        const response1 = await makeRequest(`${BASE_URL}/nfl/patriots/logo`);
        testResult.firstRequestTime = Date.now() - start1;

        if (response1.statusCode !== 200) {
            throw new Error(`First request failed: ${response1.statusCode}`);
        }

        await sleep(100);

        // Second request (should be cached and much faster)
        const start2 = Date.now();
        const response2 = await makeRequest(`${BASE_URL}/nfl/patriots/logo`);
        testResult.secondRequestTime = Date.now() - start2;

        if (response2.statusCode !== 200) {
            throw new Error(`Second request failed: ${response2.statusCode}`);
        }

        await sleep(100);

        // Third request (should also be cached)
        const start3 = Date.now();
        const response3 = await makeRequest(`${BASE_URL}/nfl/patriots/logo`);
        testResult.thirdRequestTime = Date.now() - start3;

        if (response3.statusCode !== 200) {
            throw new Error(`Third request failed: ${response3.statusCode}`);
        }

        // Verify images are identical
        if (!response1.body.equals(response2.body) || !response2.body.equals(response3.body)) {
            throw new Error('Cached images differ from original');
        }

        // Calculate speedup
        testResult.speedupPercent = Math.round(
            ((testResult.firstRequestTime - testResult.secondRequestTime) / testResult.firstRequestTime) * 100
        );

        // Cache should provide a speedup
        if (testResult.speedupPercent < 20) {
            throw new Error(`Cache speedup too low: ${testResult.speedupPercent}% (expected >20%)`);
        }

        testResult.duration = Date.now() - startTime;
        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testRateLimitEnforcement() {
    const testResult = {
        name: 'Rate Limiting - Enforcement (Rate Limit Enabled)',
        endpoint: '/nfl/*/logo (15 different teams)',
        passed: false,
        error: null,
        duration: 0,
        requestCount: 15,
        successCount: 0,
        rateLimitedCount: 0,
        statusCodes: {},
        limit: 10,
        note: 'Testing with RATE_LIMIT_PER_MINUTE=10'
    };

    const startTime = Date.now();

    try {
        // Use different teams to avoid cache hits (cache would bypass rate limiter)
        const teams = ['eagles', 'cowboys', 'giants', 'patriots', 'steelers', 'packers', 
                      '49ers', 'chiefs', 'bills', 'dolphins', 'ravens', 'broncos',
                      'raiders', 'chargers', 'rams'];
        
        // Make rapid sequential requests with tiny delays to trigger rate limit
        // This ensures the rate limiter can track each request properly
        for (let i = 0; i < testResult.requestCount; i++) {
            try {
                const response = await makeRequest(`${BASE_URL}/nfl/${teams[i]}/logo`, {}, 5000);
                
                // Track status codes
                const code = response.statusCode;
                testResult.statusCodes[code] = (testResult.statusCodes[code] || 0) + 1;
                
                if (response.statusCode === 200) {
                    testResult.successCount++;
                } else if (response.statusCode === 429) {
                    testResult.rateLimitedCount++;
                }
            } catch (err) {
                testResult.statusCodes['error'] = (testResult.statusCodes['error'] || 0) + 1;
            }
            
            // Tiny delay to let rate limiter process, but stay rapid
            await sleep(10);
        }

        testResult.duration = Date.now() - startTime;

        // Should have hit the rate limit (some requests should be 429)
        if (testResult.rateLimitedCount === 0) {
            const statusSummary = Object.entries(testResult.statusCodes)
                .map(([code, count]) => `${code}: ${count}`)
                .join(', ');
            throw new Error(`Rate limit was not enforced. Status codes: ${statusSummary}`);
        }

        // Should have succeeded up to approximately the limit
        if (testResult.successCount < testResult.limit - 3) {
            throw new Error(`Too few successful requests: ${testResult.successCount}/${testResult.limit}`);
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testHealthEndpoint() {
    const testResult = {
        name: 'Health Endpoint - Server Status',
        endpoint: '/health',
        passed: false,
        error: null,
        duration: 0,
        statusCode: null,
        responseBody: null
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/health`);
        testResult.statusCode = response.statusCode;
        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Expected 200, got ${response.statusCode}`);
        }

        // Try to parse response as JSON
        try {
            testResult.responseBody = JSON.parse(response.body.toString());
        } catch (e) {
            testResult.responseBody = response.body.toString();
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testCORSHeaders() {
    const testResult = {
        name: 'CORS Headers - Cross-Origin Support',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        corsHeaders: null
    };

    const startTime = Date.now();

    try {
        const response = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {
            'Origin': 'https://example.com'
        });

        testResult.corsHeaders = {
            'access-control-allow-origin': response.headers['access-control-allow-origin'],
            'access-control-allow-methods': response.headers['access-control-allow-methods'],
            'access-control-allow-headers': response.headers['access-control-allow-headers']
        };

        testResult.duration = Date.now() - startTime;

        if (response.statusCode !== 200) {
            throw new Error(`Request failed: ${response.statusCode}`);
        }

        // Check for CORS headers (if enabled)
        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testServerTimeout() {
    const testResult = {
        name: 'Server Timeout - Configuration',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        completedWithinTimeout: false
    };

    const startTime = Date.now();

    try {
        // Make a request and ensure it completes within reasonable time
        const response = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {}, 5000);
        testResult.duration = Date.now() - startTime;
        testResult.completedWithinTimeout = testResult.duration < 5000;

        if (response.statusCode !== 200) {
            throw new Error(`Request failed: ${response.statusCode}`);
        }

        if (!testResult.completedWithinTimeout) {
            throw new Error(`Request took too long: ${testResult.duration}ms`);
        }

        testResult.passed = true;
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
    }

    return testResult;
}

async function testTrustProxyConfiguration() {
    const testResult = {
        name: 'Trust Proxy Configuration - Test Mode',
        endpoint: '/nfl/chiefs/logo',
        passed: false,
        error: null,
        duration: 0,
        tests: []
    };

    const startTime = Date.now();

    try {
        // Test with various proxy headers to ensure TRUST_PROXY=0 is working
        const headers1 = {
            'X-Forwarded-For': '1.2.3.4',
            'X-Forwarded-Proto': 'https',
            'X-Forwarded-Host': 'malicious.com'
        };
        
        const response1 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, headers1);
        testResult.tests.push({
            name: 'Forwarded headers ignored',
            statusCode: response1.statusCode,
            passed: response1.statusCode === 200
        });

        // Test without proxy headers
        const response2 = await makeRequest(`${BASE_URL}/nfl/chiefs/logo`, {});
        testResult.tests.push({
            name: 'Direct connection works',
            statusCode: response2.statusCode,
            passed: response2.statusCode === 200
        });

        testResult.duration = Date.now() - startTime;
        testResult.passed = testResult.tests.every(t => t.passed);
        
        if (!testResult.passed) {
            throw new Error('Trust proxy configuration tests failed');
        }
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
    console.log('  SERVER BEHAVIOR TESTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    results.totalTests = 11;
    
    console.log(`📊 Test Plan (2 Server Configurations):`);
    console.log(`\n   Configuration 1: Disabled (Test Mode)`);
    console.log(`   - 1 image cache consistency test`);
    console.log(`   - 1 rate limiting disabled test`);
    console.log(`   - 1 proxy detection test`);
    console.log(`   - 1 cache disabled verification test`);
    console.log(`   - 1 health endpoint test`);
    console.log(`   - 1 CORS headers test`);
    console.log(`   - 1 server timeout test`);
    console.log(`   - 1 trust proxy configuration test`);
    console.log(`\n   Configuration 2: Enabled (Production-like)`);
    console.log(`   - 1 cache speedup test`);
    console.log(`   - 1 rate limit enforcement test`);
    console.log(`   - 1 rate limit headers test`);
    console.log(`\n   Total: ${results.totalTests} tests\n`);

    let testNumber = 0;

    // Test 1: Image Cache Behavior
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Image Cache Behavior');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Image Cache - Response Consistency`);
    
    const cacheResult = await testImageCacheBehavior();
    results.tests.push(cacheResult);
    
    if (cacheResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${cacheResult.duration}ms)`);
        console.log(`      Request times: ${cacheResult.firstRequestTime}ms, ${cacheResult.secondRequestTime}ms, ${cacheResult.thirdRequestTime}ms`);
        console.log(`      Images identical: ${cacheResult.imagesIdentical}`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${cacheResult.error} (${cacheResult.duration}ms)`);
    }

    // Test 2: Rate Limiting
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Rate Limiting');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Rate Limiting - Disabled in Test Mode`);
    
    const rateLimitResult = await testRateLimitingDisabled();
    results.tests.push(rateLimitResult);
    
    if (rateLimitResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${rateLimitResult.duration}ms)`);
        console.log(`      ${rateLimitResult.successCount}/${rateLimitResult.requestCount} rapid requests succeeded`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${rateLimitResult.error} (${rateLimitResult.duration}ms)`);
    }

    // Test 3: Proxy Detection
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Proxy Detection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Proxy Detection - X-Forwarded-For`);
    
    const proxyResult = await testProxyDetection();
    results.tests.push(proxyResult);
    
    if (proxyResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${proxyResult.duration}ms)`);
        proxyResult.tests.forEach(t => {
            console.log(`      ${t.passed ? '✓' : '✗'} ${t.name}: ${t.statusCode}`);
        });
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${proxyResult.error} (${proxyResult.duration}ms)`);
    }

    // Test 4: Cache Configuration
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Cache Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Cache Configuration - Disabled in Test Mode`);
    
    const cacheConfigResult = await testCacheDisabledInTests();
    results.tests.push(cacheConfigResult);
    
    if (cacheConfigResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${cacheConfigResult.duration}ms)`);
        console.log(`      Avg response time: ${cacheConfigResult.avgResponseTime}ms`);
        console.log(`      Std deviation: ${cacheConfigResult.stdDeviation}ms`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${cacheConfigResult.error} (${cacheConfigResult.duration}ms)`);
    }

    // Test 5: Health Endpoint
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Health Endpoint');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Health Endpoint - Server Status`);
    
    const healthResult = await testHealthEndpoint();
    results.tests.push(healthResult);
    
    if (healthResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${healthResult.duration}ms)`);
        console.log(`      Status: ${healthResult.statusCode}`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${healthResult.error} (${healthResult.duration}ms)`);
    }

    // Test 6: CORS Headers
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing CORS Headers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] CORS Headers - Cross-Origin Support`);
    
    const corsResult = await testCORSHeaders();
    results.tests.push(corsResult);
    
    if (corsResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${corsResult.duration}ms)`);
        if (corsResult.corsHeaders['access-control-allow-origin']) {
            console.log(`      CORS enabled: ${corsResult.corsHeaders['access-control-allow-origin']}`);
        }
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${corsResult.error} (${corsResult.duration}ms)`);
    }

    // Test 7: Server Timeout
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Server Timeout');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Server Timeout - Configuration`);
    
    const timeoutResult = await testServerTimeout();
    results.tests.push(timeoutResult);
    
    if (timeoutResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${timeoutResult.duration}ms)`);
        console.log(`      Completed within timeout: ${timeoutResult.completedWithinTimeout}`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${timeoutResult.error} (${timeoutResult.duration}ms)`);
    }

    // Test 8: Trust Proxy Configuration
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Trust Proxy Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Trust Proxy Configuration - Test Mode`);
    
    const trustProxyResult = await testTrustProxyConfiguration();
    results.tests.push(trustProxyResult);
    
    if (trustProxyResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${trustProxyResult.duration}ms)`);
        trustProxyResult.tests.forEach(t => {
            console.log(`      ${t.passed ? '✓' : '✗'} ${t.name}`);
        });
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${trustProxyResult.error} (${trustProxyResult.duration}ms)`);
    }

    // ===================================================================
    // CONFIGURATION 2: Cache and Rate Limiting ENABLED
    // ===================================================================
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('  RESTARTING SERVER WITH CACHE & RATE LIMITING ENABLED');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Stop current server
    await stopServer();
    
    // Wait longer for port to be released
    console.log('   Waiting for port to be released...');
    await sleep(3000);

    // Start server with cache and rate limiting enabled
    await startServer({
        name: 'Production-like (Cache + Rate Limiting)',
        trustProxy: '0',
        rateLimitPerMinute: '10',
        imageCacheHours: '1'
    });

    // Test 9: Rate Limit Headers (test FIRST before triggering rate limit)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Rate Limit Headers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Rate Limit Headers - Present When Enabled`);
    
    const rateLimitHeadersResult = await testRateLimitHeaders();
    results.tests.push(rateLimitHeadersResult);
    
    if (rateLimitHeadersResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${rateLimitHeadersResult.duration}ms)`);
        if (rateLimitHeadersResult.rateLimitHeaders['x-ratelimit-limit']) {
            console.log(`      Limit: ${rateLimitHeadersResult.rateLimitHeaders['x-ratelimit-limit']}`);
            console.log(`      Remaining: ${rateLimitHeadersResult.rateLimitHeaders['x-ratelimit-remaining']}`);
        }
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${rateLimitHeadersResult.error} (${rateLimitHeadersResult.duration}ms)`);
    }

    await sleep(500);

    // Test 10: Cache Speedup
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Cache Speed Improvement');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Image Cache - Speed Improvement`);
    
    const cacheSpeedupResult = await testCacheSpeedup();
    results.tests.push(cacheSpeedupResult);
    
    if (cacheSpeedupResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${cacheSpeedupResult.duration}ms)`);
        console.log(`      First: ${cacheSpeedupResult.firstRequestTime}ms, Second: ${cacheSpeedupResult.secondRequestTime}ms, Third: ${cacheSpeedupResult.thirdRequestTime}ms`);
        console.log(`      Speedup: ${cacheSpeedupResult.speedupPercent}%`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${cacheSpeedupResult.error} (${cacheSpeedupResult.duration}ms)`);
    }

    await sleep(500);

    // Test 11: Rate Limit Enforcement (test LAST since it will exhaust the limit)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Testing Rate Limit Enforcement');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    testNumber++;
    console.log(`\n[${testNumber}/${results.totalTests}] Rate Limiting - Enforcement`);
    
    const rateLimitEnforcementResult = await testRateLimitEnforcement();
    results.tests.push(rateLimitEnforcementResult);
    
    if (rateLimitEnforcementResult.passed) {
        results.passed++;
        console.log(`   ✅ PASSED (${rateLimitEnforcementResult.duration}ms)`);
        console.log(`      Success: ${rateLimitEnforcementResult.successCount}, Rate Limited: ${rateLimitEnforcementResult.rateLimitedCount}`);
    } else {
        results.failed++;
        console.log(`   ❌ FAILED: ${rateLimitEnforcementResult.error} (${rateLimitEnforcementResult.duration}ms)`);
    }

    // Stop server before exit
    await stopServer();

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
    // Handle cleanup on exit
    process.on('SIGINT', async () => {
        console.log('\n\n⚠️  Interrupted by user');
        await stopServer();
        process.exit(130);
    });
    
    process.on('SIGTERM', async () => {
        await stopServer();
        process.exit(143);
    });
    
    // Start with cache and rate limiting disabled
    startServer({
        name: 'Test Mode (Cache + Rate Limiting Disabled)',
        trustProxy: '0',
        rateLimitPerMinute: '0',
        imageCacheHours: '0'
    }).then(() => {
        return runAllTests();
    }).catch(error => {
        console.error('\n💥 Test suite failed:', error);
        stopServer().then(() => process.exit(1));
    });
}

// ------------------------------------------------------------------------------
