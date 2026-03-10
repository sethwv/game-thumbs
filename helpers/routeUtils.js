// ------------------------------------------------------------------------------
// routeUtils.js
// Shared route utilities for response handling, caching, and error formatting
// ------------------------------------------------------------------------------

const { addToCache } = require('./imageCache');
const { getTeamDisplayName } = require('./teamUtils');
const logger = require('./logger');

/**
 * Send a PNG image response and cache it.
 * Returns true if a cached version was served (caller should return early).
 */
function sendCachedOrGenerate(req, res, buffer) {
    res.set('Content-Type', 'image/png');
    res.send(buffer);

    try {
        addToCache(req, res, buffer);
    } catch (cacheError) {
        logger.error('Failed to cache image', {
            Error: cacheError.message,
            URL: req.url
        });
    }
}

/**
 * Handle image route errors with consistent logging and response format.
 * @param {Error} error - The caught error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} context - Description for logging (e.g., 'Thumbnail generation failed')
 */
function handleImageRouteError(error, req, res, context) {
    const { league, team, team1, team2 } = req.params;

    const errorDetails = {
        Error: error.message,
        League: league,
        URL: req.url,
        IP: req.ip
    };

    if (team1 && team2) {
        errorDetails.Teams = `${team1} vs ${team2}`;
    } else if (team1 || team) {
        errorDetails.Team = team1 || team;
    }

    if (error.name === 'TeamNotFoundError') {
        errorDetails.Error = `Team not found: '${error.teamIdentifier}' in ${error.league}`;
        if (Array.isArray(error.availableTeams) && error.availableTeams.length > 0) {
            const teamNames = error.availableTeams.map(t => getTeamDisplayName(t) || 'Unknown');
            errorDetails['Available Teams'] = `${teamNames.join(', ')} (${teamNames.length})`;
        }
    }

    logger.error(context, errorDetails, error);

    if (!res.headersSent) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = { sendCachedOrGenerate, handleImageRouteError };
