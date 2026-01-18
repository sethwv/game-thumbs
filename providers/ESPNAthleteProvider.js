// ------------------------------------------------------------------------------
// ESPNAthleteProvider.js
// ESPN athlete-based sports provider (MMA, UFC, Wrestling, Boxing, Tennis, etc.)
// Treats individual fighters/athletes as "teams" for thumbnail generation
//
// Configuration:
// - espnSport: The sport identifier (e.g., "mma", "tennis", "boxing")
// - espnSlug: (Optional) The league identifier (e.g., "ufc", "atp", "wta")
//
// To check which leagues exist for a sport:
// curl "https://sports.core.api.espn.com/v2/sports/{espnSport}/leagues"
//
// Examples:
// - Tennis leagues: curl "https://sports.core.api.espn.com/v2/sports/tennis/leagues"
// - MMA leagues: curl "https://sports.core.api.espn.com/v2/sports/mma/leagues"
//
// API Endpoints:
// - With league: /v2/sports/{sport}/leagues/{league}/athletes
// - Without league: /v2/sports/{sport}/athletes (may not work for all sports)
// ------------------------------------------------------------------------------

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides } = require('../helpers/teamUtils');
const logger = require('../helpers/logger');
const RequestQueue = require('../helpers/RequestQueue');

class AthleteNotFoundError extends Error {
    constructor(athleteIdentifier, league, athleteList) {
        const athleteNames = athleteList.map(a => a.displayName || a.fullName).slice(0, 20).join(', ');
        const moreCount = Math.max(0, athleteList.length - 20);
        const moreText = moreCount > 0 ? ` ... and ${moreCount} more` : '';
        super(`Athlete not found: '${athleteIdentifier}' in ${league.shortName.toUpperCase()}. Available athletes (showing first 20): ${athleteNames}${moreText}`);
        this.name = 'AthleteNotFoundError';
        this.athleteIdentifier = athleteIdentifier;
        this.league = league.shortName;
        this.availableAthletes = athleteList;
        this.athleteCount = athleteList.length;
    }
}

class ESPNAthleteProvider extends BaseProvider {
    constructor() {
        super();
        this.athleteCache = new Map();
        this.CACHE_DURATION = 72 * 60 * 60 * 1000; // 72 hours
        this.REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10); // 10 seconds
        this.refreshIntervals = new Map(); // Track refresh intervals per league
        this.pendingFetches = new Map(); // Track in-progress fetches to prevent duplicates
        this.CACHE_DIR = path.join(process.cwd(), '.cache', 'providers');
        
        // Request queue for rate limiting ESPN API calls
        // Start aggressive, adaptive rate limiting will slow down if needed
        const requestDelay = parseInt(process.env.ESPN_ATHLETE_REQUEST_DELAY || '100', 10);
        const maxConcurrent = parseInt(process.env.ESPN_ATHLETE_MAX_CONCURRENT || '50', 10);
        this.requestQueue = new RequestQueue({
            minDelay: requestDelay,
            maxConcurrent: maxConcurrent,
            name: 'ESPN-Athlete'
        });
        
        logger.info(`ESPN Athlete queue: ${maxConcurrent} concurrent, ${requestDelay}ms delay`);
        
