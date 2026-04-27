// ------------------------------------------------------------------------------
// url-validator.test.js
// Unit tests for helpers/urlValidator.js and the ALLOW_INSECURE_OVERLAY_URLS
// flag parsing in helpers/featureFlags.js. No server required.
// ------------------------------------------------------------------------------

const path = require('path');

const results = {
    suiteName: 'URL Validator Tests',
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
};

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function recordTest(name, fn) {
    results.totalTests++;
    const startTime = Date.now();
    const test = { name, passed: false, error: null, duration: 0 };
    try {
        fn();
        test.passed = true;
        results.passed++;
        console.log(`   ✅ PASSED  ${name}`);
    } catch (err) {
        test.error = err.message;
        results.failed++;
        console.log(`   ❌ FAILED  ${name}`);
        console.log(`            ${err.message}`);
    }
    test.duration = Date.now() - startTime;
    results.tests.push(test);
}

// Reload featureFlags fresh so env var changes take effect.
function freshFeatureFlags() {
    delete require.cache[require.resolve('../helpers/featureFlags')];
    return require('../helpers/featureFlags');
}

// ------------------------------------------------------------------------------
// Tests: validatePublicImageUrl
// ------------------------------------------------------------------------------

function runValidatorTests() {
    const { validatePublicImageUrl } = require('../helpers/urlValidator');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  validatePublicImageUrl — allowed URLs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    recordTest('allows https URL', () => {
        const result = validatePublicImageUrl('https://example.com/image.png');
        assert(result === 'https://example.com/image.png', `unexpected result: ${result}`);
    });

    recordTest('allows http URL', () => {
        validatePublicImageUrl('http://example.com/image.png');
    });

    recordTest('allows public IPv4 (not RFC-1918)', () => {
        validatePublicImageUrl('http://172.32.0.1/image.png');
    });

    recordTest('allows public IPv6 (Cloudflare DNS)', () => {
        validatePublicImageUrl('http://[2606:4700:4700::1111]/image.png');
    });

    recordTest('allows URL with path and query', () => {
        validatePublicImageUrl('https://cdn.example.com/img/foo.png?v=2');
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  validatePublicImageUrl — rejected URLs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const shouldReject = [
        ['empty string',                    ''],
        ['null',                             null],
        ['not a URL',                        'not-a-url'],
        ['local path /etc/passwd',           '/etc/passwd'],
        ['local path ./foo.png',             './foo.png'],
        ['file:// scheme',                   'file:///etc/passwd'],
        ['gopher scheme',                    'gopher://example.com/'],
        ['ftp scheme',                       'ftp://example.com/image.png'],
        ['loopback 127.0.0.1',               'http://127.0.0.1/'],
        ['loopback 127.0.0.5',               'http://127.0.0.5/'],
        ['localhost hostname',               'http://localhost/foo'],
        ['*.localhost hostname',             'http://test.localhost/foo'],
        ['*.local hostname',                 'http://printer.local/foo.png'],
        ['*.internal hostname',              'http://api.internal/foo.png'],
        ['RFC-1918 10.x.x.x',               'http://10.0.0.1/'],
        ['RFC-1918 192.168.x.x',             'http://192.168.1.1/'],
        ['RFC-1918 172.16.x.x',              'http://172.16.0.1/'],
        ['RFC-1918 172.20.x.x',              'http://172.20.5.5/'],
        ['link-local 169.254.169.254',       'http://169.254.169.254/latest/meta-data/'],
        ['link-local 169.254.x.x',          'http://169.254.0.1/'],
        ['IPv6 loopback ::1',               'http://[::1]/'],
        ['IPv6 link-local fe80::',           'http://[fe80::1]/'],
        ['IPv4-mapped ::ffff:127.0.0.1',     'http://[::ffff:127.0.0.1]/'],
        ['IPv4-mapped hex ::ffff:7f00:1',    'http://[::ffff:7f00:1]/'],
    ];

    for (const [label, input] of shouldReject) {
        recordTest(`rejects ${label}`, () => {
            let threw = false;
            try { validatePublicImageUrl(input); } catch { threw = true; }
            assert(threw, `expected rejection but got none`);
        });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  validatePublicImageUrl — allowedHosts bypass');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    recordTest('allowedHosts bypasses private IP check', () => {
        validatePublicImageUrl('http://192.168.1.5/image.png', { allowedHosts: ['192.168.1.5'] });
    });

    recordTest('allowedHosts bypasses .local check', () => {
        validatePublicImageUrl('http://printer.local/image.png', { allowedHosts: ['printer.local'] });
    });

    recordTest('allowedHosts does not bypass for different host', () => {
        let threw = false;
        try {
            validatePublicImageUrl('http://192.168.1.5/image.png', { allowedHosts: ['192.168.1.6'] });
        } catch { threw = true; }
        assert(threw, 'expected rejection for host not in allowlist');
    });

    recordTest('empty allowedHosts still validates normally', () => {
        let threw = false;
        try { validatePublicImageUrl('http://printer.local/image.png', { allowedHosts: [] }); }
        catch { threw = true; }
        assert(threw, 'expected rejection');
    });
}

// ------------------------------------------------------------------------------
// Tests: getInsecureOverlayConfig flag parsing
// ------------------------------------------------------------------------------

function runFlagParsingTests() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  getInsecureOverlayConfig — flag parsing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const cases = [
        ['unset',                    undefined,                   null],
        ['"false"',                  'false',                     null],
        ['"0"',                      '0',                         null],
        ['"true"',                   'true',                      true],
        ['"1"',                      '1',                         true],
        ['single host',              '192.168.1.5',               ['192.168.1.5']],
        ['comma-separated hosts',    '192.168.1.5,printer.local', ['192.168.1.5', 'printer.local']],
        ['hosts with spaces',        ' 192.168.1.5 , foo.local ', ['192.168.1.5', 'foo.local']],
    ];

    for (const [label, envValue, expected] of cases) {
        recordTest(`ALLOW_INSECURE_OVERLAY_URLS=${label}`, () => {
            if (envValue === undefined) {
                delete process.env.ALLOW_INSECURE_OVERLAY_URLS;
            } else {
                process.env.ALLOW_INSECURE_OVERLAY_URLS = envValue;
            }
            const { getInsecureOverlayConfig } = freshFeatureFlags();
            const result = getInsecureOverlayConfig();
            assert(
                JSON.stringify(result) === JSON.stringify(expected),
                `expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`
            );
        });
    }

    // Clean up
    delete process.env.ALLOW_INSECURE_OVERLAY_URLS;
}

// ------------------------------------------------------------------------------
// Main Execution
// ------------------------------------------------------------------------------

function printSummary() {
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
}

if (require.main === module) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  URL VALIDATOR TESTS');
    console.log('═══════════════════════════════════════════════════════════');

    runValidatorTests();
    runFlagParsingTests();
    printSummary();

    process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { results };
