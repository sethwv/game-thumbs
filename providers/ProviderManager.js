// ------------------------------------------------------------------------------
// ProviderManager.js
// Manages multiple sports data providers and routes requests to appropriate provider
// ------------------------------------------------------------------------------

class ProviderManager {
    constructor() {
        this.providers = new Map();
        this.leagueProviderMap = new Map();
        this._initialized = false;
    }

    /**
     * Initialize the provider manager with available providers
     */
    initialize() {
        if (this._initialized) return;

        // Register available providers
        try {
            const ESPNProvider = require('./ESPNProvider');
            this.registerProvider(new ESPNProvider());
        } catch (error) {
            console.warn('Failed to load ESPN provider:', error.message);
        }

        try {
            const TheSportsDBProvider = require('./TheSportsDBProvider');
            this.registerProvider(new TheSportsDBProvider());
        } catch (error) {
            console.warn('Failed to load TheSportsDB provider:', error.message);
        }

        // Add other providers here as they're implemented
        // const APISportsProvider = require('./APISportsProvider');
        // this.registerProvider(new APISportsProvider());

        this._initialized = true;
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

        // console.log(`Registered provider: ${providerId} (supports: ${supportedLeagues.join(', ')})`);
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
                
                // Infer provider ID from config fields
                let providerId = null;
                if (typeof providerConfig === 'string') {
                    providerId = providerConfig;
                } else if (providerConfig.providerId) {
                    // Explicit providerId (deprecated but supported)
                    providerId = providerConfig.providerId;
                } else if (providerConfig.espn || providerConfig.espnConfig) {
                    providerId = 'espn';
                } else if (providerConfig.theSportsDB || providerConfig.theSportsDBConfig) {
                    providerId = 'thesportsdb';
                }
                
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
                // Infer provider ID from config fields
                let providerId = null;
                if (typeof providerConfig === 'string') {
                    providerId = providerConfig;
                } else if (providerConfig.providerId) {
                    // Explicit providerId (deprecated but supported)
                    providerId = providerConfig.providerId;
                } else if (providerConfig.espn || providerConfig.espnConfig) {
                    providerId = 'espn';
                } else if (providerConfig.theSportsDB || providerConfig.theSportsDBConfig) {
                    providerId = 'thesportsdb';
                }
                
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
     * Resolve a team using the appropriate provider
     * @param {Object} league - League object
     * @param {string} teamIdentifier - Team name, abbreviation, or identifier
     * @returns {Promise<Object>} Standardized team object
     */
    async resolveTeam(league, teamIdentifier) {
        const providers = this.getProvidersForLeague(league);
        let lastError = null;
        
        // Try each provider in priority order
        for (let i = 0; i < providers.length; i++) {
            const provider = providers[i];
            try {
                return await provider.resolveTeam(league, teamIdentifier);
            } catch (error) {
                lastError = error;
                // Continue to next provider
            }
        }
        
        // If all providers failed and league has a fallback, try the fallback league
        if (league.fallbackLeague) {
            const { findLeague } = require('../leagues');
            const fallbackLeague = findLeague(league.fallbackLeague);
            
            if (fallbackLeague) {
                // console.log(`Team "${teamIdentifier}" not found in ${league.shortName}, trying fallback league ${fallbackLeague.shortName}`);
                try {
                    return await this.resolveTeam(fallbackLeague, teamIdentifier);
                } catch (fallbackError) {
                    // If fallback also fails, throw the last error from primary league
                    throw lastError || fallbackError;
                }
            }
        }
        
        // No fallback or fallback not configured, throw last error
        throw lastError || new Error(`Failed to resolve team: ${teamIdentifier}`);
    }

    /**
     * Get league logo URL using the appropriate provider
     * @param {Object} league - League object
     * @param {boolean} darkLogoPreferred - Whether to prefer dark variant
     * @returns {Promise<string>} League logo URL or path
     */
    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
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
        
        // If all providers failed, throw error
        throw new Error(`Failed to get league logo for ${league.shortName || 'unknown'}`);
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