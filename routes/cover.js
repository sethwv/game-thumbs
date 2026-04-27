// ------------------------------------------------------------------------------
// cover.js
// Unified route to generate cover images
// - League cover: /:league/cover
// - Team cover: /:league/:team/cover
// - Matchup cover: /:league/:team1/:team2/cover
// Cover size is 1080W x 1440H by default
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { generateCover } = require('../generators/thumbnailGenerator');
const { generateLeagueCover, generateTeamCover } = require('../generators/genericImageGenerator');
const { resolveTeamsWithFallback, handleTeamNotFoundError, addBadgeOverlay, isValidBadge, applyWinnerEffect } = require('../helpers/imageUtils');
const { sendCachedOrGenerate, handleImageRouteError } = require('../helpers/routeUtils');
const { getCachedImage, addToCache } = require('../helpers/imageCache');
const { findLeague } = require('../leagues');
const { isEventOverlaysEnabled, getInsecureOverlayConfig } = require('../helpers/featureFlags');
const { validatePublicImageUrl } = require('../helpers/urlValidator');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/cover",
        "/:league/cover.png",
        "/:league/:team1/cover",
        "/:league/:team1/cover.png",
        "/:league/:team1/:team2/cover",
        "/:league/:team1/:team2/cover.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { logo, style, fallback, aspect, variant, badge, winner, title, subtitle, iconurl } = req.query;

        // Determine dimensions based on aspect ratio
        let width, height;
        if (aspect === '1-1' || aspect === '1x1' || aspect === 'square') {
            width = 1080;
            height = 1080;
        } else if (aspect === '9-16' || aspect === '9x16') {
            width = 1080;
            height = 1920;
        } else { // default 3:4
            width = 1080;
            height = 1440;
        }

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

            let buffer;

            // Case 1: League cover (/:league/cover)
            if (!team1 && !team2) {
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
                const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);

                if (!leagueLogoUrl) {
                    return res.status(404).json({ error: 'League logo not found' });
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
                            return res.status(400).json({ error: `Invalid iconurl: ${err.message}` });
                        }
                    }
                }

                buffer = await generateLeagueCover(leagueLogoUrl, {
                    width,
                    height,
                    leagueLogoUrlAlt: leagueLogoUrlAlt,
                    title: overlaysOn ? title : undefined,
                    subtitle: overlaysOn ? subtitle : undefined,
                    iconurl: safeIconUrl,
                    league: leagueObj.shortName
                });
            }
            // Case 2: Single team cover (/:league/:team1/cover)
            else if (team1 && !team2) {
                const teamIdentifier = team1;
                
                try {
                    const resolvedTeam = await providerManager.resolveTeam(leagueObj, teamIdentifier);
                    
                    if (!resolvedTeam.logo && !resolvedTeam.logoAlt) {
                        return res.status(404).json({ error: 'Team logo not found' });
                    }
                    
                    // Prefer logoAlt (dark variant) for dark gradient backgrounds
                    const primaryLogo = resolvedTeam.logoAlt || resolvedTeam.logo;
                    const altLogo = resolvedTeam.logo;
                    
                    buffer = await generateTeamCover(
                        primaryLogo,
                        resolvedTeam.color || '#1a1d2e',
                        resolvedTeam.alternateColor || '#0f1419',
                        {
                            width,
                            height,
                            teamLogoUrlAlt: altLogo
                        }
                    );
                } catch (teamError) {
                    await handleTeamNotFoundError(teamError, fallback === 'true', async () => {
                        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
                        const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);
                        
                        buffer = await generateLeagueCover(leagueLogoUrl, {
                            width,
                            height,
                            leagueLogoUrlAlt: leagueLogoUrlAlt
                        });
                    });
                }
            }
            // Case 3: Matchup cover (/:league/:team1/:team2/cover)
            else {
                const coverOptions = {
                    width,
                    height,
                    style: parseInt(style) || 1,
                    league: logo === 'false' ? null : league
                };

                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);

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
                        return res.send(cached);
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

                // Get league logo URL if needed
                let leagueInfo = null;
                if (coverOptions.league) {
                    const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                    if (leagueLogoUrl) {
                        leagueInfo = { logoUrl: leagueLogoUrl };
                    }
                }

                // If badge is requested, check if we have the base image cached
                let baseImageUrl = req.originalUrl;
                if (isValidBadge(badge)) {
                    // Remove badge parameter from URL to get base image URL
                    baseImageUrl = req.originalUrl.replace(/[?&]badge=[^&]*/i, '').replace(/\?$/, '');
                    const cachedBase = getCachedImage(baseImageUrl);
                    
                    if (cachedBase) {
                        // Use cached base and just add badge
                        buffer = await addBadgeOverlay(cachedBase, badge.toUpperCase());
                    } else {
                        // Generate image and cache base version
                        buffer = await generateCover(resolvedTeam1, resolvedTeam2, {
                            ...coverOptions,
                            league: leagueInfo
                        });
                        
                        // Cache the base image (without badge)
                        try {
                            const baseReq = { originalUrl: baseImageUrl };
                            addToCache(baseReq, res, buffer);
                        } catch (cacheError) {
                            logger.error('Failed to cache base image', { Error: cacheError.message });
                        }
                        
                        // Add badge to generated image
                        buffer = await addBadgeOverlay(buffer, badge.toUpperCase());
                    }
                } else {
                    // No badge, generate normally
                    buffer = await generateCover(resolvedTeam1, resolvedTeam2, {
                        ...coverOptions,
                        league: leagueInfo
                    });
                }
            }
            
            // Send successful response
            sendCachedOrGenerate(req, res, buffer);
        } catch (error) {
            handleImageRouteError(error, req, res, 'Cover generation failed');
        }
    }
};