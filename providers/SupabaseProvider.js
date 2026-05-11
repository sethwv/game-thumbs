// ------------------------------------------------------------------------------
// SupabaseProvider.js
// Provider for leagues using Supabase as their backend (e.g. Canadian Baseball League)
// Auto-extracts Supabase project URL and anon key from the league website JS bundles,
// mirroring the HockeyTech website config-extraction pattern.
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
const logger = require('../helpers/logger');
const fsCache = require('../helpers/fsCache');
const { TeamNotFoundError } = require('../helpers/errors');
const { REQUEST_TIMEOUT } = require('../helpers/requestConfig');

const SUPABASE_URL_PATTERN = /https:\/\/([a-z0-9]+)\.supabase\.co/;
// Supabase publishable key (new format): sb_publishable_<random>
const PUBLISHABLE_KEY_PATTERN = /sb_publishable_[A-Za-z0-9_-]+/g;
// Supabase anon key (legacy JWT format): eyJhbGci...
const JWT_PATTERN = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const SCRIPT_SRC_PATTERN = /<script[^>]+src=["']([^"']+)["']/gi;

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

class SupabaseProvider extends BaseProvider {
    constructor() {
        super();
        this.TEAM_CACHE_DURATION = 72 * 60 * 60 * 1000;
        this.CONFIG_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
    }

    getProviderId() { return 'supabase'; }
    getConfigKey() { return 'supabase'; }

    // ------------------------------------------------------------------------------
    // Config extraction
    // ------------------------------------------------------------------------------

