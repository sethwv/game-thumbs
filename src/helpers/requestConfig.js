// ------------------------------------------------------------------------------
// requestConfig.js
// Shared request configuration: timeout, browser headers, and optional SOCKS5 proxy.
// Bullpen routing/URL-building lives in httpClient.js, which imports the
// BULLPEN_* values below.
// ------------------------------------------------------------------------------

const { SocksProxyAgent } = require('socks-proxy-agent');
const logger = require('./logger');

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

// Bullpen proxy: fronts ESPN/MLB/TheSportsDB/HockeyTech/FlagCDN/NCAA so game-thumbs no
// longer needs to hold those upstreams' credentials itself. When unset, httpClient.js
// falls back to hitting each upstream directly. See docs/bullpen-translation-guide.md
// for the full contract.
const BULLPEN_BASE_URL = (process.env.BULLPEN_BASE_URL || '').replace(/\/+$/, '');
const BULLPEN_API_KEY = process.env.BULLPEN_API_KEY || '';

if (!BULLPEN_BASE_URL || !BULLPEN_API_KEY) {
    // logger.warn('BULLPEN_BASE_URL/BULLPEN_API_KEY not set — provider requests will go directly to upstream APIs instead of through Bullpen');
} else {
    logger.info(`Bullpen enabled — provider requests will be routed through ${BULLPEN_BASE_URL}`);
}

// Realistic browser User-Agent so feeds/sites don't reject obvious bots.
// Overridable via env for quick rotation without a code change.
const SCRAPER_USER_AGENT = process.env.SCRAPER_USER_AGENT ||
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Default browser-like headers shared across scraping requests.
const BROWSER_HEADERS = {
    'User-Agent': SCRAPER_USER_AGENT,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// Build a browser header set, optionally overriding the Accept value.
function getBrowserHeaders(accept) {
    if (!accept) {
        return { ...BROWSER_HEADERS };
    }
    return { ...BROWSER_HEADERS, Accept: accept };
}

// Lazily-built, memoized SOCKS5 agent. Rotation is handled by the proxy
// provider behind the SOCKS_PROXY endpoint, so a single agent instance is fine.
const SOCKS_PROXY = process.env.SOCKS_PROXY;
let socksAgent;
let socksAgentFailed = false;

function getSocksAgent() {
    if (!SOCKS_PROXY || socksAgentFailed) {
        return null;
    }
    if (!socksAgent) {
        try {
            socksAgent = new SocksProxyAgent(SOCKS_PROXY);
        } catch (error) {
            socksAgentFailed = true;
            logger.warn('Invalid SOCKS_PROXY, requests will go direct', { error: error.message });
            return null;
        }
    }
    return socksAgent;
}

// Returns axios config fragment that routes the request through the SOCKS5 proxy
// when `enabled` is true and SOCKS_PROXY is configured; otherwise an empty object.
// `proxy: false` prevents axios from also applying env HTTP(S)_PROXY on top.
function getProxyRequestConfig(enabled) {
    if (!enabled) {
        return {};
    }
    const agent = getSocksAgent();
    if (!agent) {
        return {};
    }
    return { httpAgent: agent, httpsAgent: agent, proxy: false };
}

// HockeyTech league logos are hosted on the same Cloudflare-protected league
// sites (e.g. theahl.com) that 403 datacenter IPs during config extraction, so
// gate those logo fetches on the extraction toggle. The host set is derived from
// the HockeyTech leagues in leagues.json (their logoUrl / logoUrlDark /
// websiteUrl hosts) so it stays in sync with config without a hardcoded list.
// leaguestat's team-logo CDN is intentionally excluded: it serves fine direct.
const PROXY_EXTRACT = /^(1|true|yes)$/i.test(process.env.HOCKEYTECH_PROXY_EXTRACT || '');

let hockeytechHostSet;
function getHockeytechLogoHosts() {
    if (hockeytechHostSet) {
        return hockeytechHostSet;
    }
    hockeytechHostSet = new Set();
    try {
        const leagues = require('../leagues.json');
        const addHost = (u) => {
            try {
                hockeytechHostSet.add(new URL(u).hostname.toLowerCase());
            } catch { /* relative path / non-URL: ignore */ }
        };
        for (const league of Object.values(leagues)) {
            if (!league || typeof league !== 'object') continue;
            const providers = Array.isArray(league.providers) ? league.providers : [];
            const htConfigs = providers
                .map(p => p && (p.hockeyTech || p.hockeyTechConfig))
                .filter(Boolean);
            if (htConfigs.length === 0) continue; // not a HockeyTech league
            if (league.logoUrl) addHost(league.logoUrl);
            if (league.logoUrlDark) addHost(league.logoUrlDark);
            for (const cfg of htConfigs) {
                if (cfg.websiteUrl) addHost(cfg.websiteUrl);
            }
        }
    } catch (error) {
        logger.warn('Could not derive HockeyTech logo hosts', { error: error.message });
    }
    return hockeytechHostSet;
}

// Returns proxy config for a URL when it points at a Cloudflare-protected
// HockeyTech league site and the extraction toggle is on; otherwise an empty object.
function getHockeytechAssetProxyConfig(url) {
    if (!PROXY_EXTRACT || typeof url !== 'string') {
        return {};
    }
    try {
        const host = new URL(url).hostname.toLowerCase();
        return getProxyRequestConfig(getHockeytechLogoHosts().has(host));
    } catch {
        return {};
    }
}

module.exports = {
    REQUEST_TIMEOUT,
    SCRAPER_USER_AGENT,
    BROWSER_HEADERS,
    getBrowserHeaders,
    getProxyRequestConfig,
    getHockeytechAssetProxyConfig,
    BULLPEN_BASE_URL,
    BULLPEN_API_KEY
};
