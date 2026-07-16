// ------------------------------------------------------------------------------
// HockeyTechProvider.js
// HockeyTech API provider implementation
// Handles team resolution and data fetching from HockeyTech LeagueStat API
// ------------------------------------------------------------------------------

const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, generateSlug } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
const logger = require('../helpers/logger');
const fsCache = require('../helpers/fsCache');
const { TeamNotFoundError } = require('../helpers/errors');
const { BROWSER_HEADERS } = require('../helpers/requestConfig');
const httpClient = require('../helpers/httpClient');

// Independent per-path proxy toggle (see helpers/requestConfig.js + SOCKS_PROXY).
// Only gates config-extraction scraping of league websites (out of Bullpen's
// scope); the feed itself now targets Bullpen, which handles TLS/HTTP
// fingerprinting server-side, so no proxy toggle is needed for it anymore.
const PROXY_EXTRACT = /^(1|true|yes)$/i.test(process.env.HOCKEYTECH_PROXY_EXTRACT || '');

class HockeyTechProvider extends BaseProvider {
    constructor() {
        super();
        this.refreshTimers = new Map(); // Track scheduled config refreshes
        this.TEAM_CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 hours
        this.CONFIG_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.SEASONS_TO_AGGREGATE = 3;  // combine up to 3 substantive seasons for full roster coverage
        this.MIN_SEASON_TEAMS = 4;      // skip All-Star/exhibition seasons with fewer real teams
    }

    getProviderId() {
        return 'hockeytech';
    }

    getConfigKey() {
        return ['hockeyTech', 'hockeyTechConfig'];
    }

    /**
     * Get league config, attempting to auto-extract from website if configured
     * @param {Object} league - League object
     * @returns {Promise<Object|null>} Config object or null
     */
    async getLeagueConfigAsync(league) {
        // Get the provider config
        const syncConfig = this.getLeagueConfig(league);
        
        // If we have an explicit clientCode, use it — that's all the Bullpen-routed
        // feed request needs now (Bullpen maps client_code to the upstream key
        // server-side, so apiKey is no longer required here).
        if (syncConfig && syncConfig.clientCode) {
            return syncConfig;
        }

        // If websiteUrl is configured in the provider config, try to extract
        if (syncConfig && syncConfig.websiteUrl) {
            try {
                // Extract and schedule refresh for this URL
                const extractedConfig = await this.extractAndScheduleConfig(syncConfig.websiteUrl);
                if (extractedConfig && extractedConfig.clientCode) {
                    return extractedConfig;
                }
                logger.warn('Extracted incomplete HockeyTech config', {
                    league: league.shortName,
                    url: syncConfig.websiteUrl,
                    hasClientCode: !!extractedConfig?.clientCode,
                    hasApiKey: !!extractedConfig?.apiKey
                });
            } catch (error) {
                logger.warn('Could not auto-extract HockeyTech config', {
                    league: league.shortName,
                    url: syncConfig.websiteUrl,
                    error: error.message
                });
            }
        }

        // Return any config that supplies a clientCode (apiKey optional, see above)
        if (syncConfig && syncConfig.clientCode) {
            return syncConfig;
        }

        return null; // Don't return incomplete configs
    }

