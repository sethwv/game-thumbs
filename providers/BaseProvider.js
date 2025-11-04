// ------------------------------------------------------------------------------
// BaseProvider.js
// Abstract base class for all sports data providers
// Defines the interface that all providers must implement
// ------------------------------------------------------------------------------

class BaseProvider {
    constructor() {
        if (this.constructor === BaseProvider) {
            throw new Error('BaseProvider is abstract and cannot be instantiated directly');
        }
    }

    /**
     * Get the unique identifier for this provider
     * @returns {string} Provider identifier (e.g., 'espn', 'api-sports', etc.)
     */
    getProviderId() {
        throw new Error('getProviderId() must be implemented by provider');
    }

    /**
     * Get supported leagues for this provider
     * @returns {string[]} Array of league shortNames this provider supports
     */
    getSupportedLeagues() {
        throw new Error('getSupportedLeagues() must be implemented by provider');
    }

    /**
     * Resolve a team by league and name/identifier
     * @param {Object} league - League object with provider-specific config
     * @param {string} teamIdentifier - Team name, abbreviation, or other identifier
     * @returns {Promise<Object>} Standardized team object
     */
    async resolveTeam(league, teamIdentifier) {
        throw new Error('resolveTeam() must be implemented by provider');
    }

    /**
     * Get league logo URL
     * @param {Object} league - League object with provider-specific config
     * @param {boolean} darkLogoPreferred - Whether to prefer dark variant if available
     * @returns {Promise<string>} League logo URL or local path
     */
    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        throw new Error('getLeagueLogoUrl() must be implemented by provider');
    }

    /**
     * Clear any caches maintained by this provider
     */
    clearCache() {
        // Optional - providers can override if they maintain caches
    }

    /**
     * Check if this provider can handle the given league
     * @param {Object} league - League object
     * @returns {boolean} True if this provider can handle the league
     */
    canHandleLeague(league) {
        return this.getSupportedLeagues().includes(league.shortName?.toLowerCase());
    }
}

// ------------------------------------------------------------------------------
// Standardized return formats
// ------------------------------------------------------------------------------

/**
 * Standard team object format that all providers must return
 * @typedef {Object} StandardTeam
 * @property {string} id - Unique team identifier from provider
 * @property {string} city - Team city/location
 * @property {string} name - Team name/nickname
 * @property {string} fullName - Full display name (usually city + name)
 * @property {string} abbreviation - Team abbreviation
 * @property {string|null} conference - Conference name (if applicable)
 * @property {string|null} division - Division name (if applicable)
 * @property {string} logo - Primary logo URL
 * @property {string|null} logoAlt - Alternative logo URL (e.g., dark variant)
 * @property {string|null} color - Primary team color as hex string (e.g., '#FF0000')
 * @property {string|null} alternateColor - Secondary team color as hex string
 */

module.exports = BaseProvider;

// ------------------------------------------------------------------------------