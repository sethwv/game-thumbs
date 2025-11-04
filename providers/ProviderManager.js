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
     * @returns {BaseProvider} Provider instance that can handle the league
     * @throws {Error} If no provider can handle the league
     */
    getProviderForLeague(league) {
        this.initialize();

        // Check if league has explicit provider preference
        if (league.providerId) {
            const provider = this.providers.get(league.providerId);
            if (provider && provider.canHandleLeague(league)) {
                return provider;
            }
        }

        // Find provider by league short name
        const provider = this.leagueProviderMap.get(league.shortName?.toLowerCase());
        if (provider) {
            return provider;
        }

        throw new Error(`No provider available for league: ${league.shortName || 'unknown'}`);
    }

    /**
     * Resolve a team using the appropriate provider
     * @param {Object} league - League object
     * @param {string} teamIdentifier - Team name, abbreviation, or identifier
     * @returns {Promise<Object>} Standardized team object
     */
    async resolveTeam(league, teamIdentifier) {
        const provider = this.getProviderForLeague(league);
        
        try {
            return await provider.resolveTeam(league, teamIdentifier);
        } catch (error) {
            // If team not found and league has a fallback, try the fallback league
            if (league.fallbackLeague) {
                const { findLeague } = require('../leagues');
                const fallbackLeague = findLeague(league.fallbackLeague);
                
                if (fallbackLeague) {
                    // console.log(`Team "${teamIdentifier}" not found in ${league.shortName}, trying fallback league ${fallbackLeague.shortName}`);
                    try {
                        return await this.resolveTeam(fallbackLeague, teamIdentifier);
                    } catch (fallbackError) {
                        // If fallback also fails, throw the original error
                        throw error;
                    }
                }
            }
            
            // No fallback or fallback not configured, throw original error
            throw error;
        }
    }

    /**
     * Get league logo URL using the appropriate provider
     * @param {Object} league - League object
     * @param {boolean} darkLogoPreferred - Whether to prefer dark variant
     * @returns {Promise<string>} League logo URL or path
     */
    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        const provider = this.getProviderForLeague(league);
        return provider.getLeagueLogoUrl(league, darkLogoPreferred);
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