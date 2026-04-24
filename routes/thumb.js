// ------------------------------------------------------------------------------
// thumb.js
// Unified route to generate thumbnail images
// - League thumbnail: /:league/thumb
// - Team thumbnail: /:league/:team/thumb
// - Matchup thumbnail: /:league/:team1/:team2/thumb
// Thumb size is 1440W x 1080H by default
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { generateThumbnail } = require('../generators/thumbnailGenerator');
const { generateLeagueThumb, generateTeamThumb } = require('../generators/genericImageGenerator');
const { resolveTeamsWithFallback, handleTeamNotFoundError, addBadgeOverlay, isValidBadge, applyWinnerEffect } = require('../helpers/imageUtils');
const { sendCachedOrGenerate, handleImageRouteError } = require('../helpers/routeUtils');
const { getCachedImage, addToCache } = require('../helpers/imageCache');
const { findLeague } = require('../leagues');
const { isEventOverlaysEnabled } = require('../helpers/featureFlags');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/thumb",
        "/:league/thumb.png",
        "/:league/:team1/thumb",
        "/:league/:team1/thumb.png",
        "/:league/:team1/:team2/thumb",
        "/:league/:team1/:team2/thumb.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { logo, style, fallback, aspect, badge, winner, title, subtitle, iconurl } = req.query;

        // Determine dimensions based on aspect ratio
        let width, height;
        if (aspect === '1-1' || aspect === '1x1' || aspect === 'square') {
            width = 1080;
            height = 1080;
        } else if (aspect === '16-9' || aspect === '16x9') {
            width = 1920;
            height = 1080;
        } else { // default 4:3
            width = 1440;
            height = 1080;
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

            // Case 1: League thumbnail (/:league/thumb)
            if (!team1 && !team2) {
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
                const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);

                if (!leagueLogoUrl) {
                    return res.status(404).json({ error: 'League logo not found' });
                }

                const overlaysOn = isEventOverlaysEnabled();

                buffer = await generateLeagueThumb(leagueLogoUrl, {
                    width,
                    height,
                    leagueLogoUrlAlt: leagueLogoUrlAlt,
                    title: overlaysOn ? title : undefined,
                    subtitle: overlaysOn ? subtitle : undefined,
                    iconurl: overlaysOn ? iconurl : undefined,
                    league: leagueObj.shortName
                });
            }
            // Case 2: Single team thumbnail (/:league/:team1/thumb)
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
                    
                    buffer = await generateTeamThumb(
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
                        
                        buffer = await generateLeagueThumb(leagueLogoUrl, {
                            width,
                            height,
                            leagueLogoUrlAlt: leagueLogoUrlAlt
                        });
                    });
                }
            }
            // Case 3: Matchup thumbnail (/:league/:team1/:team2/thumb)
            else {
                const thumbnailOptions = {
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
                if (thumbnailOptions.league) {
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
                        buffer = await generateThumbnail(resolvedTeam1, resolvedTeam2, {
                            ...thumbnailOptions,
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
                    buffer = await generateThumbnail(resolvedTeam1, resolvedTeam2, {
                        ...thumbnailOptions,
                        league: leagueInfo
                    });
                }
            }
            
            // Send successful response
            sendCachedOrGenerate(req, res, buffer);
        } catch (error) {
            handleImageRouteError(error, req, res, 'Thumbnail generation failed');
        }
    }
};