    async resolveTeam(league, teamIdentifier) {
        try {
            const teams = await this.fetchTeamData(league);
            const teamSlug = generateSlug(teamIdentifier);

            // Find best matching team using the team matching utility
            const teamMatches = teams.map(team => ({
                team,
                score: getTeamMatchScoreWithOverrides(
                    teamIdentifier,
                    {
                        city: team.city,
                        name: team.nickname,
                        fullName: team.name,
                        abbreviation: team.code
                    },
                    generateSlug(team.city), // Team slug for override lookup
                    league.shortName // League key for override lookup
                )
            }));

            // Sort by match score
            teamMatches.sort((a, b) => b.score - a.score);

            const bestMatch = teamMatches[0];

            // Require a minimum match score (300 out of 1000)
            if (!bestMatch || bestMatch.score < 300) {
                throw new TeamNotFoundError(teamIdentifier, league, teams);
            }

            const team = bestMatch.team;

            // Extract colors from logo using filesystem cache
            const colorCacheKey = `ht_${team.id}_${league.shortName}`;
            let colors = fsCache.getJSON('colors', colorCacheKey);
            if (!colors) {
                try {
                    const extractedColors = await extractDominantColors(team.team_logo_url, 2);
                    colors = {
                        primary: extractedColors[0] || null,
                        secondary: extractedColors[1] || null
                    };
                    fsCache.setJSON('colors', colorCacheKey, colors);
                } catch (colorError) {
                    logger.warn('Failed to extract colors from logo', {
                        team: team.name,
                        league: league.shortName,
                        error: colorError.message
                    });
                    colors = { primary: null, secondary: null };
                }
            }

            // Return standardized team object
            return {
                id: team.id,
                city: team.city,
                name: team.nickname,
                fullName: team.name,
                abbreviation: team.code,
                conference: null, // HockeyTech uses divisions, not conferences
                division: team.division_long_name || team.division_short_name || null,
                logo: team.team_logo_url,
                logoAlt: null, // HockeyTech doesn't provide alternate logos
                color: colors.primary,
                alternateColor: colors.secondary,
                providerId: this.getProviderId(),
                providerData: {
                    divisionId: team.division_id,
                    divisionShortName: team.division_short_name
                }
            };

        } catch (error) {
            if (error instanceof TeamNotFoundError) {
                throw error;
            }
            throw new Error(`HockeyTech API error for ${league.shortName}: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        // HockeyTech doesn't provide league logos through their API
        // Return local assets if configured in leagues.json
        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        return league.logoUrl || null;
    }

    clearCache() {
        fsCache.clearSubdir('hockeytech');
        fsCache.clearSubdir('hockeytech-config');
        logger.info('HockeyTech provider cache cleared');
    }

    /**
     * Initialize cache from disk and preload configurations
     * Call this at startup, similar to ESPNAthleteProvider.initializeCache()
     */
    async initializeCache() {
        // Preload and schedule refreshes for all leagues
        const { getAllLeagues } = require('../leagues');
        const leagues = getAllLeagues();
        const extractPromises = [];

        for (const league of Object.values(leagues)) {
            if (league.providers && Array.isArray(league.providers)) {
                for (const providerConfig of league.providers) {
                    const htConfig = providerConfig.hockeyTech || providerConfig.hockeyTechConfig;
                    if (htConfig && htConfig.websiteUrl && !htConfig.clientCode) {
                        // Only extract if websiteUrl is provided but clientCode is not
                        extractPromises.push(
                            this.extractAndScheduleConfig(htConfig.websiteUrl)
                                .then(() => ({ success: true, league: league.shortName }))
                                .catch(error => ({ success: false, league: league.shortName, error: error.message }))
                        );
                    }
                }
            }
        }

        if (extractPromises.length > 0) {
            logger.info(`Initializing HockeyTech config cache for ${extractPromises.length} league(s)`);
            const results = await Promise.allSettled(extractPromises);
            
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success).length;
            
            // Log completion asynchronously so it doesn't block
            setImmediate(() => {
                if (failed > 0) {
                    logger.warn(`HockeyTech config cache initialized: ${successful} succeeded, ${failed} failed`);
                } else {
                    logger.info(`HockeyTech config cache initialized: ${successful} leagues`);
                }
            });
        }
    }

    // ------------------------------------------------------------------------------
    // Private helper methods
    // ------------------------------------------------------------------------------

    async fetchStartedSeasons(clientCode) {
        try {
            const response = await httpClient.apiGet('hockeytech', '/feed/', {
                params: {
                    feed: 'modulekit',
                    view: 'seasons',
                    client_code: clientCode,
                    lang_code: 'en',
                    fmt: 'json'
                },
                headers: BROWSER_HEADERS
            });

            const seasons = response.data?.SiteKit?.Seasons || [];
            const today = new Date().toISOString().slice(0, 10);

            return seasons
                .filter(s => s.start_date && s.start_date <= today)
                .sort((a, b) => parseInt(b.season_id) - parseInt(a.season_id));
        } catch (error) {
            logger.warn('Could not fetch seasons list, using API default', {
                clientCode,
                error: error.message
            });
            return [];
        }
    }

    async fetchTeamsForSeason(clientCode, seasonId) {
        const params = {
            feed: 'modulekit',
            view: 'teamsbyseason',
            client_code: clientCode,
            lang_code: 'en',
            fmt: 'json'
        };

        if (seasonId) {
            params.season_id = seasonId;
        }

        const response = await httpClient.apiGet('hockeytech', '/feed/', {
            params,
            headers: BROWSER_HEADERS
        });

        return response.data?.SiteKit?.Teamsbyseason || [];
    }

    async fetchTeamData(league) {
        const cacheKey = `${league.shortName}_teams`;

        // Return cached data from filesystem if still valid
        const cached = fsCache.getJSON('hockeytech', cacheKey, this.TEAM_CACHE_DURATION);
        if (cached) {
            return cached;
        }

        const hockeyTechConfig = await this.getLeagueConfigAsync(league);
        if (!hockeyTechConfig) {
            throw new Error(`League ${league.shortName} is missing HockeyTech configuration`);
        }

        const { clientCode } = hockeyTechConfig;
        const { seasonId } = hockeyTechConfig;

        if (!clientCode) {
            logger.error('Missing clientCode in HockeyTech config', {
                league: league.shortName,
                config: hockeyTechConfig
            });
            throw new Error(`League ${league.shortName} requires clientCode in HockeyTech configuration`);
        }

        try {
            let teams = [];

            if (seasonId) {
                teams = await this.fetchTeamsForSeason(clientCode, seasonId);
            } else {
                // Aggregate the most recent substantive seasons so that teams eliminated before
                // playoffs (or missing from an All-Star bracket) are still resolvable.
                // Seasons are walked newest-first; first-write-wins keeps the newest team data.
                const seasons = await this.fetchStartedSeasons(clientCode);
                const teamMap = new Map();
                let substantiveCount = 0;

                for (const season of seasons) {
                    if (substantiveCount >= this.SEASONS_TO_AGGREGATE) break;

                    const candidates = await this.fetchTeamsForSeason(clientCode, season.season_id);
                    const real = candidates.filter(t =>
                        t.city && t.city.toUpperCase() !== 'TBD' &&
                        t.name && t.name.toUpperCase() !== 'TBD'
                    );

                    if (real.length < this.MIN_SEASON_TEAMS) {
                        logger.info('HockeyTech: skipping small/exhibition season', {
                            league: league.shortName,
                            season_id: season.season_id,
                            teamCount: real.length
                        });
                        continue;
                    }

                    substantiveCount++;
                    for (const team of real) {
                        if (!teamMap.has(team.id)) teamMap.set(team.id, team);
                    }
                }

                teams = Array.from(teamMap.values());

                // Last resort: no seasons found at all, let the API pick its default
                if (teams.length === 0) {
                    const fallback = await this.fetchTeamsForSeason(clientCode, null);
                    teams = fallback.filter(t =>
                        t.city?.toUpperCase() !== 'TBD' && t.name?.toUpperCase() !== 'TBD'
                    );
                }
            }

            if (teams.length === 0) {
                throw new Error(`No teams found for league: ${clientCode}`);
            }

            fsCache.setJSON('hockeytech', cacheKey, teams);
            return teams;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching teams for ${clientCode}`);
        }
    }

