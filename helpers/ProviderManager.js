// ------------------------------------------------------------------------------
// ProviderManager.js
// Manages multiple sports data providers and routes requests to appropriate provider
// ------------------------------------------------------------------------------

const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class ProviderManager {
    constructor() {
        this.providers = new Map();
        this.leagueProviderMap = new Map();
        this._initialized = false;
    }

    /**
     * Initialize the provider manager with available providers
     * Automatically discovers and loads all providers from the providers/ directory
     */
    initialize() {
        if (this._initialized) return;

        const providersDir = path.join(__dirname, '../providers');
        
        try {
            const files = fs.readdirSync(providersDir);
            
            // Load all provider files (excluding BaseProvider)
            files.forEach(file => {
                if (file.endsWith('Provider.js') && file !== 'BaseProvider.js') {
                    try {
                        const providerModule = require(path.join(providersDir, file));
                        
                        // Check if module exports a singleton instance or a class
                        if (providerModule && typeof providerModule === 'object' && typeof providerModule.getProviderId === 'function') {
                            // It's a singleton instance - use it directly
                            this.registerProvider(providerModule);
                        } else {
                            // It's a class - check for named exports or default
                            const ProviderClass = providerModule.ESPNProvider || providerModule.HockeyTechProvider || providerModule;
                            if (typeof ProviderClass === 'function') {
                                this.registerProvider(new ProviderClass());
                            }
                        }
                    } catch (error) {
                        logger.warn(`Failed to load provider from ${file}`, { error: error.message });
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to read providers directory', { error: error.message });
        }

        this._initialized = true;
    }

    /**
     * Infer provider ID from a provider config object
     * Automatically detects provider type from config keys
     * @param {string|Object} providerConfig - Provider configuration
     * @returns {string|null} Provider ID or null if not found
     * @private
     */
    _inferProviderIdFromConfig(providerConfig) {
        // Simple string format: provider ID directly
        if (typeof providerConfig === 'string') {
            return providerConfig.toLowerCase();
        }
        
        // Object format: check for explicit providerId first
        if (typeof providerConfig === 'object' && providerConfig !== null) {
            if (providerConfig.providerId) {
                return providerConfig.providerId.toLowerCase();
            }
            
            // Infer from config keys by checking which provider this config is for
            // Look for keys that end with 'Config' or match known provider-specific fields
            const keys = Object.keys(providerConfig);
            
            for (const key of keys) {
                // Remove 'Config' suffix if present to get provider name
                const providerName = key.replace(/Config$/, '').toLowerCase();
                
                // Check if this provider is registered
                if (this.providers.has(providerName)) {
                    return providerName;
                }
            }
        }
        
        return null;
    }

    /**
     * Register a new provider
     * @param {BaseProvider} provider - Provider instance to register
     */
    registerProvider(provider) {
        const providerId = provider.getProviderId();
        this.providers.set(providerId, provider);
        
        // Map supported leagues to this provider
        const supportedLeagues = provider.getSupportedLeagues();
        supportedLeagues.forEach(leagueId => {
            this.leagueProviderMap.set(leagueId.toLowerCase(), provider);
        });
    }

    /**
     * Get the appropriate provider for a league
     * @param {Object} league - League object
     * @param {number} providerIndex - Index of provider to use (for priority ordering)
     * @returns {BaseProvider} Provider instance that can handle the league
     * @throws {Error} If no provider can handle the league
     */
    getProviderForLeague(league, providerIndex = 0) {
        this.initialize();

        // Check if league has providers array configured
        if (league.providers && Array.isArray(league.providers)) {
            if (providerIndex < league.providers.length) {
                const providerConfig = league.providers[providerIndex];
                const providerId = this._inferProviderIdFromConfig(providerConfig);
                
                if (providerId) {
                    const provider = this.providers.get(providerId);
                    if (provider) {
                        return provider;
                    }
                }
            }
            // If providerIndex is out of range, fall through to other methods
        }

        // DEPRECATED: Check if league has explicit single provider preference (for backward compatibility)
        if (league.providerId) {
            const provider = this.providers.get(league.providerId);
            if (provider && provider.canHandleLeague(league)) {
                return provider;
            }
        }

        // Find provider by league short name (fallback for auto-registration)
        const provider = this.leagueProviderMap.get(league.shortName?.toLowerCase());
        if (provider) {
            return provider;
        }

        throw new Error(`No provider available for league: ${league.shortName || 'unknown'}`);
    }
    
    /**
     * Get all providers configured for a league in priority order
     * @param {Object} league - League object
     * @returns {BaseProvider[]} Array of provider instances
     */
    getProvidersForLeague(league) {
        this.initialize();
        const providers = [];

        // Check if league has providers array configured
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                const providerId = this._inferProviderIdFromConfig(providerConfig);
                
                if (providerId) {
                    const provider = this.providers.get(providerId);
                    if (provider) {
                        providers.push(provider);
                    }
                }
            }
            if (providers.length > 0) {
                return providers;
            }
        }

        // DEPRECATED: Fallback to single provider (for backward compatibility)
        try {
            const provider = this.getProviderForLeague(league);
            if (provider) {
                providers.push(provider);
            }
        } catch (error) {
            // No provider available
        }

        return providers;
    }

    /**
     * Check if any provider can handle an unconfigured league
     * Providers must implement canHandleUnconfiguredLeague() method
     * @param {string} leagueIdentifier - League identifier to check
     * @returns {Object|null} League config object if a provider can handle it, null otherwise
     */
    findUnconfiguredLeague(leagueIdentifier) {
        this.initialize();

        // Check each registered provider to see if it can handle this league
        for (const provider of this.providers.values()) {
            // Only check providers that implement the unconfigured league interface
            if (typeof provider.canHandleUnconfiguredLeague === 'function') {
                const { canHandle, sport } = provider.canHandleUnconfiguredLeague(leagueIdentifier);
                
                if (canHandle) {
                    // Provider can handle this league
                    logger.unconfiguredLeague(provider.getProviderId(), leagueIdentifier, sport);

                    // Use provider's method to get the config
                    if (typeof provider.getUnconfiguredLeagueConfig === 'function') {
                        return provider.getUnconfiguredLeagueConfig(leagueIdentifier, sport);
                    }
                }
            }
        }

        return null;
    }

    /**
     * Collect all available teams from a league and its feeder/fallback leagues
     * @param {Object} league - League object
     * @param {boolean} includeRelatedLeagues - Whether to include feeder/fallback leagues (default: true for feeders, false for fallbacks)
     * @returns {Promise<Array>} Array of unique team names from all related leagues
     */
    async collectAllAvailableTeams(league, includeRelatedLeagues = true) {
        const allTeams = new Set();
        const { findLeague } = require('../leagues');
        
        // Helper to extract team names from an error
        const extractTeamsFromError = (error) => {
            if (error && error.availableTeams && Array.isArray(error.availableTeams)) {
                error.availableTeams.forEach(team => {
                    // Handle different provider formats:
                    // - ESPN/ESPNAthlete: displayName, fullName, shortName
                    // - TheSportsDB: strTeam
                    // - HockeyTech: city + nickname
                    let teamName = team.shortDisplayName || team.displayName || team.fullName || team.name || team.strTeam;
                    if (!teamName && team.city && team.nickname) {
                        teamName = `${team.city} ${team.nickname}`;
                    }
                    if (teamName) allTeams.add(teamName);
                });
            }
        };
        
        // Try to get teams from primary league
        const providers = this.getProvidersForLeague(league);
        for (const provider of providers) {
            try {
                // Try to trigger an error with an impossible team name to get the list
                await provider.resolveTeam(league, '__impossible_team_name_xyz__');
            } catch (error) {
                extractTeamsFromError(error);
            }
        }
        
        // Only include related leagues if requested
        if (includeRelatedLeagues) {
            // Collect teams from feeder leagues
            if (league.feederLeagues && Array.isArray(league.feederLeagues)) {
                for (const feederLeagueKey of league.feederLeagues) {
                    const feederLeague = findLeague(feederLeagueKey);
                    if (feederLeague) {
                        const feederProviders = this.getProvidersForLeague(feederLeague);
                        for (const provider of feederProviders) {
                            try {
                                await provider.resolveTeam(feederLeague, '__impossible_team_name_xyz__');
                            } catch (error) {
                                extractTeamsFromError(error);
                            }
                        }
                    }
                }
            }
        }
        
        return Array.from(allTeams).sort();
    }

    /**
     * Collect all available teams from specific visited leagues
     * @param {Object} originalLeague - The original league requested
     * @param {Set} visitedLeagues - Set of league keys that were actually searched
     * @returns {Promise<Array>} Array of unique team names from all visited leagues
     */
    async collectAllAvailableTeamsFromVisited(originalLeague, visitedLeagues) {
        const allTeams = new Set();
        const { findLeague } = require('../leagues');
        
        // Helper to extract team names from an error
        const extractTeamsFromError = (error) => {
            if (error && error.availableTeams && Array.isArray(error.availableTeams)) {
                error.availableTeams.forEach(team => {
                    // Handle different provider formats:
                    // - ESPN/ESPNAthlete: displayName, fullName, shortName
                    // - TheSportsDB: strTeam
                    // - HockeyTech: city + nickname
                    let teamName = team.shortDisplayName || team.displayName || team.fullName || team.name || team.strTeam;
                    if (!teamName && team.city && team.nickname) {
                        teamName = `${team.city} ${team.nickname}`;
                    }
                    if (teamName) allTeams.add(teamName);
                });
            }
        };
        
        // Collect teams from all visited leagues
        for (const leagueKey of visitedLeagues) {
            // Find the league object by key (visitedLeagues contains lowercased keys)
            const league = findLeague(leagueKey);
            if (league) {
                const providers = this.getProvidersForLeague(league);
                if (providers.length === 0) {
                    continue; // Skip leagues with no providers
                }
                
                for (const provider of providers) {
                    try {
                        await provider.resolveTeam(league, '__impossible_team_name_xyz__');
                    } catch (error) {
                        // Only extract if it's a TeamNotFoundError with available teams
                        if (error && error.name === 'TeamNotFoundError') {
                            extractTeamsFromError(error);
                        }
                    }
                }
            }
        }
        
        return Array.from(allTeams).sort();
    }

    /**
     * Resolve a team using the appropriate provider
     * @param {Object} league - League object
     * @param {string} teamIdentifier - Team name, abbreviation, or identifier
     * @param {Set} visitedLeagues - Set of league keys already visited (prevents infinite loops in circular references)
     * @param {Object} originalLeague - The original league that was requested (for error messaging)
     * @param {boolean} suppressLogging - If true, don't log successful resolution (for fallback attempts)
     * @returns {Promise<Object>} Standardized team object
     */
    async resolveTeam(league, teamIdentifier, visitedLeagues = new Set(), originalLeague = null, suppressLogging = false) {
        // Track the original league for error messaging
        if (!originalLeague) {
            originalLeague = league;
        }
        
        // Check for custom team BEFORE trying providers
        const { isCustomTeam, getCustomTeam, findCustomTeamByAlias, normalizeCompact } = require('./teamUtils');
        const leagueKey = league.shortName?.toLowerCase() || league.name?.toLowerCase();
        const normalizedIdentifier = normalizeCompact(teamIdentifier);
        const lowercaseIdentifier = teamIdentifier.toLowerCase();
        
        // Check if input matches a custom team alias first
        const customTeamSlug = findCustomTeamByAlias(leagueKey, teamIdentifier);
        if (customTeamSlug) {
            const customTeam = await getCustomTeam(leagueKey, customTeamSlug);
            if (customTeam) {
                if (!suppressLogging) {
                    logger.teamResolved('custom', league.shortName, customTeam.name);
                }
                return customTeam;
            }
        }
        
        // Try lowercase match for custom team (most common case)
        if (isCustomTeam(leagueKey, lowercaseIdentifier)) {
            const customTeam = await getCustomTeam(leagueKey, lowercaseIdentifier);
            if (customTeam) {
                if (!suppressLogging) {
                    logger.teamResolved('custom', league.shortName, customTeam.name);
                }
                return customTeam;
            }
        }
        
        // Try exact match for custom team
        if (isCustomTeam(leagueKey, teamIdentifier)) {
            const customTeam = await getCustomTeam(leagueKey, teamIdentifier);
            if (customTeam) {
                if (!suppressLogging) {
                    logger.teamResolved('custom', league.shortName, customTeam.name);
                }
                return customTeam;
            }
        }
        
        // Try fully normalized match for custom team (e.g., "N F C" → "nfc")
        if (normalizedIdentifier !== lowercaseIdentifier && isCustomTeam(leagueKey, normalizedIdentifier)) {
            const customTeam = await getCustomTeam(leagueKey, normalizedIdentifier);
            if (customTeam) {
                if (!suppressLogging) {
                    logger.teamResolved('custom', league.shortName, customTeam.name);
                }
                return customTeam;
            }
        }
        
        // Skip if we've already tried this league (prevents infinite loops)
        if (visitedLeagues.has(leagueKey)) {
            throw new Error(`Already searched league: ${leagueKey}`);
        }
        visitedLeagues.add(leagueKey);
        
        const providers = this.getProvidersForLeague(league);
        let lastError = null;
        
        // Try each provider in priority order
        for (let i = 0; i < providers.length; i++) {
            const provider = providers[i];
            try {
                const result = await provider.resolveTeam(league, teamIdentifier);
                if (!suppressLogging) {
                    logger.teamResolved(provider.getProviderId(), league.shortName, result.fullName || result.name);
                }
                return result;
            } catch (error) {
                lastError = error;
                // Continue to next provider
            }
        }
        
        // If all providers failed and league has feeder leagues, try them in order
        if (league.feederLeagues && Array.isArray(league.feederLeagues) && league.feederLeagues.length > 0) {
            const { findLeague } = require('../leagues');
            
            for (const feederLeagueKey of league.feederLeagues) {
                const feederLeague = await findLeague(feederLeagueKey);
                if (feederLeague) {
                    // Skip if we've already visited this feeder league (prevents circular loops)
                    const feederKey = feederLeague.shortName?.toLowerCase() || feederLeague.name?.toLowerCase();
                    if (visitedLeagues.has(feederKey)) {
                        continue; // Skip this feeder league, try the next one
                    }
                    
                    try {
                        return await this.resolveTeam(feederLeague, teamIdentifier, visitedLeagues, originalLeague, suppressLogging);
                    } catch (feederError) {
                        // Continue to next feeder league
                    }
                }
            }
            
            // All feeder leagues failed - create NEW error with teams from ALL visited leagues
            if (lastError && lastError.name === 'TeamNotFoundError') {
                try {
                    const allTeams = await this.collectAllAvailableTeamsFromVisited(originalLeague, visitedLeagues);
                    if (allTeams.length > 0) {
                        // Create a new error with the complete team list
                        const newError = new Error(`Team not found: '${teamIdentifier}' in ${originalLeague.shortName.toUpperCase()}. Available teams: ${allTeams.join(', ')}`);
                        newError.name = 'TeamNotFoundError';
                        newError.availableTeams = allTeams;
                        newError.teamCount = allTeams.length;
                        newError.teamIdentifier = teamIdentifier;
                        newError.league = originalLeague.shortName;
                        throw newError;
                    }
                } catch (collectError) {
                    // If collecting teams fails OR we're rethrowing the new error, throw it
                    if (collectError.name === 'TeamNotFoundError') {
                        throw collectError;
                    }
                    // If collecting teams fails, just use the original error
                }
            }
            // Create a TeamNotFoundError for consistency
            const feederError = lastError || new Error(`Failed to resolve team: ${teamIdentifier}`);
            if (!feederError.name || feederError.name !== 'TeamNotFoundError') {
                feederError.name = 'TeamNotFoundError';
                feederError.teamIdentifier = teamIdentifier;
                feederError.league = originalLeague.shortName;
            }
            throw feederError;
        }
        
        // If feederLeagues failed/not configured, try fallbackLeague (for backward compatibility)
        if (league.fallbackLeague) {
            const { findLeague } = require('../leagues');
            const fallbackLeague = await findLeague(league.fallbackLeague);
            
            if (fallbackLeague) {
                try {
                    return await this.resolveTeam(fallbackLeague, teamIdentifier, visitedLeagues, originalLeague, suppressLogging);
                } catch (fallbackError) {
                    // If fallback also fails, enhance error with teams from ORIGINAL league only
                    if (lastError && lastError.name === 'TeamNotFoundError') {
                        try {
                            const allTeams = await this.collectAllAvailableTeams(originalLeague, false); // false = don't include related
                            if (allTeams.length > 0) {
                                lastError.message = `Team not found: '${teamIdentifier}' in ${originalLeague.shortName.toUpperCase()}. Available teams: ${allTeams.join(', ')}`;
                                lastError.availableTeams = allTeams;
                                lastError.teamCount = allTeams.length;
                                lastError.teamIdentifier = teamIdentifier;
                                lastError.league = originalLeague.shortName;
                            }
                        } catch (collectError) {
                            // If collecting teams fails, just use the original error
                        }
                    }
                    throw lastError || fallbackError;
                }
            }
        }
        
        // No feeder or fallback leagues
        // Enhance error message with teams from original league only
        if (lastError && lastError.name === 'TeamNotFoundError') {
            try {
                const allTeams = await this.collectAllAvailableTeams(originalLeague, false);
                if (allTeams.length > 0) {
                    lastError.message = `Team not found: '${teamIdentifier}' in ${originalLeague.shortName.toUpperCase()}. Available teams: ${allTeams.join(', ')}`;
                    lastError.availableTeams = allTeams;
                    lastError.teamCount = allTeams.length;
                    lastError.teamIdentifier = teamIdentifier;
                    lastError.league = originalLeague.shortName;
                }
            } catch (collectError) {
                // If collecting teams fails, just use the original error
            }
        }
        
        throw lastError || new Error(`Failed to resolve team: ${teamIdentifier}`);
    }

    /**
     * Get league logo URL using the appropriate provider
     * @param {Object} league - League object
     * @param {boolean} darkLogoPreferred - Whether to prefer dark variant
     * @returns {Promise<string>} League logo URL or path
     */
    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        // Check for local logo URLs first
        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        if (league.logoUrl) {
            return league.logoUrl;
        }
        
        const providers = this.getProvidersForLeague(league);
        
        // Try each provider in priority order
        for (const provider of providers) {
            try {
                const logoUrl = await provider.getLeagueLogoUrl(league, darkLogoPreferred);
                if (logoUrl) {
                    return logoUrl;
                }
            } catch (error) {
                // Continue to next provider
            }
        }
        
        // If all providers failed or returned null, return null (some leagues don't have logos)
        return null;
    }

    /**
     * Clear caches for all providers
     */
    clearAllCaches() {
        this.initialize();
        for (const provider of this.providers.values()) {
            provider.clearCache();
        }
    }

    /**
     * Get list of all supported leagues across all providers
     * @returns {string[]} Array of supported league short names
     */
    getSupportedLeagues() {
        this.initialize();
        return Array.from(this.leagueProviderMap.keys());
    }

    /**
     * Get information about registered providers
     * @returns {Object[]} Array of provider info objects
     */
    getProviderInfo() {
        this.initialize();
        return Array.from(this.providers.values()).map(provider => ({
            id: provider.getProviderId(),
            supportedLeagues: provider.getSupportedLeagues()
        }));
    }
}

// Create singleton instance
const providerManager = new ProviderManager();

module.exports = providerManager;

// ------------------------------------------------------------------------------