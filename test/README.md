# Test Suite

This directory contains comprehensive testing for the Game Thumbs API.

## Running Tests Locally

### Run all tests:
```bash
npm test
# or
yarn test
```

### Run specific test suite:
```bash
npm run test:endpoints    # Quick endpoint validation (~2 min)
npm run test:leagues      # League and league alias tests (~3-5 min)
npm run test:aliases      # Team alias tests (~2-3 min)
npm run test:ncaa         # NCAA shorthand tests (~15-20 min)
# or
yarn test:endpoints
yarn test:leagues
yarn test:aliases
yarn test:ncaa
```

### Direct execution:
```bash
node test/endpoints.test.js
```

## Test Suites

### `endpoints.test.js`
Tests all API endpoints by:
1. **Starting a test server** on port 3001
2. **Testing all major endpoints** including:
   - Health check and server info
   - League logos, thumbnails, and covers
   - Team logos, thumbnails, and covers
   - Matchup logos, thumbnails, and covers
   - Raw data endpoints
   - Error cases (invalid leagues, non-existent routes)
3. **Saves generated images** to `test/output/` directory
4. **Generates JSON results** with detailed pass/fail information
5. **Exits with code 1** if any tests fail

### `leagues.test.js`
Comprehensive league validation:
1. **Starting a test server** on port 3002
2. **Tests all leagues** from `leagues.json`:
   - Direct league key access via `/league/raw`
   - All league aliases (e.g., "premier league" → EPL)
3. **Rate limiting**: 300ms delay between requests
4. **Comprehensive coverage**: Tests 50+ leagues and 100+ aliases
5. **Estimated runtime**: ~3-5 minutes

### `aliases.test.js`
Team alias validation:
1. **Starting a test server** on port 3003
2. **Tests all team aliases** from `teams.json`:
   - All team name variations (e.g., "man utd" → Manchester United)
   - Cross-references with league data
   - Team nicknames and abbreviations
3. **Rate limiting**: 300ms delay between requests
4. **Estimated runtime**: ~2-3 minutes

### `ncaa.test.js`
Comprehensive NCAA shorthand testing with all endpoint types:
1. **Starting a test server** on port 3004
2. **Tests all NCAA shorthands** with complete endpoint coverage:
   - 40+ NCAA sport shorthands (football, basketball, hockey, etc.)
   - Men's and women's sports variations
   - 8 endpoint types per shorthand: raw, logo, thumb, cover, teamlogo, leaguelogo, leaguethumb, leaguecover
3. **Team-based testing**: Uses real NCAA teams for each sport
4. **Image generation**: Validates PNG output for all image endpoints
5. **Rate limiting**: 300ms delay between requests
6. **Comprehensive coverage**: 296+ total tests
7. **Estimated runtime**: ~15-20 minutes

## Test Output

After running tests, you'll find:
- `test/output/*-results.json` - Detailed JSON results for each test suite
- `test/output/*.png` - All generated images from successful tests

## Test Result Format

All test suites should output results in the following JSON format:

```json
{
  "suiteName": "Test Suite Name",
  "timestamp": "2025-12-02T12:00:00.000Z",
  "totalTests": 10,
  "passed": 9,
  "failed": 1,
  "tests": [
    {
      "name": "Test Name",
      "endpoint": "/path/to/endpoint",
      "passed": true,
      "error": null,
      "statusCode": 200,
      "contentType": "image/png",
      "duration": 123,
      "savedFile": "output-file.png"
    }
  ]
}
```

This format ensures compatibility with the automated test workflow.

## GitHub Actions Integration

The test suite runs automatically on:
- Pushes to `main` or `dev` branches
- Pull requests to `main` or `dev` branches
- Manual workflow dispatch

### Workflow Features:
- ✅ Discovers and runs all `*.test.js` files automatically
- 📊 Outputs formatted results to GitHub Step Summary
- 🖼️ Uploads generated images and results as artifacts
- ❌ Fails the workflow if any tests fail
- 📦 Keeps artifacts for 30 days
- 📈 Aggregates results from multiple test suites

### Viewing Results:
1. Go to the **Actions** tab in your GitHub repository
## Test Configuration

Tests are configured with:
- **Ports**: 3001 (endpoints), 3002 (leagues), 3003 (aliases) - to avoid conflicts
- **Server rate limiting**: Disabled during tests
- **Test rate limiting**: 300ms delay between requests
- **Image caching**: Disabled
- **Timeout**: 15 seconds per request between requests in leagues.test.js
- **Image caching**: Disabled
- **Timeout**: 15 seconds per request

### Rate Limiting Strategy

Test suites with external API calls include built-in rate limiting to prevent:
- API throttling from external providers (ESPN, TheSportsDB)
- Server overload during comprehensive testing
- Network connection issues from rapid requests

Configure the delay in each test file:
```javascript
const RATE_LIMIT_DELAY = 300; // milliseconds between requests
```

Note: `endpoints.test.js` doesn't use rate limiting as it tests against cached/static endpoints.
- **Image caching**: Disabled
- **Timeout**: 15 seconds per request

## Adding New Tests

### Adding test cases to existing suite

Edit `endpoints.test.js` and add entries to the `testCases` array:

```javascript
{
    name: 'Test Name',
    endpoint: '/path/to/endpoint',
    expectedStatus: 200,
    expectedType: 'image/png', // or 'application/json'
    saveImage: true, // if it's an image endpoint
    filename: 'output-filename.png' // if saveImage is true
}
```

### Creating a new test suite

1. Create a new file in `test/` with the pattern `*.test.js` (e.g., `performance.test.js`)
2. Follow the test result format documented above
3. Export results to `test/output/your-suite-name-results.json`
4. The GitHub Actions workflow will automatically discover and run it

Example test suite structure:

```javascript
const results = {
    suiteName: 'Your Test Suite Name',
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
};

// Run your tests...

// Save results
fs.writeFileSync(
    path.join(__dirname, 'output', 'your-suite-results.json'),
    JSON.stringify(results, null, 2)
);

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
```

## Troubleshooting

### Server won't start
- Check if port 3001 is already in use
- Verify all dependencies are installed (`npm install`)

### Tests timeout
- Increase the `TIMEOUT` constant in test files
- Check your network connection (tests fetch from external APIs)

### Images not generating
- Verify external provider APIs are accessible
- Check that required fonts are installed (for text rendering)
- Review error messages in test output