    // ------------------------------------------------------------------------------
    // Config extraction and caching methods
    // ------------------------------------------------------------------------------



    /**
     * Extract HockeyTech config from website HTML/JavaScript
     * @param {string} url - Website URL
     * @returns {Promise<Object>} Config with clientCode and apiKey
     */
    async extractConfigFromWebsite(url, forceRefresh = false) {
        const cacheKey = url.toLowerCase();
        
        // Check filesystem cache first (skip when forcing refresh)
        if (!forceRefresh) {
            const cached = fsCache.getJSON('hockeytech-config', cacheKey, this.CONFIG_CACHE_DURATION);
            if (cached) {
                return cached;
            }
        }

        try {
            const response = await httpClient.directGet(url, { proxy: PROXY_EXTRACT });

            const html = response.data;
            const config = this.parseConfigFromHtml(html);

            // If we found clientCode but no apiKey, check for external JS file
            if (config.clientCode && !config.apiKey) {
                const externalConfig = await this.tryExtractFromExternalJs(html, config.clientCode, url);
                if (externalConfig.apiKey) {
                    config.apiKey = externalConfig.apiKey;
                }
            }

            if (!config.clientCode || !config.apiKey) {
                throw new Error('Could not extract clientCode or apiKey from website');
            }

            // Cache the result to filesystem
            fsCache.setJSON('hockeytech-config', cacheKey, config);

            return config;
        } catch (error) {
            throw new Error(`Failed to extract HockeyTech config from ${url}: ${error.message}`);
        }
    }

