// ------------------------------------------------------------------------------
// logo.js
// Unified route to generate logo images
// - League logo: /:league/logo
// - Team logo: /:league/:team/logo
// - Matchup logo: /:league/:team1/:team2/logo
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { generateLogo } = require('../generators/logoGenerator');
const { downloadImage, buildSkipLogosTeam, resolveTeamsWithFallback, handleTeamNotFoundError, addBadgeOverlay, isValidBadge, applyWinnerEffect } = require('../helpers/imageUtils');
const { sendCachedOrGenerate, handleImageRouteError } = require('../helpers/routeUtils');
const { getCachedImage, addToCache } = require('../helpers/imageCache');
const { findLeague } = require('../leagues');
const logger = require('../helpers/logger');

module.exports = {
    paths: [
        "/:league/logo",
        "/:league/logo.png",
        "/:league/:team1/logo",
        "/:league/:team1/logo.png",
        "/:league/:team1/:team2/logo",
        "/:league/:team1/:team2/logo.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { league, team1, team2 } = req.params;
        const { size, logo, style, useLight, trim, fallback, variant, badge, winner } = req.query;

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

            let logoBuffer;

            // Case 1: League logo (/:league/logo)
            if (!team1 && !team2) {
                const styleValue = parseInt(style) || 0;

                if (styleValue === 1) {
                    // Style 1: reuse matchup diagonal split with skipLogos dummy teams
                    const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                    const dummyTeam = await buildSkipLogosTeam(leagueLogoUrl);
                    const logoOptions = {
                        width: 1024,
                        height: 1024,
                        style: 1,
                        league: { logoUrl: leagueLogoUrl },
                        trim: trim !== 'false'
                    };
                    const validSizes = [256, 512, 1024, 2048];
                    const sizeValue = parseInt(size);
                    if (validSizes.includes(sizeValue)) {
                        logoOptions.width = sizeValue;
                        logoOptions.height = sizeValue;
                    }
                    logoBuffer = await generateLogo(dummyTeam, { ...dummyTeam }, logoOptions);
                } else {
                    // Determine which logo variant to fetch
                    const darkLogoPreferred = variant === 'dark';
                    
                    // Validate variant parameter if provided
                    if (variant && variant !== 'light' && variant !== 'dark') {
                        return res.status(400).json({ 
                            error: `Invalid variant: ${variant}. Use 'light' or 'dark'` 
                        });
                    }

                    // Get league logo URL
                    const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, darkLogoPreferred);

                    if (!leagueLogoUrl) {
                        return res.status(404).json({ error: 'League logo not found' });
                    }

                    // Download the image
                    logoBuffer = await downloadImage(leagueLogoUrl);
                }
            }
            // Case 2: Single team logo (/:league/:team1/logo)
            else if (team1 && !team2) {
                const teamIdentifier = team1;
                const styleValue = parseInt(style) || 0;

                try {
                    const resolvedTeam = await providerManager.resolveTeam(leagueObj, teamIdentifier);

                    if (styleValue === 1) {
                        // Style 1: reuse matchup diagonal split with skipLogos dummy teams
                        // Team's primary color as background, team logo as center logo
                        const teamColor = resolvedTeam.color || '#000000';
                        const dummyTeam = await buildSkipLogosTeam(null, teamColor);
                        const logoUrl = resolvedTeam._logoPng || resolvedTeam.logo;
                        const logoOptions = {
                            width: 1024,
                            height: 1024,
                            style: 1,
                            league: { logoUrl: logoUrl },
                            trim: trim !== 'false'
                        };
                        const validSizes = [256, 512, 1024, 2048];
                        const sizeValue = parseInt(size);
                        if (validSizes.includes(sizeValue)) {
                            logoOptions.width = sizeValue;
                            logoOptions.height = sizeValue;
                        }
                        logoBuffer = await generateLogo(dummyTeam, { ...dummyTeam }, logoOptions);
                    } else if (resolvedTeam._logoPng) {
                        // If team has pre-converted PNG (e.g., from SVG), use that directly
                        // _logoPng is a data URL, downloadImage can handle it
                        logoBuffer = await downloadImage(resolvedTeam._logoPng);
                    } else {
                        // Determine which logo URL to use based on variant parameter
                        let logoUrl;
                        if (variant === 'dark' && resolvedTeam.logoAlt) {
                            logoUrl = resolvedTeam.logoAlt;
                        } else if (variant === 'light' || !variant) {
                            logoUrl = resolvedTeam.logo;
                        } else {
                            // If variant specified but not 'dark' or 'light', return error
                            return res.status(400).json({
                                error: `Invalid variant: ${variant}. Use 'light' or 'dark'`
                            });
                        }

                        if (!logoUrl) {
                            return res.status(404).json({ error: 'Logo not found for team' });
                        }

                        // Download and return the team logo
                        logoBuffer = await downloadImage(logoUrl);
                    }
                } catch (teamError) {
                    await handleTeamNotFoundError(teamError, fallback === 'true', async () => {
                        const darkLogoPreferred = variant === 'dark';
                        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, darkLogoPreferred);
                        
                        logoBuffer = await downloadImage(leagueLogoUrl);
                    });
                }
            }
            // Case 3: Matchup logo (/:league/:team1/:team2/logo)
            else {
                const styleValue = parseInt(style) || 1;
                // Styles 1, 5, and 6 have league logo enabled by default
                const hasLeagueLogoByDefault = styleValue === 1 || styleValue === 5 || styleValue === 6;
                
                const logoOptions = {
                    width: 1024,
                    height: 1024,
                    style: styleValue,
                    league: (logo === 'true' || (logo !== 'false' && hasLeagueLogoByDefault)) ? league : null,
                    useLight: useLight === 'true',
                    trim: trim !== 'false'
                };
                const validSizes = [256, 512, 1024, 2048];
                const sizeValue = parseInt(size);
                if (validSizes.includes(sizeValue)) {
                    logoOptions.width = sizeValue;
                    logoOptions.height = sizeValue;
                }

                const darkLogoPreferred = useLight !== 'true';
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, darkLogoPreferred);

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
                if (logoOptions.league) {
                    // For styles 5 and 6, fetch both default and dark logos for contrast checking
                    if (styleValue === 5 || styleValue === 6) {
                        // For white background: default logo is primary (colored, for light bg), dark logo is alternate (light colored, for dark bg)
                        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false); // default (primary - works on light backgrounds)
                        const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true); // dark (alternate - works on dark backgrounds)
                        leagueInfo = { 
                            logoUrl: leagueLogoUrl,
                            logoUrlAlt: leagueLogoUrlAlt !== leagueLogoUrl ? leagueLogoUrlAlt : null
                        };
                    } else {
                        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                        leagueInfo = { logoUrl: leagueLogoUrl };
                    }
                }

                logoBuffer = await generateLogo(resolvedTeam1, resolvedTeam2, {
                    ...logoOptions,
                    league: leagueInfo
                });
                
                // If badge is requested, check if we have the base image cached
                let baseImageUrl = req.originalUrl;
                if (isValidBadge(badge)) {
                    // Remove badge parameter from URL to get base image URL
                    baseImageUrl = req.originalUrl.replace(/[?&]badge=[^&]*/i, '').replace(/\?$/, '');
                    const cachedBase = getCachedImage(baseImageUrl);
                    
                    if (cachedBase) {
                        // Use cached base and just add badge
                        logoBuffer = await addBadgeOverlay(cachedBase, badge.toUpperCase(), { badgeScale: 0.18 });
                    } else {
                        // Cache the base image (without badge)
                        try {
                            const baseReq = { originalUrl: baseImageUrl };
                            addToCache(baseReq, res, logoBuffer);
                        } catch (cacheError) {
                            logger.error('Failed to cache base image', { Error: cacheError.message });
                        }
                        
                        // Add badge to generated image
                        logoBuffer = await addBadgeOverlay(logoBuffer, badge.toUpperCase(), { badgeScale: 0.18 });
                    }
                }
            }

            // Send successful response
            sendCachedOrGenerate(req, res, logoBuffer);
        } catch (error) {
            handleImageRouteError(error, req, res, 'Logo generation failed');
        }
    }
};