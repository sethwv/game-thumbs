// ------------------------------------------------------------------------------
// routeUtils.js
// Shared route utilities for response handling, caching, and error formatting,
// plus the image-route factory (createImageRoute) and the shared matchup tail
// (renderMatchup) used by the thumb / cover / logo routes.
// ------------------------------------------------------------------------------

const providerManager = require('./ProviderManager');
const { getCachedImage, addToCache } = require('./imageCache');
const {
    resolveTeamsWithFallback,
    handleTeamNotFoundError,
    addBadgeOverlay,
    isValidBadge,
    applyWinnerEffect
} = require('./imageUtils');
const { isEventOverlaysEnabled, getInsecureOverlayConfig } = require('./featureFlags');
const { validatePublicImageUrl } = require('./urlValidator');
const { findLeague } = require('../leagues');
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

// ------------------------------------------------------------------------------
// Badge overlay with base-image caching. If `badge` is a valid keyword, the
// un-badged base image is cached under the badge-stripped URL (so repeat
// requests with different badges reuse one render), then the badge is overlaid.
// If `badge` is absent/invalid, just returns the generated buffer.
//   generate() -> Promise<Buffer>   (renders the un-badged image)
//   returns Promise<Buffer>
// ------------------------------------------------------------------------------
async function applyBadgeWithCaching({ req, res, badge, badgeScale, generate }) {
    if (!isValidBadge(badge)) {
        return await generate();
    }

    // Remove badge parameter from URL to get the base (un-badged) cache key
    const baseImageUrl = req.originalUrl.replace(/[?&]badge=[^&]*/i, '').replace(/\?$/, '');
    const cachedBase = getCachedImage(baseImageUrl);
    if (cachedBase) {
        return await addBadgeOverlay(cachedBase, badge.toUpperCase(), { badgeScale });
    }

    const buffer = await generate();
    try {
        addToCache({ originalUrl: baseImageUrl }, res, buffer);
    } catch (cacheError) {
        logger.error('Failed to cache base image', { Error: cacheError.message });
    }
    return await addBadgeOverlay(buffer, badge.toUpperCase(), { badgeScale });
}

// ------------------------------------------------------------------------------
// Shared matchup tail: resolve teams (with fallback), normalize/serve skipLogos
// cache, apply the winner effect, build league info, then generate (with badge
// caching). Used by every matchup case (thumb/cover/logo).
//
//   generate(resolvedTeam1, resolvedTeam2, leagueInfo) -> Promise<Buffer>
//   buildLeagueInfo() -> Promise<object|null>   (route-specific league logo info)
//
// Returns { buffer } normally, or { servedEarly: true } when a cached skipLogos
// image was already sent (caller must return without re-sending).
// ------------------------------------------------------------------------------
async function renderMatchup({
    req, res, leagueObj, team1, team2, query,
    generate, buildLeagueInfo, leagueLogoPreferDark = false, badgeScale
}) {
    const { fallback, badge, winner } = query;

    const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, leagueLogoPreferDark);

    let { team1: resolvedTeam1, team2: resolvedTeam2 } = await resolveTeamsWithFallback(
        providerManager,
        leagueObj,
        team1,
        team2,
        fallback === 'true' || !!leagueObj.skipLogos,
        leagueLogoUrl
    );

    // For skipLogos fallback, normalize cache key since team params are irrelevant
    if (resolvedTeam1.skipLogos || resolvedTeam2.skipLogos) {
        req.originalUrl = req.originalUrl.replace(`/${team1}/${team2}/`, '/_/_/');
        const cached = getCachedImage(req.originalUrl);
        if (cached) {
            req._servedFromRouteCache = true;
            res.set('Content-Type', 'image/png');
            res.send(cached);
            return { servedEarly: true };
        }
    }

    // Apply winner effect if specified
    if (winner && winner.trim() !== '') {
        const result = await applyWinnerEffect(
            providerManager,
            leagueObj,
            winner,
            team1,
            team2,
            resolvedTeam1,
            resolvedTeam2
        );
        resolvedTeam1 = result.team1;
        resolvedTeam2 = result.team2;
    }

    const leagueInfo = buildLeagueInfo ? await buildLeagueInfo() : null;

    const buffer = await applyBadgeWithCaching({
        req, res, badge, badgeScale,
        generate: () => generate(resolvedTeam1, resolvedTeam2, leagueInfo)
    });
    return { buffer };
}

// ------------------------------------------------------------------------------
// Default case handlers (thumb/cover behavior). A route can override any of the
// three; logo supplies its own. All receive a ctx and return { buffer } or
// { servedEarly: true }.
//   ctx: { req, res, leagueObj, league, team1, team2, query, dimensions }
// ------------------------------------------------------------------------------

// Case 1: league image (/:league/<suffix>)
function makeDefaultLeagueHandler(generators) {
    return async function defaultLeagueHandler(ctx) {
        const { req, res, leagueObj, query, dimensions } = ctx;
        const { width, height } = dimensions;
        const { title, subtitle, iconurl, badge } = query;

        const { logoUrl: leagueLogoUrl, logoUrlAlt: leagueLogoUrlAlt } = await providerManager.getLeagueLogoPair(leagueObj);

        if (!leagueLogoUrl) {
            res.status(404).json({ error: 'League logo not found' });
            return { servedEarly: true };
        }

        const overlaysOn = isEventOverlaysEnabled();
        let safeIconUrl;
        if (overlaysOn && iconurl) {
            const insecure = getInsecureOverlayConfig();
            if (insecure === true) {
                safeIconUrl = iconurl;
            } else {
                try {
                    safeIconUrl = validatePublicImageUrl(iconurl, {
                        allowedHosts: Array.isArray(insecure) ? insecure : []
                    });
                } catch (err) {
                    res.status(400).json({ error: `Invalid iconurl: ${err.message}` });
                    return { servedEarly: true };
                }
            }
        }

        const buffer = await applyBadgeWithCaching({
            req, res, badge,
            generate: () => generators.league(leagueLogoUrl, {
                width,
                height,
                leagueLogoUrlAlt,
                title: overlaysOn ? title : undefined,
                subtitle: overlaysOn ? subtitle : undefined,
                iconurl: safeIconUrl,
                league: leagueObj.shortName
            })
        });
        return { buffer };
    };
}

