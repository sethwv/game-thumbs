// ------------------------------------------------------------------------------
// endpoints.test.js
// Comprehensive endpoint testing for Game Thumbs API
// Tests all endpoints by starting the server and making real requests
// Saves generated images to test/output directory
// ------------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3001; // Use different port for testing
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'test-results.json');
const TIMEOUT = 15000; // 15 second timeout per request

// Test results tracking
const results = {
    suiteName: 'Endpoint Tests',
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
    // Health & Info endpoints
    {
        name: 'Health Check',
        endpoint: '/health',
        expectedStatus: 200,
        expectedType: 'application/json',
        saveImage: false
    },
    {
        name: 'Server Info',
        endpoint: '/info',
        expectedStatus: 200,
        expectedType: 'application/json',
        saveImage: false
    },
    
    // Raw data endpoint
    {
        name: 'Raw Team Data - NFL',
        endpoint: '/nfl/chiefs/raw',
        expectedStatus: 200,
        expectedType: 'application/json',
        saveImage: false
    },
    
    // League logos
    {
        name: 'League Logo - NFL',
        endpoint: '/nfl/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'league-logo-nfl.png'
    },
    {
        name: 'League Logo - NBA',
        endpoint: '/nba/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'league-logo-nba.png'
    },
    
    // Team logos
    {
        name: 'Team Logo - NFL Chiefs',
        endpoint: '/nfl/chiefs/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'team-logo-nfl-chiefs.png'
    },
    {
        name: 'Team Logo - NBA Lakers',
        endpoint: '/nba/lakers/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'team-logo-nba-lakers.png'
    },
    {
        name: 'Team Logo - MLB Yankees',
        endpoint: '/mlb/yankees/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'team-logo-mlb-yankees.png'
    },
    {
        name: 'Team Logo - NHL Bruins',
        endpoint: '/nhl/bruins/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'team-logo-nhl-bruins.png'
    },
    
    // Matchup logos
    {
        name: 'Matchup Logo - NFL',
        endpoint: '/nfl/chiefs/49ers/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-logo-nfl.png'
    },
    {
        name: 'Matchup Logo - NBA',
        endpoint: '/nba/lakers/celtics/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-logo-nba.png'
    },
    
    // Thumbnails
    {
        name: 'League Thumb - NFL',
        endpoint: '/nfl/thumb',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'league-thumb-nfl.png'
    },
    {
        name: 'Team Thumb - NFL Chiefs',
        endpoint: '/nfl/chiefs/thumb',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'team-thumb-nfl-chiefs.png'
    },
    {
        name: 'Matchup Thumb - NFL',
        endpoint: '/nfl/chiefs/49ers/thumb',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-thumb-nfl.png'
    },
    {
        name: 'Matchup Thumb 16:9 - NBA',
        endpoint: '/nba/lakers/celtics/thumb?aspect=16-9',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-thumb-nba-16x9.png'
    },
    {
        name: 'Matchup Thumb Style 2 - NHL',
        endpoint: '/nhl/blues/stars/thumb?style=2',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-thumb-nhl-style2.png'
    },
    {
        name: 'Matchup Thumb Style 3 - NBA',
        endpoint: '/nba/lakers/celtics/thumb?style=3',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-thumb-nba-style3.png'
    },
    {
        name: 'Matchup Thumb Style 4 - NFL',
        endpoint: '/nfl/chiefs/49ers/thumb?style=4',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-thumb-nfl-style4.png'
    },
    {
        name: 'Matchup Thumb Style 5 (Grid) - NHL',
        endpoint: '/nhl/blues/stars/thumb?style=5',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-thumb-nhl-style5.png'
    },
    {
        name: 'Matchup Thumb Style 6 (Grid Team Colors) - NFL',
        endpoint: '/nfl/chiefs/49ers/thumb?style=6',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-thumb-nfl-style6.png'
    },
    
    // Cover images
    {
        name: 'League Cover - NFL',
        endpoint: '/nfl/cover',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'league-cover-nfl.png'
    },
    {
        name: 'Team Cover - NFL Chiefs',
        endpoint: '/nfl/chiefs/cover',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'team-cover-nfl-chiefs.png'
    },
    {
        name: 'Matchup Cover - NFL',
        endpoint: '/nfl/chiefs/49ers/cover',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-cover-nfl.png'
    },
    {
        name: 'Matchup Cover Style 2 - NBA',
        endpoint: '/nba/lakers/celtics/cover?style=2',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-cover-nba-style2.png'
    },
    {
        name: 'Matchup Cover Style 5 (Grid) - NHL',
        endpoint: '/nhl/blues/stars/cover?style=5',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-cover-nhl-style5.png'
    },
    {
        name: 'Matchup Cover Style 6 (Grid Team Colors) - NFL',
        endpoint: '/nfl/chiefs/49ers/cover?style=6',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'matchup-cover-nfl-style6.png'
    },
    
    // Specific route tests
    {
        name: 'Team Logo Route - NBA Lakers',
        endpoint: '/nba/lakers/teamlogo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'teamlogo-nba-lakers.png'
    },
    {
        name: 'League Logo Route - MLB',
        endpoint: '/mlb/leaguelogo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'leaguelogo-mlb.png'
    },
    {
        name: 'League Thumb Route - NHL',
        endpoint: '/nhl/leaguethumb',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'leaguethumb-nhl.png'
    },
    {
        name: 'League Cover Route - NBA',
        endpoint: '/nba/leaguecover',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'leaguecover-nba.png'
    },
    
    // ESPN Direct endpoints
    {
        name: 'ESPN Direct - League Logo',
        endpoint: '/espn/basketball/nba/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-league-logo-nba.png'
    },
    {
        name: 'ESPN Direct - Team Logo',
        endpoint: '/espn/football/nfl/chiefs/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-team-logo-chiefs.png'
    },
    {
        name: 'ESPN Direct - Matchup Logo',
        endpoint: '/espn/basketball/nba/lakers/celtics/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-matchup-logo-nba.png'
    },
    {
        name: 'ESPN Direct - League Thumb',
        endpoint: '/espn/football/nfl/thumb',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-league-thumb-nfl.png'
    },
    {
        name: 'ESPN Direct - Team Thumb',
        endpoint: '/espn/hockey/nhl/bruins/thumb',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-team-thumb-bruins.png'
    },
    {
        name: 'ESPN Direct - Matchup Thumb',
        endpoint: '/espn/basketball/nba/heat/bucks/thumb',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-matchup-thumb-nba.png'
    },
    {
        name: 'ESPN Direct - League Cover',
        endpoint: '/espn/baseball/mlb/cover',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-league-cover-mlb.png'
    },
    {
        name: 'ESPN Direct - Team Cover',
        endpoint: '/espn/soccer/eng.1/arsenal/cover',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-team-cover-arsenal.png'
    },
    {
        name: 'ESPN Direct - Matchup Cover',
        endpoint: '/espn/football/nfl/cowboys/eagles/cover',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-matchup-cover-nfl.png'
    },
    {
        name: 'ESPN Direct - With Fallback',
        endpoint: '/espn/basketball/nba/invalid-team/logo?fallback=true',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-fallback-logo.png'
    },
    {
        name: 'ESPN Direct - International League',
        endpoint: '/espn/soccer/esp.1/barcelona/logo',
        expectedStatus: 200,
        expectedType: 'image/png',
        saveImage: true,
        filename: 'espn-barcelona-logo.png'
    },
    
    // Error cases
    {
        name: 'Invalid League',
        endpoint: '/invalid/team/logo',
        expectedStatus: 400,
        expectedType: 'application/json',
        saveImage: false
    },
    {
        name: 'Non-existent Route',
        endpoint: '/nonexistent',
        expectedStatus: 444,
        expectedType: 'application/json',
        saveImage: false
    }
];