    /**
     * Decode a JWT payload without verification (client-side, anon key only)
     * @param {string} jwt
     * @returns {Object|null}
     */
    _decodeJwtPayload(jwt) {
        try {
            const payloadB64 = jwt.split('.')[1];
            const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    /**
     * Scan JS bundle text for a Supabase URL + publishable/anon key pair.
     * Prefers the newer sb_publishable_ format; falls back to legacy JWT anon keys.
     * @param {string} js
     * @returns {{ supabaseUrl: string|null, apiKey: string|null }}
     */
    _extractFromJs(js) {
        const urlMatch = js.match(SUPABASE_URL_PATTERN);
        const supabaseUrl = urlMatch ? urlMatch[0] : null;

        // New format: sb_publishable_<random>
        const publishableMatch = js.match(PUBLISHABLE_KEY_PATTERN);
        if (publishableMatch) {
            return { supabaseUrl, apiKey: publishableMatch[0] };
        }

        // Legacy format: JWT with role=anon in payload
        const jwts = [...js.matchAll(JWT_PATTERN)].map(m => m[0]);
        const anonKeys = jwts.filter(jwt => {
            const payload = this._decodeJwtPayload(jwt);
            return payload && payload.role === 'anon';
        });

        return { supabaseUrl, apiKey: anonKeys[0] || null };
    }

    /**
     * Extract a team-ID → absolute logo URL map from a JS bundle.
     * Looks for a VX={TEAMID:VAR,...} object where each VAR is defined as
     * an /assets/*.png path constant in the same bundle.
     * @param {string} js - Bundle source
     * @param {string} baseUrl - Website origin (e.g. "https://cbl.ca")
     * @returns {Object} e.g. { BARRIEBAYCATS: "https://cbl.ca/assets/barrie-baycats-Bd8nI9Hd.png" }
     */
    _extractLogoMapFromJs(js, baseUrl) {
        // Variable name changes on every deploy (VX, XX, etc.) — find by structure:
        // any identifier assigned an object whose first key is an ALL_CAPS team ID.
        const mapStartRe = /[A-Za-z_$][A-Za-z0-9_$]*=\{(?=[A-Z][A-Z0-9]{4,}:)/;
        const mapStartMatch = mapStartRe.exec(js);
        if (!mapStartMatch) return {};

        const mapIdx = mapStartMatch.index;
        const braceStart = mapIdx + mapStartMatch[0].length - 1; // index of '{'

        // Walk forward to find the matching closing brace
        let depth = 0, end = braceStart;
        for (; end < js.length; end++) {
            if (js[end] === '{') depth++;
            else if (js[end] === '}' && --depth === 0) { end++; break; }
        }
        const vxContent = js.slice(braceStart + 1, end - 1);

        // Asset constants appear ~910 chars before the map; use 2000 for safety
        const searchWindow = js.slice(Math.max(0, mapIdx - 2000), mapIdx);
        const constMap = {};
        const constRe = /(?<![A-Za-z0-9_$])([A-Za-z_$][A-Za-z0-9_$]*)="(\/assets\/[^"]+\.(?:png|jpg|svg|webp))"/g;
        let m;
        while ((m = constRe.exec(searchWindow)) !== null) {
            constMap[m[1]] = baseUrl.replace(/\/$/, '') + m[2];
        }

        // Parse VX pairs: TEAMID:VARNAME
        const logoMap = {};
        const pairRe = /([A-Z][A-Z0-9]+):([A-Za-z_$][A-Za-z0-9_$]*)/g;
        while ((m = pairRe.exec(vxContent)) !== null) {
            if (constMap[m[2]]) logoMap[m[1]] = constMap[m[2]];
        }

        return logoMap;
    }

    /**
     * Resolve a relative or root-relative script URL to an absolute URL
     */
    _resolveScriptUrl(src, baseUrl) {
        try {
            return new URL(src, baseUrl).toString();
        } catch {
            return null;
        }
    }

    /**
     * Extract Supabase config (project URL + anon key) from a league website.
     * Caches the result for CONFIG_CACHE_DURATION.
     * @param {string} websiteUrl
     * @param {boolean} forceRefresh
     * @returns {Promise<{ supabaseUrl: string, apiKey: string }>}
     */
    async extractConfigFromWebsite(websiteUrl, forceRefresh = false) {
        const cacheKey = websiteUrl.toLowerCase();

        if (!forceRefresh) {
            const cached = fsCache.getJSON('supabase-config', cacheKey, this.CONFIG_CACHE_DURATION);
            if (cached) {
                logger.info('Supabase config loaded from cache', { websiteUrl });
                return cached;
            }
        }

        logger.info('Extracting Supabase config from website', { websiteUrl });

        let html;
        try {
            const response = await axios.get(websiteUrl, {
                timeout: REQUEST_TIMEOUT,
                headers: BROWSER_HEADERS
            });
            html = response.data;
        } catch (error) {
            throw new Error(`Failed to fetch ${websiteUrl}: ${error.message}`);
        }

        // Try inline scripts first (fastest, no extra requests)
        const inlineResult = this._extractFromJs(html);
        if (inlineResult.supabaseUrl && inlineResult.apiKey) {
            logger.info('Supabase config found in inline HTML', { websiteUrl, supabaseUrl: inlineResult.supabaseUrl });
            fsCache.setJSON('supabase-config', cacheKey, inlineResult);
            return inlineResult;
        }

        // Collect script URLs from HTML
        const scriptUrls = [];
        let match;
        SCRIPT_SRC_PATTERN.lastIndex = 0;
        while ((match = SCRIPT_SRC_PATTERN.exec(html)) !== null) {
            const resolved = this._resolveScriptUrl(match[1], websiteUrl);
            if (resolved) scriptUrls.push(resolved);
        }

        // Accumulated results across bundles
        let supabaseUrl = inlineResult.supabaseUrl;
        let apiKey = inlineResult.apiKey;
        let logoMap = {};
        const origin = new URL(websiteUrl).origin;

        for (const scriptUrl of scriptUrls) {
            try {
                const jsResponse = await axios.get(scriptUrl, {
                    timeout: REQUEST_TIMEOUT,
                    headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] }
                });
                const js = String(jsResponse.data);
                if (!supabaseUrl || !apiKey) {
                    const bundleResult = this._extractFromJs(js);
                    if (!supabaseUrl && bundleResult.supabaseUrl) supabaseUrl = bundleResult.supabaseUrl;
                    if (!apiKey && bundleResult.apiKey) apiKey = bundleResult.apiKey;
                    if (supabaseUrl && apiKey) {
                        logger.info('Supabase config found in JS bundle', { scriptUrl, supabaseUrl });
                    }
                }
                const bundleLogoMap = this._extractLogoMapFromJs(js, origin);
                if (Object.keys(bundleLogoMap).length > 0) {
                    Object.assign(logoMap, bundleLogoMap);
                    logger.info('Supabase logo map extracted from JS bundle', { scriptUrl, count: Object.keys(bundleLogoMap).length });
                }
            } catch (err) {
                logger.warn('Failed to fetch JS bundle', { scriptUrl, error: err.message });
            }
        }

