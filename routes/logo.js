// ------------------------------------------------------------------------------
// logo.js
// Unified route to generate logo images
// - League logo: /:league/logo
// - Team logo: /:league/:team/logo
// - Matchup logo: /:league/:team1/:team2/logo
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { generateLogo } = require('../generators/logoGenerator');
const { downloadImage, generateFallbackPlaceholder, resolveTeamsWithFallback, addBadgeOverlay, isValidBadge } = require('../helpers/imageUtils');
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
        const { size, logo, style, useLight, trim, fallback, variant, badge } = req.query;

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

            let logoBuffer;

            // Case 1: League logo (/:league/logo)
            if (!team1 && !team2) {
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
            // Case 2: Single team logo (/:league/:team1/logo)
            else if (team1 && !team2) {
                const teamIdentifier = team1;
                
                try {
                    const resolvedTeam = await providerManager.resolveTeam(leagueObj, teamIdentifier);
                    
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
                } catch (teamError) {
                    // If fallback is enabled and team lookup fails, return league logo instead
                    if (fallback === 'true' && teamError.name === 'TeamNotFoundError') {
                        const darkLogoPreferred = variant === 'dark';
                        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, darkLogoPreferred);
                        
                        logoBuffer = await downloadImage(leagueLogoUrl);
                    } else {
                        throw teamError;
                    }
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
            res.set('Content-Type', 'image/png');
            res.send(logoBuffer);

            // Cache successful result (don't let caching errors affect the response)
            try {
                addToCache(req, res, logoBuffer);
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
            logger.error('Logo generation failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};