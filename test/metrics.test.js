// ------------------------------------------------------------------------------
// metrics.test.js
// Verifies the opt-in Prometheus exporter and its bounded request rollups.
// ------------------------------------------------------------------------------

const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3011;
const BASE_URL = `http://localhost:${PORT}`;

function request(pathname) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${pathname}`, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString()
            }));
        }).on('error', reject);
    });
}

async function waitForServer() {
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            if ((await request('/health')).statusCode === 200) return;
        } catch (error) {
            // The child process may still be loading application configuration.
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Metrics test server did not start');
}

async function startServer(metricsEnabled) {
    const server = spawn('node', [path.join(__dirname, '..', 'src', 'index.js')], {
        env: {
            ...process.env,
            PORT: String(PORT),
            METRICS_ENABLED: String(metricsEnabled),
            NODE_ENV: 'development',
            TRUST_PROXY: '0',
            RATE_LIMIT_PER_MINUTE: '0',
            IMAGE_CACHE_HOURS: '0',
            LOG_TO_FILE: 'false',
            SHOW_TIMESTAMP: 'false'
        },
        stdio: 'ignore'
    });

    await waitForServer();
    return server;
}

function stopServer(server) {
    return new Promise((resolve) => {
        server.once('exit', resolve);
        server.kill('SIGTERM');
    });
}

function metricValue(body, metricName, labels) {
    const line = body.split('\n').find(value =>
        value.startsWith(`${metricName}{`) && labels.every(label => value.includes(label))
    );
    assert(line, `Missing ${metricName} sample with ${labels.join(', ')}`);
    return Number(line.split(' ').at(-1));
}

async function run() {
    let server = await startServer(false);
    try {
        const response = await request('/metrics');
        assert.strictEqual(response.statusCode, 444, 'Metrics must be unavailable by default');
    } finally {
        await stopServer(server);
    }

    server = await startServer(true);
    try {
        await request('/health');
        const firstScrape = await request('/metrics');

        assert.strictEqual(firstScrape.statusCode, 200);
        assert.match(firstScrape.headers['content-type'], /^text\/plain; version=0\.0\.4/);
        assert.match(firstScrape.body, /^# HELP process_cpu_user_seconds_total/m);
        assert.match(firstScrape.body, /^# HELP game_thumbs_http_requests_total/m);
        assert.match(firstScrape.body, /^# HELP game_thumbs_http_request_duration_seconds/m);

        const labels = ['cache="not_applicable"', 'endpoint="health"', 'league="_none"', 'method="GET"', 'status_code="200"'];
        const requestCount = metricValue(firstScrape.body, 'game_thumbs_http_requests_total', labels);
        assert(requestCount >= 2, 'Health requests should be observed');

        const secondScrape = await request('/metrics');
        assert.strictEqual(
            metricValue(secondScrape.body, 'game_thumbs_http_requests_total', labels),
            requestCount,
            'Metrics scrapes must not increment application request totals'
        );
    } finally {
        await stopServer(server);
    }

    console.log('Prometheus metrics tests passed');
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
