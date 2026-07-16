// ------------------------------------------------------------------------------
// httpClient.js
// The single place application code makes outbound HTTP requests. Wraps axios
// so Bullpen routing (URL building, X-Bullpen-Key) lives in one file instead of
// being hand-assembled at every call site, and falls back to hitting each
// upstream directly when Bullpen isn't configured (BULLPEN_BASE_URL/
// BULLPEN_API_KEY unset) rather than failing.
// ------------------------------------------------------------------------------

const axios = require('axios');
const {
    REQUEST_TIMEOUT,
    BULLPEN_BASE_URL,
    BULLPEN_API_KEY,
    getBrowserHeaders,
    getProxyRequestConfig,
    getHockeytechAssetProxyConfig
} = require('./requestConfig');

const bullpenEnabled = Boolean(BULLPEN_BASE_URL && BULLPEN_API_KEY);

// Raw upstream base URL per Bullpen target, plus any raw-mode-only quirk that
// Bullpen normally absorbs server-side. Sourced from the pre-Bullpen commit
// (ea38101) that these targets replaced.
const TARGET_REGISTRY = {
    'espn-core': { rawBase: 'https://sports.core.api.espn.com/v2' },
    'espn-site': { rawBase: 'https://site.api.espn.com/apis/site/v2' },
    'espn-cdn': { rawBase: 'https://a.espncdn.com' },
    'flagcdn': { rawBase: 'https://flagcdn.com' },
    'ncaa': { rawBase: 'https://www.ncaa.com' },
    'mlb-stats': { rawBase: 'https://statsapi.mlb.com/api/v1' },
    'mlb-static': { rawBase: 'https://www.mlbstatic.com/team-logos' },
    // Bullpen maps client_code -> upstream key server-side; raw mode needs the
    // key back as a query param.
    'hockeytech': {
        rawBase: 'https://lscluster.hockeytech.com',
        rawExtraParams: () => ({ key: process.env.HOCKEYTECH_API_KEY || 'f1aa699db3d81487' })
    },
    // Bullpen-mode call sites hardcode a literal "x" path segment as a
    // placeholder Bullpen substitutes server-side; raw mode swaps in the real key.
    'thesportsdb': {
        rawBase: 'https://www.thesportsdb.com',
        rawPath: (path) => path.replace('/json/x/', `/json/${process.env.THESPORTSDB_API_KEY || '3'}/`)
    }
};

function normalizePath(path) {
    if (!path) return '';
    return path.startsWith('/') ? path : `/${path}`;
}

// Bullpen forwards {path} verbatim onto the target's real upstream host — it does not
// rewrite, strip, or add any prefix. So the path we send it must be the exact real
// upstream path, including any version/namespace segment baked into that target's
// rawBase (e.g. espn-core needs a leading /v2, espn-site needs /apis/site/v2). Do not
// "simplify" this back to swapping in a bare caller-supplied path — that's the bug
// this function fixes (see game-thumbs-* / Bullpen path-prefix incident).
function bullpenUrlFromRawUrl(target, rawUrl) {
    const u = new URL(rawUrl);
    return `${BULLPEN_BASE_URL}/v1/${target}${u.pathname}${u.search}`;
}

// Resolves a target+path to the URL to actually fetch: the Bullpen URL when
// Bullpen is configured, otherwise the target's raw upstream URL. Exported
// because some callers need the URL as a stored/returned value (e.g. a
// headshot or logo URL handed back to a caller), not just for an immediate fetch.
function resolveUrl(target, path) {
    const entry = TARGET_REGISTRY[target];
    if (!entry) {
        throw new Error(`httpClient: unknown target "${target}"`);
    }
    const rawPath = entry.rawPath ? entry.rawPath(normalizePath(path)) : normalizePath(path);
    const rawUrl = `${entry.rawBase}${rawPath}`;
    return bullpenEnabled ? bullpenUrlFromRawUrl(target, rawUrl) : rawUrl;
}

// ESPN's core API embeds absolute $ref links back to itself in list responses
// (e.g. paginated athlete lists). When Bullpen is enabled those still point at
// the real upstream host and must be rewritten before fetching; when disabled
// they're already the correct URL to fetch as-is.
function rewriteEspnCoreRef(ref) {
    if (!bullpenEnabled || typeof ref !== 'string') {
        return ref;
    }
    const rawOrigin = new URL(TARGET_REGISTRY['espn-core'].rawBase).origin;
    if (!ref.startsWith(rawOrigin)) {
        return ref;
    }
    return bullpenUrlFromRawUrl('espn-core', ref);
}

// Attaches X-Bullpen-Key only when `url` actually targets Bullpen. This gate
// matters for shared download helpers that also fetch arbitrary CDN/user URLs
// — attaching the header unconditionally would leak the key. It also naturally
// no-ops when Bullpen is disabled, since BULLPEN_BASE_URL is then empty.
function defensiveBullpenHeaders(url) {
    if (!bullpenEnabled || typeof url !== 'string' || !url.startsWith(BULLPEN_BASE_URL)) {
        return {};
    }
    return { 'X-Bullpen-Key': BULLPEN_API_KEY };
}

// Generic "fetch this exact URL" primitive: applies the defensive Bullpen
// header gate above. Used by apiGet/downloadBinary, and directly by
// callers that already have a fully-built URL (e.g. a pre-resolved base URL
// with a path suffix appended).
async function fetchUrl(url, opts = {}) {
    const { headers, ...rest } = opts;
    return axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        ...rest,
        headers: { ...headers, ...defensiveBullpenHeaders(url) }
    });
}

// Bullpen-routed request: resolves target+path to a URL (Bullpen or raw
// fallback), applies each target's raw-mode-only quirk automatically, and fetches.
async function apiGet(target, path, opts = {}) {
    const entry = TARGET_REGISTRY[target];
    if (!entry) {
        throw new Error(`httpClient: unknown target "${target}"`);
    }
    const url = resolveUrl(target, path);
    const params = (!bullpenEnabled && entry.rawExtraParams)
        ? { ...entry.rawExtraParams(), ...opts.params }
        : opts.params;
    return fetchUrl(url, { ...opts, params });
}

// Arbitrary/scrape URL request: browser headers by default, optional SOCKS5
// proxy, NEVER attaches X-Bullpen-Key regardless of URL shape (used for
// Supabase REST + website scraping, which are never Bullpen-routed).
async function directGet(url, opts = {}) {
    const { headers, browserHeaders = true, proxy = false, accept, ...rest } = opts;
    const baseHeaders = browserHeaders ? getBrowserHeaders(accept) : {};
    return axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        ...rest,
        headers: { ...baseHeaders, ...headers },
        ...getProxyRequestConfig(proxy)
    });
}

// Binary/image download: arraybuffer, redirects, image-friendly headers.
// Bullpen key attached only if the URL actually points at Bullpen (see
// defensiveBullpenHeaders); HockeyTech Cloudflare SOCKS proxying applied via
// the existing host-derived gate.
async function downloadBinary(url, opts = {}) {
    const { headers, ...rest } = opts;
    return fetchUrl(url, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
        ...rest,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/png,image/jpeg,image/jpg,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.espn.com/',
            ...headers
        },
        ...getHockeytechAssetProxyConfig(url)
    });
}

module.exports = {
    bullpenEnabled,
    resolveUrl,
    rewriteEspnCoreRef,
    fetchUrl,
    apiGet,
    directGet,
    downloadBinary
};
