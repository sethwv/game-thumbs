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
     * Automatically discovers leagues that have this provider configured
     * @returns {string[]} Array of league shortNames this provider supports
     */
    getSupportedLeagues() {
        const { leagues } = require('../leagues');
        const providerId = this.getProviderId();
        
        return Object.keys(leagues).filter(key => {
            const league = leagues[key];
            if (league.providers && Array.isArray(league.providers)) {
                return league.providers.some(p => 
                    typeof p === 'object' && p[providerId] !== undefined
                );
            }
            // Fallback: check for legacy providerId field
            return league.providerId === providerId;
        });
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

    /**
     * Handle HTTP errors and extract rate limit information
     * @param {Error} error - Axios error object
     * @param {string} context - Context information (e.g., league name, operation)
     * @returns {Error} Enhanced error with rate limit information
     */
    handleHttpError(error, context = '') {
        const logger = require('../helpers/logger');
        
        if (error.response) {
            const status = error.response.status;
            const headers = error.response.headers;
            const url = error.config?.url || 'unknown';
            
            // Extract rate limit headers (various formats)
            const rateLimitInfo = {
                status,
                url,
                'x-ratelimit-limit': headers['x-ratelimit-limit'],
                'x-ratelimit-remaining': headers['x-ratelimit-remaining'],
                'x-ratelimit-reset': headers['x-ratelimit-reset'],
                'retry-after': headers['retry-after'],
                'x-rate-limit-limit': headers['x-rate-limit-limit'],
                'x-rate-limit-remaining': headers['x-rate-limit-remaining'],
                'x-rate-limit-reset': headers['x-rate-limit-reset']
            };
            
            // Filter out undefined headers
            const cleanedInfo = Object.fromEntries(
                Object.entries(rateLimitInfo).filter(([_, v]) => v !== undefined)
            );
            
            // Log rate limit or access issues
            if (status === 403 || status === 429) {
                logger.error(`HTTP ${status} - ${status === 429 ? 'Rate limit exceeded' : 'Access denied'}`, {
                    provider: this.getProviderId(),
                    context,
                    ...cleanedInfo
                });
                
                const retryMsg = cleanedInfo['retry-after'] ? ` Retry after ${cleanedInfo['retry-after']}s.` : '';
                const remainingMsg = cleanedInfo['x-ratelimit-remaining'] !== undefined ? ` Remaining: ${cleanedInfo['x-ratelimit-remaining']}` : '';
                
                return new Error(
                    `API request failed (${status}): ${status === 429 ? 'Rate limit exceeded' : 'Access denied'}.${retryMsg}${remainingMsg} URL: ${url}`
                );
            }
            
            // Log other HTTP errors with available headers
            logger.error(`HTTP ${status} error`, {
                provider: this.getProviderId(),
                context,
                ...cleanedInfo
            });
            
            return new Error(`API request failed (${status}): ${error.message}. URL: ${url}`);
        }
        
        // Non-HTTP errors (timeouts, network issues, etc.)
        return new Error(`API request failed: ${error.message}`);
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