// ------------------------------------------------------------------------------
// HTTP Request Helper
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

// ------------------------------------------------------------------------------
// Run Single Test
// ------------------------------------------------------------------------------

async function runTest(testCase) {
    const testResult = {
        name: testCase.name,
        endpoint: testCase.endpoint,
        passed: false,
        error: null,
        statusCode: null,
        contentType: null,
        duration: 0,
        savedFile: null
    };

    const startTime = Date.now();

    try {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        console.log(`   URL: ${BASE_URL}${testCase.endpoint}`);

        const response = await makeRequest(BASE_URL + testCase.endpoint);
        testResult.statusCode = response.statusCode;
        testResult.contentType = response.contentType;
        testResult.duration = Date.now() - startTime;

        // Check status code
        if (response.statusCode !== testCase.expectedStatus) {
            throw new Error(
                `Expected status ${testCase.expectedStatus}, got ${response.statusCode}`
            );
        }

        // Check content type
        if (!response.contentType?.includes(testCase.expectedType)) {
            throw new Error(
                `Expected content-type ${testCase.expectedType}, got ${response.contentType}`
            );
        }

        // Save image if requested
        if (testCase.saveImage && testCase.filename) {
            const filepath = path.join(OUTPUT_DIR, testCase.filename);
            fs.writeFileSync(filepath, response.body);
            testResult.savedFile = testCase.filename;
            console.log(`   ✅ Saved image: ${testCase.filename}`);
        }

        // Validate image is not empty
        if (testCase.expectedType === 'image/png' && response.body.length < 100) {
            throw new Error(`Image file too small (${response.body.length} bytes)`);
        }

        // Validate JSON if expected
        if (testCase.expectedType === 'application/json') {
            try {
                JSON.parse(response.body.toString());
            } catch (e) {
                throw new Error('Invalid JSON response');
            }
        }

        testResult.passed = true;
        console.log(`   ✅ PASSED (${testResult.duration}ms)`);
        
    } catch (error) {
        testResult.error = error.message;
        testResult.duration = Date.now() - startTime;
        console.log(`   ❌ FAILED: ${error.message} (${testResult.duration}ms)`);
    }

    return testResult;
}