// Case 2: single-team image (/:league/:team1/<suffix>)
function makeDefaultTeamHandler(generators) {
    return async function defaultTeamHandler(ctx) {
        const { req, res, leagueObj, team1, query, dimensions } = ctx;
        const { width, height } = dimensions;
        const { fallback, badge } = query;

        // Resolve the team (or set up the league-logo fallback) into a renderer,
        // then badge it via the shared base-image-caching path.
        let render;
        try {
            const resolvedTeam = await providerManager.resolveTeam(leagueObj, team1);

            if (!resolvedTeam.logo && !resolvedTeam.logoAlt) {
                res.status(404).json({ error: 'Team logo not found' });
                return { servedEarly: true };
            }

            // Prefer logoAlt (dark variant) for dark gradient backgrounds
            const primaryLogo = resolvedTeam.logoAlt || resolvedTeam.logo;
            const altLogo = resolvedTeam.logo;

            render = () => generators.team(
                primaryLogo,
                resolvedTeam.color || '#1a1d2e',
                resolvedTeam.alternateColor || '#0f1419',
                { width, height, teamLogoUrlAlt: altLogo }
            );
        } catch (teamError) {
            await handleTeamNotFoundError(teamError, fallback === 'true', async () => {
                const { logoUrl: leagueLogoUrl, logoUrlAlt: leagueLogoUrlAlt } = await providerManager.getLeagueLogoPair(leagueObj);
                render = () => generators.league(leagueLogoUrl, { width, height, leagueLogoUrlAlt });
            });
        }

        const buffer = await applyBadgeWithCaching({ req, res, badge, generate: render });
        return { buffer };
    };
}

// Case 3: matchup image (/:league/:team1/:team2/<suffix>)
function makeDefaultMatchupHandler(generators) {
    return async function defaultMatchupHandler(ctx) {
        const { req, res, leagueObj, league, team1, team2, query, dimensions } = ctx;
        const { width, height } = dimensions;
        const { logo, style } = query;

        const options = {
            width,
            height,
            style: parseInt(style) || 1,
            league: logo === 'false' ? null : league
        };

        return renderMatchup({
            req, res, leagueObj, team1, team2, query,
            leagueLogoPreferDark: false,
            buildLeagueInfo: async () => {
                if (!options.league) return null;
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                return leagueLogoUrl ? { logoUrl: leagueLogoUrl } : null;
            },
            generate: (t1, t2, leagueInfo) => generators.matchup(t1, t2, { ...options, league: leagueInfo })
        });
    };
}

// ------------------------------------------------------------------------------
// createImageRoute: build a { paths, method, handler } route module for an image
// endpoint. Owns the shared scaffold (path building, findLeague, the
// league/team/matchup dispatch, response + error handling). thumb/cover pass
// `generators` and a `dimensions` mapper; logo passes its own case handlers.
// ------------------------------------------------------------------------------
function createImageRoute(config) {
    const { suffix, errorContext, dimensions, generators } = config;

    const renderLeague = config.renderLeague || makeDefaultLeagueHandler(generators);
    const renderTeam = config.renderTeam || makeDefaultTeamHandler(generators);
    const renderMatchupCase = config.renderMatchupCase || makeDefaultMatchupHandler(generators);

    const paths = [
        `/:league/${suffix}`,
        `/:league/${suffix}.png`,
        `/:league/:team1/${suffix}`,
        `/:league/:team1/${suffix}.png`,
        `/:league/:team1/:team2/${suffix}`,
        `/:league/:team1/:team2/${suffix}.png`
    ];

    return {
        paths,
        method: 'get',
        handler: async (req, res) => {
            const { league, team1, team2 } = req.params;

            try {
                const leagueObj = await findLeague(league);
                if (!leagueObj) {
                    logger.warn('Unsupported league requested', {
                        League: league,
                        URL: req.url,
                        IP: req.ip
                    });
                    return res.status(400).json({ error: `Unsupported league: ${league}` });
                }

                const ctx = {
                    req,
                    res,
                    leagueObj,
                    league,
                    team1,
                    team2,
                    query: req.query,
                    dimensions: dimensions ? dimensions(req.query) : null
                };

                let result;
                if (!team1 && !team2) {
                    result = await renderLeague(ctx);
                } else if (team1 && !team2) {
                    result = await renderTeam(ctx);
                } else {
                    result = await renderMatchupCase(ctx);
                }

                if (result && result.servedEarly) return;

                sendCachedOrGenerate(req, res, result.buffer);
            } catch (error) {
                handleImageRouteError(error, req, res, errorContext);
            }
        }
    };
}

module.exports = { sendCachedOrGenerate, handleImageRouteError, renderMatchup, createImageRoute, applyBadgeWithCaching };
