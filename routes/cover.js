// ------------------------------------------------------------------------------
// cover.js
// Unified route to generate cover images
// - League cover: /:league/cover
// - Team cover: /:league/:team/cover
// - Matchup cover: /:league/:team1/:team2/cover
// Cover size is 1080W x 1440H by default
// ------------------------------------------------------------------------------

const providerManager = require('../providers/ProviderManager');
const { generateCover } = require('../helpers/thumbnailGenerator');
const { generateLeagueCover, generateTeamCover } = require('../helpers/genericImageGenerator');
const { findLeague } = require('../leagues');
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
        const { logo, style, fallback, aspect, variant } = req.query;

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

            // Case 1: League cover (/:league/cover)
            if (!team1 && !team2) {
                const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
                const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);
                
                if (!leagueLogoUrl) {
                    return res.status(404).json({ error: 'League logo not found' });
                }
                
                buffer = await generateLeagueCover(leagueLogoUrl, {
                    width,
                    height,
                    leagueLogoUrlAlt: leagueLogoUrlAlt
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
                    // If fallback is enabled and team lookup fails, generate league cover instead
                    if (fallback === 'true' && teamError.name === 'TeamNotFoundError') {
                        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
                        const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);
                        
                        buffer = await generateLeagueCover(leagueLogoUrl, {
                            width,
                            height,
                            leagueLogoUrlAlt: leagueLogoUrlAlt
                        });
                    } else {
                        throw teamError;
                    }
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

                let resolvedTeam1, resolvedTeam2;
                try {
                    resolvedTeam1 = await providerManager.resolveTeam(leagueObj, team1);
                    resolvedTeam2 = await providerManager.resolveTeam(leagueObj, team2);
                } catch (teamError) {
                    // If fallback is enabled and team lookup fails, generate league cover instead
                    if (fallback === 'true' && teamError.name === 'TeamNotFoundError') {
                        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, false);
                        const leagueLogoUrlAlt = await providerManager.getLeagueLogoUrl(leagueObj, true);
                        
                        buffer = await generateLeagueCover(leagueLogoUrl, {
                            width,
                            height,
                            leagueLogoUrlAlt: leagueLogoUrlAlt
                        });
                        
                        res.set('Content-Type', 'image/png');
                        res.send(buffer);
                        
                        try {
                            require('../helpers/imageCache').addToCache(req, res, buffer);
                        } catch (cacheError) {
                            logger.error('Failed to cache image', {
                                Error: cacheError.message,
                                URL: req.url
                            });
                        }
                        return;
                    }
                    throw teamError;
                }

                // Get league logo URL if needed
                let leagueInfo = null;
                if (coverOptions.league) {
                    const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
                    leagueInfo = { logoUrl: leagueLogoUrl };
                }

                buffer = await generateCover(resolvedTeam1, resolvedTeam2, {
                    ...coverOptions,
                    league: leagueInfo
                });
            }
            
            // Send successful response
            res.set('Content-Type', 'image/png');
            res.send(buffer);
            
            // Cache successful result (don't let caching errors affect the response)
            try {
                require('../helpers/imageCache').addToCache(req, res, buffer);
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
            logger.error('Cover generation failed', errorDetails, error);

            // Only send error response if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};