        if (!supabaseUrl || !apiKey) {
            throw new Error(
                `Could not extract Supabase config from ${websiteUrl}. ` +
                `Found: supabaseUrl=${supabaseUrl}, apiKey=${apiKey ? '[present]' : 'null'}`
            );
        }

        const config = { supabaseUrl, apiKey, logoMap };
        fsCache.setJSON('supabase-config', cacheKey, config);
        return config;
    }

    // ------------------------------------------------------------------------------
    // Team data
    // ------------------------------------------------------------------------------

    /**
     * Get Supabase API config for a league, combining website extraction with
     * any explicit values from leagues.json (explicit values take precedence).
     */
    async _getConfig(league) {
        const providerConfig = this.getLeagueConfig(league) || {};

        // Allow env override for the anon key (useful in CI/production)
        const envKey = process.env.CBL_SUPABASE_API_KEY;

        // If we have both URL and key explicitly configured, skip website extraction
        if (providerConfig.supabaseUrl && (providerConfig.apiKey || envKey)) {
            return {
                supabaseUrl: providerConfig.supabaseUrl,
                apiKey: envKey || providerConfig.apiKey
            };
        }

        const websiteUrl = providerConfig.websiteUrl;
        if (!websiteUrl) {
            throw new Error(`Supabase provider for league "${league.shortName}" requires a websiteUrl in leagues.json`);
        }

        const extracted = await this.extractConfigFromWebsite(websiteUrl);
        return {
            supabaseUrl: providerConfig.supabaseUrl || extracted.supabaseUrl,
            apiKey: envKey || providerConfig.apiKey || extracted.apiKey,
            logoMap: extracted.logoMap || {}
        };
    }

    /**
     * Fetch all teams from the Supabase teams table.
     * @param {Object} league
     * @returns {Promise<Object[]>} Raw Supabase team rows
     */
    async fetchTeams(league) {
        const cacheKey = `teams_${league.shortName}`;
        const cached = fsCache.getJSON('supabase', cacheKey, this.TEAM_CACHE_DURATION);
        if (cached) return cached;

        const { supabaseUrl, apiKey } = await this._getConfig(league);
        const providerConfig = this.getLeagueConfig(league) || {};
        const table = providerConfig.teamsTable || 'teams';

        logger.info('Fetching teams from Supabase', { league: league.shortName, supabaseUrl, table });

        try {
            const response = await axios.get(`${supabaseUrl}/rest/v1/${table}`, {
                params: { select: '*' },
                timeout: REQUEST_TIMEOUT,
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            });

            const teams = response.data;

            if (!Array.isArray(teams)) {
                throw new Error(`Unexpected response format: expected array, got ${typeof teams}`);
            }

            if (teams.length > 0) {
                logger.info('Supabase teams columns', {
                    league: league.shortName,
                    columns: Object.keys(teams[0]),
                    count: teams.length
                });
            }

            fsCache.setJSON('supabase', cacheKey, teams);
            return teams;
        } catch (error) {
            throw this.handleHttpError(error, `fetchTeams(${league.shortName})`);
        }
    }

    /**
     * Map a raw Supabase team row to a normalized object compatible with
     * getTeamMatchScoreWithOverrides.
     * @param {Object} row
     * @param {Object} [logoMap] - Optional team-ID → logo URL map from bundle extraction
     * @returns {Object}
     */
    _normalizeRow(row, logoMap) {
        const fullName = row.team_name || row.full_name || row.display_name || row.name || '';

        // city may be missing from the DB row — fall back to extracting the leading
        // word(s) from team_name that match common city names (best-effort)
        const city = row.city || row.location || '';

        // Nickname = team_name with city prefix stripped (e.g. "Barrie Baycats" → "Baycats")
        const name = row.nickname || row.team_nickname || (
            city && fullName.startsWith(city)
                ? fullName.slice(city.length).trim()
                : fullName
        );

        // Derive abbreviation from nickname words (e.g. "Maple Leafs" → "ML", "Baycats" → "BAY")
        const abbreviation = row.abbreviation || row.abbrev || row.code || (() => {
            const words = name.split(/\s+/).filter(Boolean);
            return words.length > 1
                ? words.map(w => w[0]).join('').toUpperCase()
                : name.substring(0, 3).toUpperCase();
        })();

        const logo = row.logo_url || row.logo || row.team_logo_url || (logoMap && logoMap[row.id]) || null;
        const logoAlt = row.logo_url_light || row.logo_url_dark || null;

        const rawColor = row.team_colors || row.primary_color || row.color || null;
        const rawAlt   = row.secondary_color || row.alternate_color || null;
        const normalizeHex = c => c ? (c.startsWith('#') ? c : `#${c}`) : null;

        return {
            id: String(row.id || row.team_id || ''),
            city,
            name,
            fullName,
            abbreviation,
            logo,
            logoAlt,
            color: normalizeHex(rawColor),
            alternateColor: normalizeHex(rawAlt),
            _raw: row
        };
    }

    // ------------------------------------------------------------------------------
    // BaseProvider interface
    // ------------------------------------------------------------------------------

    async resolveTeam(league, teamIdentifier) {
        try {
            const { logoMap } = await this._getConfig(league);
            const rows = await this.fetchTeams(league);
            const teams = rows.map(row => this._normalizeRow(row, logoMap));

            const teamMatches = teams.map(team => ({
                team,
                score: getTeamMatchScoreWithOverrides(
                    teamIdentifier,
                    {
                        city: team.city,
                        name: team.name,
                        fullName: team.fullName,
                        abbreviation: team.abbreviation
                    },
                    team.city ? team.city.toLowerCase().replace(/\s+/g, '-') : team.id,
                    league.shortName
                )
            }));

            teamMatches.sort((a, b) => b.score - a.score);
            const bestMatch = teamMatches[0];

            if (!bestMatch || bestMatch.score < 300) {
                throw new TeamNotFoundError(teamIdentifier, league, teams);
            }

            const team = bestMatch.team;

            // Extract colors from logo if not already in the data
            let color = team.color;
            let alternateColor = team.alternateColor;

            if ((!color || !alternateColor) && team.logo) {
                const colorCacheKey = `supabase_${team.id}_${league.shortName}`;
                let colors = fsCache.getJSON('colors', colorCacheKey);
                if (!colors) {
                    try {
                        const extracted = await extractDominantColors(team.logo, 2);
                        colors = { primary: extracted[0] || null, secondary: extracted[1] || null };
                        fsCache.setJSON('colors', colorCacheKey, colors);
                    } catch (colorError) {
                        logger.warn('Failed to extract colors from logo', {
                            team: team.fullName,
                            league: league.shortName,
                            error: colorError.message
                        });
                        colors = { primary: null, secondary: null };
                    }
                }
                if (!color) color = colors.primary;
                if (!alternateColor) alternateColor = colors.secondary;
            }

            return {
                id: team.id,
                city: team.city,
                name: team.name,
                fullName: team.fullName,
                abbreviation: team.abbreviation,
                conference: team._raw.conference || null,
                division: team._raw.division || null,
                logo: team.logo,
                logoAlt: team._raw.logo_url_dark || team._raw.logo_alt || null,
                color,
                alternateColor,
                providerId: this.getProviderId(),
                providerData: team._raw
            };

        } catch (error) {
            if (error instanceof TeamNotFoundError) throw error;
            throw new Error(`Supabase provider error for ${league.shortName}: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        if (darkLogoPreferred && league.logoUrlDark) return league.logoUrlDark;
        return league.logoUrl || null;
    }

    clearCache() {
        fsCache.clearSubdir('supabase');
        fsCache.clearSubdir('supabase-config');
        logger.info('Supabase provider cache cleared');
    }

    static async displayAllCredentials() {
        const { getAllLeagues } = require('../leagues');
        const provider = new SupabaseProvider();
        const leagues = getAllLeagues();

        console.log('\n⚾ Supabase Credentials\n');
        console.log('League'.padEnd(40) + ' Key'.padEnd(8) + ' Supabase URL'.padEnd(55) + ' API Key');
        console.log('='.repeat(130));

        for (const [key, league] of Object.entries(leagues)) {
            const config = provider.getLeagueConfig(league);
            if (!config) continue;

            try {
                const extracted = await provider._getConfig(league);
                console.log(`${league.name.padEnd(40)} ${key.toUpperCase().padEnd(8)} ${extracted.supabaseUrl.padEnd(55)} ${extracted.apiKey || 'N/A'}`);
            } catch (error) {
                console.log(`${league.name.padEnd(40)} ${key.toUpperCase().padEnd(8)} ❌ Failed: ${error.message}`);
            }
        }

        console.log('');
    }
}

const sharedInstance = new SupabaseProvider();
module.exports = sharedInstance;
module.exports.SupabaseProvider = SupabaseProvider;
