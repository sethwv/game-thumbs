// ------------------------------------------------------------------------------
// app/metrics.js
// Opt-in Prometheus metrics for process health and bounded HTTP request rollups.
// ------------------------------------------------------------------------------

const client = require('prom-client');
const { isMetricsEnabled } = require('../helpers/featureFlags');

const registry = new client.Registry();
const IMAGE_ENDPOINTS = new Set([
    'thumb', 'logo', 'cover', 'teamlogo', 'leaguelogo', 'leaguethumb', 'leaguecover'
]);
const reservedPaths = new Set(['health', 'info', 'metrics', 'favicon.ico', 'apple-touch-icon.png', 'apple-touch-icon-precomposed.png']);
let leagueNames;

let requestCountByLeague;
let requestCountByEndpoint;
let responseCount;
let imageCacheCount;
let requestDuration;

function createLeagueNameMap() {
    const names = new Map();
    const { leagues } = require('../leagues');

    for (const [key, league] of Object.entries(leagues)) {
        for (const name of [key, league.shortName, league.name, ...(league.aliases || [])]) {
            if (name) names.set(normalizeLeagueName(name), key);
        }
    }

    return names;
}

function normalizeLeagueName(value) {
    return value.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function initializeMetrics() {
    if (!isMetricsEnabled() || requestCountByLeague) return;

    leagueNames = createLeagueNameMap();
    client.collectDefaultMetrics({ register: registry });

    requestCountByLeague = new client.Counter({
        name: 'game_thumbs_http_requests_total',
        help: 'Total HTTP requests handled by Game Thumbs, grouped by league.',
        labelNames: ['league'],
        registers: [registry]
    });
    requestCountByEndpoint = new client.Counter({
        name: 'game_thumbs_http_requests_by_endpoint_total',
        help: 'Total HTTP requests handled by Game Thumbs, grouped by endpoint.',
        labelNames: ['endpoint'],
        registers: [registry]
    });
    responseCount = new client.Counter({
        name: 'game_thumbs_http_responses_total',
        help: 'Total HTTP responses handled by Game Thumbs, grouped by status class.',
        labelNames: ['status_class'],
        registers: [registry]
    });
    imageCacheCount = new client.Counter({
        name: 'game_thumbs_image_cache_requests_total',
        help: 'Total image requests handled by Game Thumbs, grouped by application cache result.',
        labelNames: ['cache'],
        registers: [registry]
    });
    requestDuration = new client.Histogram({
        name: 'game_thumbs_http_request_duration_seconds',
        help: 'HTTP request duration in seconds for Game Thumbs.',
        labelNames: ['endpoint'],
        registers: [registry]
    });
}

function getEndpoint(req, statusCode) {
    const parts = req.path.split('/').filter(Boolean);
    const lastPart = parts.at(-1)?.replace(/\.png$/, '');

    if (parts.length === 0) return 'root';
    if (reservedPaths.has(parts[0])) return parts[0].replace(/\..*$/, '');
    if (IMAGE_ENDPOINTS.has(lastPart)) return lastPart;
    if (lastPart === 'raw') return 'raw';
    return statusCode === 444 ? 'not_found' : 'other';
}

function getLeague(req) {
    const firstPart = req.path.split('/').filter(Boolean)[0];
    if (!firstPart || reservedPaths.has(firstPart)) return '_none';
    return leagueNames.get(normalizeLeagueName(req.params.league || firstPart)) || '_unknown';
}

function getCacheStatus(req, endpoint) {
    if (!IMAGE_ENDPOINTS.has(endpoint)) return 'not_applicable';
    return req._logged || req._servedFromRouteCache ? 'hit' : 'miss';
}

function getStatusClass(statusCode) {
    const statusClass = Math.floor(statusCode / 100);
    return statusClass >= 1 && statusClass <= 5 ? `${statusClass}xx` : 'other';
}

function metricsMiddleware(req, res, next) {
    if (!requestCountByLeague || req.path === '/metrics') return next();

    const start = process.hrtime.bigint();
    res.once('finish', () => {
        const endpoint = getEndpoint(req, res.statusCode);
        const cache = getCacheStatus(req, endpoint);
        const duration = Number(process.hrtime.bigint() - start) / 1e9;

        requestCountByLeague.inc({ league: getLeague(req) });
        requestCountByEndpoint.inc({ endpoint });
        responseCount.inc({ status_class: getStatusClass(res.statusCode) });
        if (cache !== 'not_applicable') imageCacheCount.inc({ cache });
        requestDuration.observe({ endpoint }, duration);
    });

    next();
}

async function metricsHandler(req, res) {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
}

module.exports = { initializeMetrics, metricsMiddleware, metricsHandler };
