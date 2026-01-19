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
const { resolveTeamsWithFallback, handleTeamNotFoundError, addBadgeOverlay, isValidBadge } = require('../helpers/imageUtils');
const { getCachedImage, addToCache } = require('../helpers/imageCache');
const { findLeague } = require('../leagues');
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
        const { logo, style, fallback, aspect, badge } = req.query;

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
            const leagueObj = findLeague(league);
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
                
                buffer = await generateLeagueThumb(leagueLogoUrl, {
                    width,
                    height,
                    leagueLogoUrlAlt: leagueLogoUrlAlt
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
                
                const { team1: resolvedTeam1, team2: resolvedTeam2 } = await resolveTeamsWithFallback(
                    providerManager,
                    leagueObj,
                    team1,
                    team2,
                    fallback === 'true',
                    leagueLogoUrl
                );

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
            res.set('Content-Type', 'image/png');
            res.send(buffer);
            
            // Cache successful result (don't let caching errors affect the response)
            try {
                addToCache(req, res, buffer);
            } catch (cacheError) {
                logger.error('Failed to cache image', {
                    Error: cacheError.message,
                    URL: req.url
                });
            }
        } catch (error) {
            const errorDetails = {
                Error: error.message,
                League: league,
                URL: req.url,
                IP: req.ip
            };

            if (team1 && team2) {
                errorDetails.Teams = `${team1} vs ${team2}`;
            } else if (team1) {
                errorDetails.Team = team1;
            }

            // For TeamNotFoundError, use a cleaner console message
            if (error.name === 'TeamNotFoundError') {
                errorDetails.Error = `Team not found: '${error.teamIdentifier}' in ${error.league}`;
                errorDetails['Available Teams'] = `${error.teamCount} teams available`;
            }

            // Logger will handle stack trace automatically (file: always, console: dev only)
            logger.error('Thumbnail generation failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};