// ------------------------------------------------------------------------------
// Run All Tests
// ------------------------------------------------------------------------------

async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Game Thumbs API - Endpoint Testing Suite');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Output Directory: ${OUTPUT_DIR}`);
    console.log(`  Base URL: ${BASE_URL}`);
    console.log(`  Total Tests: ${testCases.length}`);
    console.log('═══════════════════════════════════════════════════════════');

    // Wait for server to be ready
    console.log('\n⏳ Waiting for server to be ready...');
    await waitForServer();
    console.log('✅ Server is ready!\n');

    results.totalTests = testCases.length;

    // Run all tests
    for (const testCase of testCases) {
        const result = await runTest(testCase);
        results.tests.push(result);
        
        if (result.passed) {
            results.passed++;
        } else {
            results.failed++;
        }
    }

    // Save results to file
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    // Print summary
    printSummary();

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// ------------------------------------------------------------------------------
// Wait for Server
// ------------------------------------------------------------------------------

async function waitForServer(maxAttempts = 30, delayMs = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            await makeRequest(BASE_URL + '/health', 2000);
            return;
        } catch (error) {
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }
    throw new Error('Server failed to start');
}

// ------------------------------------------------------------------------------
// Print Summary
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
            .forEach(t => {
                console.log(`  • ${t.name}: ${t.error}`);
            });
    }

    console.log(`\n📊 Results saved to: ${RESULTS_FILE}`);
    
    if (results.passed > 0) {
        const imageCount = results.tests.filter(t => t.savedFile).length;
        console.log(`🖼️  Generated ${imageCount} images in: ${OUTPUT_DIR}`);
    }
}

// ------------------------------------------------------------------------------
// Generate Markdown Summary (for GitHub Actions)
// ------------------------------------------------------------------------------

function generateMarkdownSummary() {
    let markdown = '# 🧪 Endpoint Test Results\n\n';
    
    // Summary table
    markdown += '## Summary\n\n';
    markdown += '| Metric | Value |\n';
    markdown += '|--------|-------|\n';
    markdown += `| Total Tests | ${results.totalTests} |\n`;
    markdown += `| ✅ Passed | ${results.passed} |\n`;
    markdown += `| ❌ Failed | ${results.failed} |\n`;
    markdown += `| Success Rate | ${((results.passed / results.totalTests) * 100).toFixed(1)}% |\n`;
    markdown += `| Timestamp | ${results.timestamp} |\n\n`;

    // Detailed results
    markdown += '## Test Results\n\n';
    markdown += '| Test | Status | Duration | Details |\n';
    markdown += '|------|--------|----------|----------|\n';
    
    results.tests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        const duration = `${test.duration}ms`;
        const details = test.passed 
            ? `Status: ${test.statusCode}` 
            : test.error;
        markdown += `| ${test.name} | ${status} | ${duration} | ${details} |\n`;
    });

    // Images section
    const imageTests = results.tests.filter(t => t.savedFile && t.passed);
    if (imageTests.length > 0) {
        markdown += '\n## 🖼️ Generated Images\n\n';
        markdown += `Successfully generated ${imageTests.length} images:\n\n`;
        imageTests.forEach(test => {
            markdown += `- **${test.name}**: \`${test.savedFile}\`\n`;
        });
    }

    // Failed tests section
    if (results.failed > 0) {
        markdown += '\n## ❌ Failed Tests\n\n';
        results.tests
            .filter(t => !t.passed)
            .forEach(t => {
                markdown += `### ${t.name}\n`;
                markdown += `- **Endpoint**: \`${t.endpoint}\`\n`;
                markdown += `- **Error**: ${t.error}\n`;
                markdown += `- **Status Code**: ${t.statusCode || 'N/A'}\n`;
                markdown += `- **Duration**: ${t.duration}ms\n\n`;
            });
    }

    return markdown;
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

// Export for use in other scripts
module.exports = {
    runAllTests,
    generateMarkdownSummary,
    results
};

// ------------------------------------------------------------------------------