    /**
     * Parse HockeyTech config from HTML content
     * @param {string} html - HTML content
     * @returns {Object} Config object with clientCode and apiKey
     */
    parseConfigFromHtml(html) {
        const config = {};

        // Extract client code - multiple patterns to handle different formats
        if (!config.clientCode) {
            // Pattern 1: var client_code = 'value' or var clientCode = 'value'
            let clientMatch = html.match(/var\s+(?:client_code|clientCode)\s*=\s*['"]([a-z0-9_-]+)['"]/i);
            if (clientMatch) {
                config.clientCode = clientMatch[1];
            } else {
                // Pattern 2: Other common patterns
                clientMatch = html.match(/["']?(?:league|client_code|LS_CLIENT_CODE)["']?\s*[:=]\s*["']?([a-z0-9_-]+)["']?/i);
                if (clientMatch) config.clientCode = clientMatch[1];
            }
        }

        // Extract API key - matches: var appKey = 'value', or other common patterns (16-char hex)
        if (!config.apiKey) {
            // Pattern 1: var appKey = 'value'
            let keyMatch = html.match(/var\s+appKey\s*=\s*["']([a-f0-9]{16})["']/i);
            if (keyMatch) {
                config.apiKey = keyMatch[1];
            } else {
                // Pattern 2: Other common patterns
                keyMatch = html.match(/["']?(?:site_api_key|key|LS_API_KEY|api_key)["']?\s*[:=]\s*["']?([a-f0-9]{16})["']?/i);
                if (keyMatch) config.apiKey = keyMatch[1];
            }
        }

        return config;
    }

    /**
     * Try to extract API key from external JavaScript file
     * Some sites (like SJHL) split the config across main page and external JS
     * @param {string} html - Main HTML content
     * @param {string} clientCode - Already extracted client code
     * @param {string} baseUrl - Base URL for resolving relative paths
     * @returns {Promise<Object>} Config object with apiKey if found
     */
    async tryExtractFromExternalJs(html, clientCode, baseUrl) {
        const config = {};
        
        try {
            // Look for pattern: statview-X.X.X/js/client/{clientCode}/base.rX.js
            const jsFileMatch = html.match(new RegExp(`(https?://[^"'\\s]+/statview-[^/]+/js/client/${clientCode}/base\\.r\\d+\\.js)`, 'i'));
            
            if (jsFileMatch) {
                const jsUrl = jsFileMatch[1];

                const response = await httpClient.directGet(jsUrl, { accept: '*/*', proxy: PROXY_EXTRACT });


                // Look for var appKey = "value" in the external JS
                const keyMatch = response.data.match(/var\s+appKey\s*=\s*["']([a-f0-9]{16})["']/i);
                if (keyMatch) {
                    config.apiKey = keyMatch[1];
                }
            }
        } catch (error) {
            logger.warn('Failed to extract from external JS', { error: error.message });
        }
        
        return config;
    }

    /**
     * Extract config and schedule automatic refresh
     * @param {string} url - Website URL
     * @returns {Promise<Object>} Config object
     */
    async extractAndScheduleConfig(url) {
        const config = await this.extractConfigFromWebsite(url);
        this.scheduleConfigRefresh(url);
        return config;
    }

    /**
     * Schedule automatic refresh for a website URL
     * Refreshes at 95% of cache duration to ensure it never expires
     * @param {string} url - Website URL to schedule refresh for
     */
    scheduleConfigRefresh(url) {
        const cacheKey = url.toLowerCase();
        
        // Clear any existing timer
        if (this.refreshTimers.has(cacheKey)) {
            clearTimeout(this.refreshTimers.get(cacheKey));
        }

        // Schedule refresh to run just before cache expires (at 95% of cache duration)
        const refreshDelay = this.CONFIG_CACHE_DURATION * 0.95;
        
        const timerId = setTimeout(async () => {
            logger.info('Auto-refreshing HockeyTech config', { url });
            try {
                // Force re-extraction bypassing cache TTL
                const config = await this.extractConfigFromWebsite(url, true);
                
                logger.info('Auto-refresh complete for HockeyTech config', {
                    url,
                    clientCode: config.clientCode
                });
                
                // Schedule next refresh
                this.scheduleConfigRefresh(url);
            } catch (error) {
                logger.error('Failed to auto-refresh HockeyTech config', {
                    url,
                    error: error.message
                });
                // Retry in 1 hour on failure
                setTimeout(() => this.scheduleConfigRefresh(url), 60 * 60 * 1000);
            }
        }, refreshDelay);

        this.refreshTimers.set(cacheKey, timerId);
        
        const daysUntilRefresh = (refreshDelay / (24 * 60 * 60 * 1000)).toFixed(1);
        // logger.info('Scheduled auto-refresh for HockeyTech config', {
        //     url,
        //     daysUntilRefresh
        // });
    }

    /**
     * Stop all scheduled config refreshes
     * Call this during graceful shutdown
     */
    stopAllRefreshes() {
        for (const [url, timerId] of this.refreshTimers.entries()) {
            clearTimeout(timerId);
        }
        this.refreshTimers.clear();
        logger.info('Stopped all HockeyTech config auto-refreshes');
    }

    /**
     * Extract and display all HockeyTech credentials from leagues
     * Useful for debugging and credential verification
     */
    static async displayAllCredentials() {
        const { getAllLeagues } = require('../leagues');
        const provider = new HockeyTechProvider();
        const leagues = getAllLeagues();
        
        console.log('\n🏒 HockeyTech Credentials\n');
        console.log('League'.padEnd(40) + ' Key'.padEnd(8) + ' Client Code'.padEnd(15) + ' API Key');
        console.log('='.repeat(90));
        
        for (const [key, league] of Object.entries(leagues)) {
            const config = provider.getLeagueConfig(league);
            
            if (config) {
                let clientCode = config.clientCode || 'N/A';
                let apiKey = config.apiKey || 'N/A';
                
                // If websiteUrl exists but no clientCode, try to extract
                if (config.websiteUrl && !config.clientCode) {
                    try {
                        const extracted = await provider.extractConfigFromWebsite(config.websiteUrl);
                        clientCode = extracted.clientCode || 'N/A';
                        apiKey = extracted.apiKey || 'N/A';
                    } catch (error) {
                        console.log(`${league.name.padEnd(40)} ${key.toUpperCase().padEnd(8)} ❌ Failed: ${error.message}`);
                        continue;
                    }
                }
                
                console.log(`${league.name.padEnd(40)} ${key.toUpperCase().padEnd(8)} ${clientCode.padEnd(15)} ${apiKey}`);
            }
        }
        
        console.log('');
    }
}

// Export singleton instance (ProviderManager and express.js share the same instance)
const sharedInstance = new HockeyTechProvider();
module.exports = sharedInstance;
module.exports.HockeyTechProvider = HockeyTechProvider;

// ------------------------------------------------------------------------------
