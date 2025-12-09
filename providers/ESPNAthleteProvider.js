// ------------------------------------------------------------------------------
// ESPNAthleteProvider.js
// ESPN athlete-based sports provider (MMA, UFC, Wrestling, Boxing, etc.)
// Treats individual fighters/athletes as "teams" for thumbnail generation
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides } = require('../helpers/teamUtils');
const { extractDominantColors } = require('../helpers/colorUtils');
const logger = require('../helpers/logger');

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
        this.REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);
        this.refreshIntervals = new Map(); // Track refresh intervals per league
        
        // Predefined very dark blue and red color palette for athletes
        this.colorPalette = [
            // '#4A1515', '#5A1A1A', '#3A1010', '#6B2222', '#4A1818',
            // '#5A1515', '#3A0F0F', '#4A1212', '#5A1818', '#3A1212',
            '#1A2A3A', '#1F3545', '#0F2535', '#1A3040', '#0F1F30',
            '#1F3040', '#1A2535', '#0F2030', '#1A2F3F', '#152535',
            '#1A3545', '#0F2540', '#152A3A', '#1A2F40', '#1F3545',
            '#0F1A2A', '#1A2A40', '#152F45', '#1A3040', '#0F2535'
        ];
    }

    getProviderId() {
        return 'espnAthlete';
    }

    generateRandomColor() {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
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

    async resolveTeam(league, athleteIdentifier) {
        if (!league || !athleteIdentifier) {
            throw new Error('Both league and athlete identifier are required');
        }

        const espnConfig = this.getLeagueConfig(league);
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN Athlete configuration`);
        }

        try {
            const athletes = await this.fetchAthleteData(league);
            
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

            // Get full-body stance image as the "logo"
            // ESPN provides stance images showing fighters in fighting position
            // Direct URL format: /i/headshots/mma/players/stance/left/{id}.png
            const stanceUrl = `https://a.espncdn.com/i/headshots/mma/players/stance/left/${bestMatch.id}.png`;
            const headshotUrl = bestMatch.headshot?.href;
            
            // Generate random vibrant colors instead of extracting from headshot
            // This avoids skin tone becoming the dominant color
            const primaryColor = this.generateRandomColor();
            const alternateColor = this.generateRandomColor();

            // Return athlete data in a "team-like" format
            const athleteData = {
                id: bestMatch.id,
                slug: bestMatch.slug,
                city: bestMatch.firstName,
                name: bestMatch.lastName,
                fullName: bestMatch.displayName || bestMatch.fullName,
                abbreviation: (bestMatch.firstName?.[0] || '') + (bestMatch.lastName?.[0] || ''),
                conference: null,
                division: null,
                logo: headshotUrl, // Full body stance image
                // logoAlt: undefined, // No alternate logo for athletes
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
        this.colorCache.clear();
    }

    // Initialize cache for all configured leagues using this provider
    async initializeCache() {
        const supportedLeagues = this.getSupportedLeagues();
        
        if (supportedLeagues.length === 0) {
            logger.info('No leagues configured for ESPN Athlete provider');
            return;
        }

        logger.info(`Initializing ESPN Athlete cache for ${supportedLeagues.length} league(s): ${supportedLeagues.join(', ')}`);

        const { leagues } = require('../leagues');
        
        // Process leagues sequentially to avoid overwhelming the ESPN API
        for (const leagueKey of supportedLeagues) {
            const league = leagues[leagueKey];
            try {
                const startTime = Date.now();
                await this.fetchAthleteData(league);
                const duration = Date.now() - startTime;
                logger.info(`Cached athletes for ${league.shortName}`, { 
                    count: this.athleteCache.get(`${league.shortName}_athletes`)?.data?.length || 0,
                    duration: `${duration}ms`
                });
                
                // Set up automatic refresh for this league
                this.scheduleRefresh(league);
            } catch (error) {
                logger.error(`Failed to initialize cache for ${league.shortName}`, { 
                    error: error.message 
                });
            }
        }

        logger.info('ESPN Athlete cache initialization complete');
    }

    // Schedule automatic cache refresh for a league
    scheduleRefresh(league) {
        const cacheKey = `${league.shortName}_athletes`;
        
        // Clear any existing interval
        if (this.refreshIntervals.has(cacheKey)) {
            clearInterval(this.refreshIntervals.get(cacheKey));
        }

        // Schedule refresh to run just before cache expires (at 95% of cache duration)
        const refreshInterval = this.CACHE_DURATION * 0.95;
        
        const intervalId = setInterval(async () => {
            logger.info(`Auto-refreshing athlete cache for ${league.shortName}`);
            try {
                const startTime = Date.now();
                await this.fetchAthleteData(league, true); // Force refresh
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

    // ------------------------------------------------------------------------------
    // Private helper methods
    // ------------------------------------------------------------------------------

    async fetchAthleteData(league, forceRefresh = false) {
        const cacheKey = `${league.shortName}_athletes`;
        const cached = this.athleteCache.get(cacheKey);

        if (!forceRefresh && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        const espnConfig = this.getLeagueConfig(league);
        if (!espnConfig) {
            throw new Error(`League ${league.shortName} is missing ESPN Athlete configuration`);
        }

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
                
                const response = await axios.get(athleteApiUrl, {
                    timeout: this.REQUEST_TIMEOUT * 2, // Double timeout for large athlete lists
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                const items = response.data.items || [];
                
                // Fetch full athlete details in batches to avoid overwhelming the API
                const BATCH_SIZE = 50; // Process 50 athletes at a time
                const athletes = [];
                
                for (let i = 0; i < items.length; i += BATCH_SIZE) {
                    const batch = items.slice(i, i + BATCH_SIZE);
                    const batchPromises = batch.map(async (item) => {
                        try {
                            const athleteUrl = item.$ref;
                            const athleteResponse = await axios.get(athleteUrl, {
                                timeout: this.REQUEST_TIMEOUT,
                                headers: { 'User-Agent': 'Mozilla/5.0' }
                            });
                            return athleteResponse.data;
                        } catch (error) {
                            if (process.env.NODE_ENV !== 'production') logger.warn('Failed to fetch athlete details', { error: error.message });
                            return null;
                        }
                    });
                    
                    const batchResults = (await Promise.all(batchPromises)).filter(a => a !== null);
                    athletes.push(...batchResults);
                    
                    // Log progress for large datasets in development only
                    if (items.length > 100 && process.env.NODE_ENV !== 'production') {
                        logger.info('Progress', { 
                            league: league.shortName, 
                            page: pageIndex,
                            fetched: athletes.length, 
                            total: items.length 
                        });
                    }
                }
                
                allAthletes.push(...athletes);
                
                // Check if there are more pages
                const pageCount = response.data.pageCount || 1;
                hasMorePages = pageIndex < pageCount;
                pageIndex++;
                
                // Safety limit to prevent infinite loops (should only need 2-3 pages with limit=1000)
                if (pageIndex > 10) {
                    logger.warn('Reached max page limit', { league: league.shortName });
                    break;
                }
            }
            
            // logger.info('Fetched athletes', { league: league.shortName, count: allAthletes.length });
            
            // Cache the data
            this.athleteCache.set(cacheKey, {
                data: allAthletes,
                timestamp: Date.now()
            });
            
            return allAthletes;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching athletes for ${league.shortName}`);
        }
    }
}

module.exports = ESPNAthleteProvider;