        // Sport-specific color palettes
        this.colorPalettes = {
            // Tennis: Grass green, clay red, hard court blue, tennis ball yellow-green
            tennis: [
                '#2D5016', '#1B4D1E', '#1A5C2E', '#0D4A1F', '#1E6B34', // Grass court greens
                '#8B4513', '#A0522D', '#CD853F', '#B8860B', '#C46210', // Clay court browns/oranges
                '#1E3A5F', '#2C5F8D', '#1A4D7C', '#0F3B63', '#16537A', // Hard court blues
                '#9ACD32', '#B8D62E', '#A4C639', '#8FBC3F', '#7CB342'  // Tennis ball yellow-greens
            ],
            // Default: Combat sports dark blues
            default: [
                '#1A2A3A', '#1F3545', '#0F2535', '#1A3040', '#0F1F30',
                '#1F3040', '#1A2535', '#0F2030', '#1A2F3F', '#152535',
                '#1A3545', '#0F2540', '#152A3A', '#1A2F40', '#1F3545',
                '#0F1A2A', '#1A2A40', '#152F45', '#1A3040', '#0F2535'
            ]
        };
    }

    getProviderId() {
        return 'espnAthlete';
    }

    generateRandomColor(sport = 'default') {
        const palette = this.colorPalettes[sport] || this.colorPalettes.default;
        return palette[Math.floor(Math.random() * palette.length)];
    }

    getLeagueConfig(league) {
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && providerConfig.espnAthlete) {
                    return providerConfig.espnAthlete;
                }
            }
        }
        return null;
    }

    // Get all ESPN Athlete provider configs for a league (supports multiple providers)
    getAllLeagueConfigs(league) {
        const configs = [];
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && providerConfig.espnAthlete) {
                    configs.push(providerConfig.espnAthlete);
                }
            }
        }
        return configs;
    }

    async resolveTeam(league, athleteIdentifier) {
        if (!league || !athleteIdentifier) {
            throw new Error('Both league and athlete identifier are required');
        }

        const espnConfigs = this.getAllLeagueConfigs(league);
        if (espnConfigs.length === 0) {
            throw new Error(`League ${league.shortName} is missing ESPN Athlete configuration`);
        }

        // Check if this is a doubles team (contains "+")
        if (athleteIdentifier.includes('+')) {
            const playerNames = athleteIdentifier.split('+').map(name => name.trim());
            const resolvedAthletes = [];
            
            // Resolve each player individually
            for (const playerName of playerNames) {
                const athlete = await this.resolveSingleAthlete(league, playerName, espnConfigs);
                resolvedAthletes.push(athlete);
            }
            
            // Merge athletes into a composite team
            const { mergeAthletesIntoTeam } = require('../helpers/athleteComposite');
            const espnSport = espnConfigs[0].espnSport;
            return await mergeAthletesIntoTeam(resolvedAthletes, espnSport);
        }
        
        // Single athlete - resolve normally
        return await this.resolveSingleAthlete(league, athleteIdentifier, espnConfigs);
    }

    async resolveSingleAthlete(league, athleteIdentifier, espnConfigs) {

        try {
            // Fetch athletes from all configured providers (e.g., ATP and WTA for tennis)
            const allAthletes = [];
            for (const espnConfig of espnConfigs) {
                const athletes = await this.fetchAthleteData(league, espnConfig);
                allAthletes.push(...athletes);
            }
            const athletes = allAthletes;
            
            // Find best matching athlete using weighted scoring
            let bestMatch = null;
            let bestScore = 0;

            for (const athlete of athletes) {
                // Normalize athlete data for matching
                const athleteObj = {
                    fullName: athlete.displayName || athlete.fullName,
                    shortDisplayName: athlete.shortName,
                    name: athlete.lastName,
                    city: athlete.firstName,
                    abbreviation: (athlete.firstName?.[0] || '') + (athlete.lastName?.[0] || '')
                };
                
                const score = getTeamMatchScoreWithOverrides(
                    athleteIdentifier,
                    athleteObj,
                    athlete.slug,
                    league.shortName.toLowerCase()
                );
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = athlete;
                }
            }

            if (!bestMatch || bestScore === 0) {
                // Generate list of available athletes
                const athleteList = athletes.map(athlete => ({
                    displayName: athlete.displayName || athlete.fullName,
                    fullName: athlete.fullName,
                    firstName: athlete.firstName,
                    lastName: athlete.lastName
                })).sort((a, b) => a.displayName.localeCompare(b.displayName));

                throw new AthleteNotFoundError(athleteIdentifier, league, athleteList);
            }

            // Get athlete headshot from API or construct sport-specific URL
            let headshotUrl = bestMatch.headshot?.href;
            let flagUrl = bestMatch.flag?.href;
            
            // Use the first config to get espnSport (all configs for same league have same sport)
            const { espnSport } = espnConfigs[0];
            
            // If no headshot URL from API, construct one based on sport
            if (!headshotUrl) {
                headshotUrl = `https://a.espncdn.com/i/headshots/${espnSport}/players/full/${bestMatch.id}.png`;
            }
            
            // Generate random colors based on sport
            // Use sport-specific palette (e.g., tennis greens/clays/blues, combat sports dark blues)
            const primaryColor = this.generateRandomColor(espnSport);
            const alternateColor = this.generateRandomColor(espnSport);

            // Return athlete data in a "team-like" format
            // Use headshot as primary logo, flag as alternate (fallback if headshot fails)
            const athleteData = {
                id: bestMatch.id,
                slug: bestMatch.slug,
                city: bestMatch.firstName,
                name: bestMatch.lastName,
                fullName: bestMatch.displayName || bestMatch.fullName,
                abbreviation: (bestMatch.firstName?.[0] || '') + (bestMatch.lastName?.[0] || ''),
                conference: null,
                division: null,
                logo: headshotUrl,
                logoAlt: flagUrl, // Use country flag as fallback if headshot doesn't exist
                color: primaryColor,
                alternateColor: alternateColor
            };

            // Apply team overrides if any exist
            const { applyTeamOverrides } = require('../helpers/teamUtils');
            return applyTeamOverrides(athleteData, league.shortName.toLowerCase(), bestMatch.slug);
        } catch (error) {
            if (error instanceof AthleteNotFoundError) {
                throw error;
            }
            throw new Error(`Failed to resolve athlete: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        // For leagues with multiple providers (e.g., tennis), use the first one for logo
        const espnConfig = this.getLeagueConfig(league);
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN Athlete configuration`);
        }

        // Use custom logo URLs if defined
        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        if (league.logoUrl) {
            return league.logoUrl;
        }

        // Try to fetch from ESPN API
        try {
            const { espnSport, espnSlug } = espnConfig;
            const leagueApiUrl = `https://sports.core.api.espn.com/v2/sports/${espnSport}/leagues/${espnSlug}`;
            
            const response = await axios.get(leagueApiUrl, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            const defaultLogo = response.data.logos?.find(logo =>
                logo.rel?.includes('full') && logo.rel?.includes('default')
            )?.href;
            
            const darkLogo = response.data.logos?.find(logo =>
                logo.rel?.includes('full') && logo.rel?.includes('dark')
            )?.href;

            return darkLogoPreferred ? (darkLogo || defaultLogo) : (defaultLogo || darkLogo) 
                || `https://a.espncdn.com/i/teamlogos/leagues/500/${league.shortName.toLowerCase()}.png`;
        } catch (error) {
            logger.warn('Failed to get league logo', { league: league.shortName, error: error.message });
            return `https://a.espncdn.com/i/teamlogos/leagues/500/${league.shortName.toLowerCase()}.png`;
        }
    }

    clearCache() {
        this.athleteCache.clear();
    }

    // Get cache file path for a given cache key
    getCacheFilePath(cacheKey) {
        return path.join(this.CACHE_DIR, `espnAthlete-${cacheKey}.json`);
    }

    // Read cache from file
    async readCacheFile(cacheKey) {
        try {
            const filePath = this.getCacheFilePath(cacheKey);
            const data = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(data);
            
            // Check if cache is still valid
            const isExpired = Date.now() - parsed.timestamp >= this.CACHE_DURATION;
            return {
                ...parsed,
                isExpired
            };
        } catch (error) {
            // File doesn't exist or is invalid
            return null;
        }
    }

    // Write cache to file
    async writeCacheFile(cacheKey, data, timestamp) {
        try {
            // Ensure cache directory exists
            await fs.mkdir(this.CACHE_DIR, { recursive: true });
            
            const filePath = this.getCacheFilePath(cacheKey);
            const cacheData = { data, timestamp };
            await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2), 'utf8');
        } catch (error) {
            logger.warn('Failed to write cache file', { 
                cacheKey, 
                error: error.message 
            });
        }
    }

    // Initialize cache for all configured leagues using this provider
    async initializeCache() {
        const supportedLeagues = this.getSupportedLeagues();
        
        if (supportedLeagues.length === 0) {
            return;
        }

        logger.info(`Initializing ESPN Athlete cache for ${supportedLeagues.length} league(s)`);

        const { leagues } = require('../leagues');
        
        // Build list of all league configs
        const leagueConfigs = [];
        for (const leagueKey of supportedLeagues) {
            const league = leagues[leagueKey];
            const espnConfigs = this.getAllLeagueConfigs(league);
            
            for (const espnConfig of espnConfigs) {
                leagueConfigs.push({ league, espnConfig });
            }
        }
        
        // Phase 1: Load ALL cached data from disk in parallel (fast)
        const diskLoadPromises = leagueConfigs.map(async ({ league, espnConfig }) => {
            const { espnSlug } = espnConfig;
            const cacheKey = espnSlug 
                ? `${league.shortName}_${espnSlug}_athletes`
                : `${league.shortName}_athletes`;
            
            const fileCache = await this.readCacheFile(cacheKey);
            
            if (fileCache) {
                // Load into memory (even if expired)
                this.athleteCache.set(cacheKey, { 
                    data: fileCache.data, 
                    timestamp: fileCache.timestamp 
                });
                
                // Schedule refresh for this league
                this.scheduleRefresh(league, espnConfig);
                
                // If expired, trigger background refresh
                if (fileCache.isExpired) {
                    logger.info(`Cache expired for ${cacheKey}, refreshing in background`);
                    setImmediate(() => {
                        this.fetchAthleteData(league, espnConfig, true).catch(error => {
                            logger.error(`Background refresh failed for ${cacheKey}`, {
                                error: error.message
                            });
                        });
                    });
                }
                
                return { cacheKey, loaded: true };
            }
            
            return { cacheKey, loaded: false, league, espnConfig };
        });
        
        const diskResults = await Promise.all(diskLoadPromises);
        const loadedFromDisk = diskResults.filter(r => r.loaded).length;
        const needsFetch = diskResults.filter(r => !r.loaded);
        
        logger.info(`ESPN Athlete cache: ${loadedFromDisk} loaded from disk, ${needsFetch.length} need fetching`);
        
        // Phase 2: Fetch missing data sequentially to avoid overwhelming API
        for (const { cacheKey, league, espnConfig } of needsFetch) {
            logger.info(`Fetching ${cacheKey} from API`);
            try {
                await this.fetchAthleteData(league, espnConfig);
                this.scheduleRefresh(league, espnConfig);
            } catch (error) {
                logger.error(`Failed to fetch initial cache for ${cacheKey}`, {
                    error: error.message
                });
            }
        }
        
        if (needsFetch.length > 0) {
            logger.info(`ESPN Athlete cache initialized: all ${needsFetch.length} missing caches fetched`);
        }
    }

    // Schedule automatic cache refresh for a league
    scheduleRefresh(league, espnConfig = null) {
        if (!espnConfig) {
            espnConfig = this.getLeagueConfig(league);
        }
        const espnSlug = espnConfig?.espnSlug;
        const cacheKey = espnSlug 
            ? `${league.shortName}_${espnSlug}_athletes`
            : `${league.shortName}_athletes`;
        
        // Clear any existing interval
        if (this.refreshIntervals.has(cacheKey)) {
            clearInterval(this.refreshIntervals.get(cacheKey));
        }

        // Schedule refresh to run just before cache expires (at 95% of cache duration)
        const refreshInterval = this.CACHE_DURATION * 0.95;
        
        const intervalId = setInterval(async () => {
            const displayName = espnSlug ? `${league.shortName}/${espnSlug}` : league.shortName;
            logger.info(`Auto-refreshing athlete cache for ${displayName}`);
            try {
                const startTime = Date.now();
                await this.fetchAthleteData(league, espnConfig, true); // Force refresh
                const duration = Date.now() - startTime;
                logger.info(`Auto-refresh complete for ${league.shortName}`, {
                    count: this.athleteCache.get(cacheKey)?.data?.length || 0,
                    duration: `${duration}ms`
                });
            } catch (error) {
                logger.error(`Failed to auto-refresh cache for ${league.shortName}`, {
                    error: error.message
                });
            }
        }, refreshInterval);

        this.refreshIntervals.set(cacheKey, intervalId);
        
        const hoursUntilRefresh = (refreshInterval / (60 * 60 * 1000)).toFixed(1);
        // logger.info(`Scheduled auto-refresh for ${league.shortName} in ${hoursUntilRefresh} hours`);
    }

    // Stop all scheduled refreshes
    stopAllRefreshes() {
        for (const [key, intervalId] of this.refreshIntervals.entries()) {
            clearInterval(intervalId);
            logger.info(`Stopped auto-refresh for ${key}`);
        }
        this.refreshIntervals.clear();
    }

    // Retry a request with exponential backoff for rate limiting
    // Note: Queue handles normal pacing, this only activates on actual errors
    async retryWithBackoff(fn, maxRetries = 5, initialDelay = 10000) {
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                const isRateLimit = error.response?.status === 403 || error.response?.status === 429;
                
                if (!isRateLimit || attempt === maxRetries - 1) {
                    throw error;
                }
                
                // If we hit rate limit despite queue, back off significantly
                const delay = initialDelay * Math.pow(2, attempt);
                logger.warn('Rate limited despite queue - backing off', { 
                    attempt: attempt + 1, 
                    maxRetries,
                    delay: `${delay}ms`,
                    queueStats: this.requestQueue.getStats()
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }

    // ------------------------------------------------------------------------------
    // Private helper methods
    // ------------------------------------------------------------------------------

    async fetchAthleteData(league, espnConfig = null, forceRefresh = false) {
        // Use provided config or get first one
        if (!espnConfig) {
            espnConfig = this.getLeagueConfig(league);
        }
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN Athlete configuration`);
        }

        const { espnSport, espnSlug } = espnConfig;
        
        // Include espnSlug in cache key to differentiate between ATP/WTA, etc.
        const cacheKey = espnSlug 
            ? `${league.shortName}_${espnSlug}_athletes`
            : `${league.shortName}_athletes`;
        
        // Check memory cache first
        const cached = this.athleteCache.get(cacheKey);
        const isCacheFresh = cached && Date.now() - cached.timestamp < this.CACHE_DURATION;
        
        if (!forceRefresh && isCacheFresh) {
            return cached.data;
        }

        // Check file cache if not in memory
        let staleData = null;
        if (!forceRefresh) {
            const fileCache = await this.readCacheFile(cacheKey);
            if (fileCache && !fileCache.isExpired) {
                // Load fresh file cache into memory
                this.athleteCache.set(cacheKey, { data: fileCache.data, timestamp: fileCache.timestamp });
                // Only log in development or on first server start
                if (process.env.NODE_ENV === 'development' || this.athleteCache.size <= 5) {
                    logger.info('Loaded athlete cache from file', { 
                        cacheKey, 
                        count: fileCache.data.length 
                    });
                }
                return fileCache.data;
            } else if (fileCache && fileCache.isExpired) {
                // Cache is expired but we can use it while fetching fresh data
                staleData = fileCache.data;
            }
        }

        // If a background fetch is already in progress, return stale data or wait
        if (this.pendingFetches.has(cacheKey)) {
            if (staleData) {
                logger.info('Background refresh in progress, returning stale data', { 
                    cacheKey,
                    count: staleData.length 
                });
                return staleData;
            }
            // No stale data available, must wait for the fetch
            logger.info('Fetch already in progress, waiting for result', { cacheKey });
            return await this.pendingFetches.get(cacheKey);
        }

        // If we have stale data and not forcing refresh, return it and fetch in background
        if (staleData && !forceRefresh) {
            logger.info('Using stale cache while fetching fresh data', { 
                cacheKey, 
                count: staleData.length
            });
            // Trigger background refresh
            setImmediate(() => {
                this.fetchAthleteData(league, espnConfig, true).catch(error => {
                    logger.error('Background cache refresh failed', {
                        cacheKey,
                        error: error.message
                    });
                });
            });
            return staleData;
        }
        
        // Create a fetch promise and track it
        const fetchPromise = this.performFetch(league, espnConfig, cacheKey);
        this.pendingFetches.set(cacheKey, fetchPromise);
        
        try {
            const result = await fetchPromise;
            return result;
        } finally {
            // Clean up the pending fetch tracking
            this.pendingFetches.delete(cacheKey);
        }
    }

    // Perform the actual fetch operation
    async performFetch(league, espnConfig, cacheKey) {
        const { espnSport, espnSlug } = espnConfig;
        
        // Fetch athletes from the ESPN Sports Core API
        // ESPN v2 API typically supports limit=1000 for athlete endpoints
        const allAthletes = [];
        let pageIndex = 1;
        let hasMorePages = true;
        const pageSize = 1000; // Maximum supported by ESPN v2 athlete endpoints
        
        try {
            while (hasMorePages) {
                const athleteApiUrl = `https://sports.core.api.espn.com/v2/sports/${espnSport}/leagues/${espnSlug}/athletes?limit=${pageSize}&page=${pageIndex}`;
                
                // logger.info('Fetching athletes', { league: league.shortName, page: pageIndex, limit: pageSize });
                
                const response = await this.requestQueue.enqueue(
                    () => this.retryWithBackoff(async () => {
                        return await axios.get(athleteApiUrl, {
                            timeout: this.REQUEST_TIMEOUT * 2,
                            headers: { 'User-Agent': 'Mozilla/5.0' }
                        });
                    }),
                    { metadata: { league: league.shortName, page: pageIndex, type: 'athlete-list' } }
                );
                
                const items = response.data.items || [];
                
                // Fetch full athlete details in batches to avoid overwhelming the API
                const BATCH_SIZE = 25; // Process 25 athletes at a time (balanced for speed and rate limits)
                const athletes = [];
                
                for (let i = 0; i < items.length; i += BATCH_SIZE) {
                    const batch = items.slice(i, i + BATCH_SIZE);
                    const batchPromises = batch.map(async (item) => {
                        try {
                            const athleteUrl = item.$ref;
                            return await this.requestQueue.enqueue(
                                () => this.retryWithBackoff(async () => {
                                    const athleteResponse = await axios.get(athleteUrl, {
                                        timeout: this.REQUEST_TIMEOUT,
                                        headers: { 'User-Agent': 'Mozilla/5.0' }
                                    });
                                    return athleteResponse.data;
                                }),
                                { metadata: { league: league.shortName, type: 'athlete-detail' } }
                            );
                        } catch (error) {
                            if (process.env.NODE_ENV !== 'production') logger.warn('Failed to fetch athlete details', { error: error.message });
                            return null;
                        }
                    });
                    
                    const batchResults = (await Promise.all(batchPromises)).filter(a => a !== null);
                    athletes.push(...batchResults);
                    
                    // Queue handles request pacing and progress logging automatically
                }
                
                allAthletes.push(...athletes);
                
                // Check if there are more pages
                const pageCount = response.data.pageCount || 1;
                hasMorePages = pageIndex < pageCount;
                pageIndex++;
                
                // Queue handles request pacing - no manual delays needed
                
                // Safety limit to prevent infinite loops
                // Tennis ATP has 16K+ athletes (17 pages), so set limit higher
                if (pageIndex > 25) {
                    logger.warn('Reached max page limit', { 
                        league: league.shortName, 
                        slug: espnSlug,
                        athleteCount: allAthletes.length 
                    });
                    break;
                }
            }
            
            // Log completion with queue stats
            const finalStats = this.requestQueue.getStats();
            logger.info('Fetched athletes', { 
                league: league.shortName, 
                count: allAthletes.length,
                requestsProcessed: finalStats.totalProcessed,
                errorRate: finalStats.errorRate
            });
            
            // Cache the data in memory
            const timestamp = Date.now();
            this.athleteCache.set(cacheKey, {
                data: allAthletes,
                timestamp
            });
            
            // Write to file cache (async, don't wait)
            this.writeCacheFile(cacheKey, allAthletes, timestamp);
            
            return allAthletes;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching athletes for ${league.shortName}`);
        }
    }
}

module.exports = ESPNAthleteProvider;
