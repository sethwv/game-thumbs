// ------------------------------------------------------------------------------
// HockeyTechProvider.js
// HockeyTech API provider implementation
// Handles team resolution and data fetching from HockeyTech LeagueStat API
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, generateSlug } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
const logger = require('../helpers/logger');

// Custom error class for team not found errors
class TeamNotFoundError extends Error {
    constructor(teamIdentifier, league, teamList) {
        const teamNames = teamList.map(t => `${t.city} ${t.nickname}`).join(', ');
        super(`Team not found: '${teamIdentifier}' in ${league.shortName.toUpperCase()}. Available teams: ${teamNames}`);
        this.name = 'TeamNotFoundError';
        this.teamIdentifier = teamIdentifier;
        this.league = league.shortName;
        this.availableTeams = teamList;
        this.teamCount = teamList.length;
    }
}

class HockeyTechProvider extends BaseProvider {
    constructor() {
        super();
        this.teamCache = new Map();
        this.colorCache = new Map();
        this.configCache = new Map(); // Cache for extracted HockeyTech configs
        this.refreshTimers = new Map(); // Track scheduled config refreshes
        this.TEAM_CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 hours
        this.CONFIG_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.BASE_URL = 'https://lscluster.hockeytech.com/feed/';
        // Use API key from env var if available, otherwise use public key
        this.API_KEY = process.env.HOCKEYTECH_API_KEY || 'f1aa699db3d81487';
    }

    getProviderId() {
        return 'hockeytech';
    }

    getLeagueConfig(league) {
        // Check for config in providers array (preferred)
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && (providerConfig.hockeyTech || providerConfig.hockeyTechConfig)) {
                    return providerConfig.hockeyTech || providerConfig.hockeyTechConfig;
                }
            }
        }
        
        // DEPRECATED: Check for direct config (for backward compatibility)
        if (league.hockeyTech || league.hockeyTechConfig) {
            return league.hockeyTech || league.hockeyTechConfig;
        }
        
        return null;
    }

    /**
     * Get league config, attempting to auto-extract from website if configured
     * @param {Object} league - League object
     * @returns {Promise<Object|null>} Config object or null
     */
    async getLeagueConfigAsync(league) {
        // Get the provider config
        const syncConfig = this.getLeagueConfig(league);
        
        // If we have explicit clientCode and apiKey, use them
        if (syncConfig && syncConfig.clientCode && syncConfig.apiKey) {
            return syncConfig;
        }

        // If websiteUrl is configured in the provider config, try to extract
        if (syncConfig && syncConfig.websiteUrl) {
            try {
                // Extract and schedule refresh for this URL
                const extractedConfig = await this.extractAndScheduleConfig(syncConfig.websiteUrl);
                if (extractedConfig && extractedConfig.clientCode && extractedConfig.apiKey) {
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

        // Only return config if it has both required fields
        if (syncConfig && syncConfig.clientCode && syncConfig.apiKey) {
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

            // Extract colors from logo if not cached
            let colors = this.colorCache.get(team.team_logo_url);
            if (!colors) {
                try {
                    const extractedColors = await extractDominantColors(team.team_logo_url, 2);
                    colors = {
                        primary: extractedColors[0] || null,
                        secondary: extractedColors[1] || null
                    };
                    this.colorCache.set(team.team_logo_url, colors);
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
        this.teamCache.clear();
        this.colorCache.clear();
        this.configCache.clear();
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

    async fetchTeamData(league) {
        const cacheKey = `${league.shortName}_teams`;
        const cached = this.teamCache.get(cacheKey);

        // Return cached data if still valid
        if (cached && Date.now() - cached.timestamp < this.TEAM_CACHE_DURATION) {
            return cached.data;
        }

        const hockeyTechConfig = await this.getLeagueConfigAsync(league);
        if (!hockeyTechConfig) {
            throw new Error(`League ${league.shortName} is missing HockeyTech configuration`);
        }

        const { clientCode, seasonId, apiKey } = hockeyTechConfig;
        
        if (!clientCode) {
            logger.error('Missing clientCode in HockeyTech config', {
                league: league.shortName,
                config: hockeyTechConfig
            });
            throw new Error(`League ${league.shortName} requires clientCode in HockeyTech configuration`);
        }
        
        // Use league-specific API key if configured, otherwise use default
        const key = apiKey || this.API_KEY;
        
        // seasonId is optional - API will use current season if not provided
        const params = {
            feed: 'modulekit',
            view: 'teamsbyseason',
            key: key,
            client_code: clientCode,
            lang_code: 'en',
            fmt: 'json'
        };

        if (seasonId) {
            params.season_id = seasonId;
        }

        try {
            const response = await axios.get(this.BASE_URL, {
                params,
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            const teams = response.data?.SiteKit?.Teamsbyseason || [];
            
            if (teams.length === 0) {
                throw new Error(`No teams found for league: ${clientCode}`);
            }
            
            // Cache the data
            this.teamCache.set(cacheKey, {
                data: teams,
                timestamp: Date.now()
            });
            
            return teams;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching teams for ${clientCode}`)
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
    async extractConfigFromWebsite(url) {
        const cacheKey = url.toLowerCase();
        
        // Check memory cache first
        const cached = this.configCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CONFIG_CACHE_DURATION) {
            return cached.config;
        }

        try {
            const response = await axios.get(url, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

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

            // Cache the result in memory
            const cacheEntry = {
                config,
                timestamp: Date.now()
            };
            
            this.configCache.set(cacheKey, cacheEntry);

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
                
                const response = await axios.get(jsUrl, {
                    timeout: this.REQUEST_TIMEOUT,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
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
                // Clear cache to force re-extraction
                this.configCache.delete(cacheKey);
                
                const config = await this.extractConfigFromWebsite(url);
                
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

module.exports = HockeyTechProvider;

// ------------------------------------------------------------------------------
