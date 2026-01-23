// ------------------------------------------------------------------------------
// espn.js
// Direct ESPN API lookup routes - bypasses leagues.json normalization
// Sport and league are passed directly to ESPN API (trimmed only)
// Teams still use normal team matching/normalization
// 
// Supported routes:
// - /espn/:sport/:league/logo|thumb|cover
// - /espn/:sport/:league/:team1/logo|thumb|cover
// - /espn/:sport/:league/:team1/:team2/logo|thumb|cover
// ------------------------------------------------------------------------------

const { generateLogo } = require('../generators/logoGenerator');
const { generateThumbnail, generateCover } = require('../generators/thumbnailGenerator');
const { generateLeagueThumb, generateTeamThumb, generateLeagueCover, generateTeamCover } = require('../generators/genericImageGenerator');
const { downloadImage, handleTeamNotFoundError, addBadgeOverlay, isValidBadge } = require('../helpers/imageUtils');
const logger = require('../helpers/logger');
const { findLeague } = require('../leagues');
const { addToCache } = require('../helpers/imageCache');

// Use shared ESPN provider singleton instance
const espnProvider = require('../providers/ESPNProvider');

module.exports = {
    priority: 10, // Load before generic routes
    paths: [
        "/espn/:sport/:league/logo",
        "/espn/:sport/:league/logo.png",
        "/espn/:sport/:league/thumb",
        "/espn/:sport/:league/thumb.png",
        "/espn/:sport/:league/cover",
        "/espn/:sport/:league/cover.png",
        "/espn/:sport/:league/:team1/logo",
        "/espn/:sport/:league/:team1/logo.png",
        "/espn/:sport/:league/:team1/thumb",
        "/espn/:sport/:league/:team1/thumb.png",
        "/espn/:sport/:league/:team1/cover",
        "/espn/:sport/:league/:team1/cover.png",
        "/espn/:sport/:league/:team1/:team2/logo",
        "/espn/:sport/:league/:team1/:team2/logo.png",
        "/espn/:sport/:league/:team1/:team2/thumb",
        "/espn/:sport/:league/:team1/:team2/thumb.png",
        "/espn/:sport/:league/:team1/:team2/cover",
        "/espn/:sport/:league/:team1/:team2/cover.png"
    ],
    method: "get",
    handler: async (req, res) => {
        const { sport, league, team1, team2 } = req.params;
        const { size, logo, style, useLight, trim, fallback, variant, aspect, badge } = req.query;
        const includeLeague = req.query.league; // Can't destructure 'league' due to param conflict

        // Trim sport and league but don't normalize
        const espnSport = sport.trim();
        const espnSlug = league.trim();

        // Determine endpoint type from path
        const pathSegments = req.path.split('/');
        const endpointType = pathSegments[pathSegments.length - 1]; // 'logo', 'thumb', or 'cover'

        try {
            // Try to find an existing league definition first
            let leagueObj = findLeague(espnSlug);
            
            // If no league definition exists, create a minimal league object for ESPN API
            if (!leagueObj) {
                leagueObj = {
                    shortName: espnSlug.toUpperCase(),
                    name: espnSlug.toUpperCase(),
                    providerId: 'espn',
                    providers: [
                        {
                            espn: {
                                espnSport,
                                espnSlug
                            }
                        }
                    ]
                };
            }

            // Route to appropriate handler
            switch (endpointType) {
                case 'logo':
                case 'logo.png':
                    return await handleLogoEndpoint(req, leagueObj, team1, team2, { size, logo, style, useLight, trim, fallback, variant, includeLeague, badge }, res);
                
                case 'thumb':
                case 'thumb.png':
                    return await handleThumbEndpoint(req, leagueObj, team1, team2, { logo, style, fallback, aspect, variant, badge }, res);
                
                case 'cover':
                case 'cover.png':
                    return await handleCoverEndpoint(req, leagueObj, team1, team2, { logo, style, fallback, aspect, variant, badge }, res);
                
                default:
                    return res.status(400).json({ error: 'Invalid endpoint type' });
            }

        } catch (error) {
            const errorDetails = {
                Error: error.message,
                Sport: espnSport,
                League: espnSlug,
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

            logger.error('ESPN direct lookup error', errorDetails, error);

            if (!res.headersSent) {
                res.status(400).json({ error: error.message });
            }
        }
    }
};

// ------------------------------------------------------------------------------
// Shared helper functions
// ------------------------------------------------------------------------------

async function getLeagueLogos(leagueObj, darkPreferred = false) {
    const leagueLogoUrl = await espnProvider.getLeagueLogoUrl(leagueObj, darkPreferred);
    const leagueLogoUrlAlt = await espnProvider.getLeagueLogoUrl(leagueObj, !darkPreferred);
    return { leagueLogoUrl, leagueLogoUrlAlt };
}

async function handleFallbackToLeague(leagueObj, variant, generateFn, dimensions) {
    const { leagueLogoUrl, leagueLogoUrlAlt } = await getLeagueLogos(leagueObj, variant === 'dark');
    if (!leagueLogoUrl) {
        return { error: 'League logo not found', status: 404 };
    }
    return await generateFn(leagueLogoUrl, { ...dimensions, leagueLogoUrlAlt });
}

function sendImageResponse(req, res, buffer) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    addToCache(req, res, buffer);
    res.send(buffer);
}

// ------------------------------------------------------------------------------
// Handler functions for each endpoint type
// ------------------------------------------------------------------------------

async function handleLogoEndpoint(req, leagueObj, team1, team2, options, res) {
    const { size, logo, style, useLight, trim, fallback, variant, includeLeague, badge } = options;

    // Validate variant
    if (variant && variant !== 'light' && variant !== 'dark') {
        return res.status(400).json({ error: `Invalid variant: ${variant}. Use 'light' or 'dark'` });
    }

    let logoBuffer;

    // League logo only
    if (!team1 && !team2) {
        const { leagueLogoUrl } = await getLeagueLogos(leagueObj, variant === 'dark');
        if (!leagueLogoUrl) return res.status(404).json({ error: 'League logo not found' });
        
        logoBuffer = await downloadImage(leagueLogoUrl, { width: parseInt(size) || 500, format: 'png' });
    }
    // Single team logo
    else if (team1 && !team2) {
        try {
            const resolvedTeam = await espnProvider.resolveTeam(leagueObj, team1);
            if (!resolvedTeam.logo && !resolvedTeam.logoAlt) {
                return res.status(404).json({ error: 'Team logo not found' });
            }
            
            const logoUrl = variant === 'dark' ? (resolvedTeam.logoAlt || resolvedTeam.logo)
                          : variant === 'light' ? (resolvedTeam.logo || resolvedTeam.logoAlt)
                          : (resolvedTeam.logo || resolvedTeam.logoAlt);
            
            logoBuffer = await downloadImage(logoUrl, {
                width: parseInt(size) || 500,
                format: 'png',
                trim: trim === 'true'
            });
        } catch (teamError) {
            await handleTeamNotFoundError(teamError, fallback === 'true', async () => {
                const { leagueLogoUrl } = await getLeagueLogos(leagueObj, variant === 'dark');
                if (!leagueLogoUrl) throw new Error('League logo not found');
                logoBuffer = await downloadImage(leagueLogoUrl, { width: parseInt(size) || 500, format: 'png' });
            });
        }
    }
    // Matchup logo
    else {
        const [resolvedTeam1, resolvedTeam2] = await Promise.all([
            espnProvider.resolveTeam(leagueObj, team1),
            espnProvider.resolveTeam(leagueObj, team2)
        ]);
        
        if (!resolvedTeam1.logo || !resolvedTeam2.logo) {
            return res.status(404).json({ error: 'One or more team logos not found' });
        }
        
        const styleValue = parseInt(style) || 1;
        const requiresLeagueLogo = styleValue === 5 || styleValue === 6;
        const logoOptions = {
            width: parseInt(size) || 1024,
            height: parseInt(size) || 1024,
            style: styleValue,
            useLight: useLight === 'true',
            trim: trim !== 'false',
            league: null
        };
        
        if (includeLeague === 'true' || requiresLeagueLogo) {
            const { leagueLogoUrl, leagueLogoUrlAlt } = await getLeagueLogos(leagueObj, false);
            logoOptions.league = { 
                logoUrl: leagueLogoUrl,
                logoUrlAlt: leagueLogoUrlAlt !== leagueLogoUrl ? leagueLogoUrlAlt : null
            };
        }
        
        logoBuffer = await generateLogo(resolvedTeam1, resolvedTeam2, logoOptions);
        
        // Apply badge overlay if requested (only for matchups)
        if (isValidBadge(badge)) {
            logoBuffer = await addBadgeOverlay(logoBuffer, badge.toUpperCase(), { badgeScale: 0.18 });
        }
    }

    sendImageResponse(req, res, logoBuffer);
}

async function handleThumbEndpoint(req, leagueObj, team1, team2, options, res) {
    const dimensions = getDimensions(options.aspect, { default: [1440, 1080], '1-1': [1080, 1080], '16-9': [1920, 1080] });
    const buffer = await handleImageEndpoint(
        leagueObj, team1, team2, options,
        generateLeagueThumb, generateTeamThumb, generateThumbnail,
        dimensions
    );
    sendImageResponse(req, res, buffer);
}

async function handleCoverEndpoint(req, leagueObj, team1, team2, options, res) {
    const dimensions = getDimensions(options.aspect, { default: [1080, 1440], '1-1': [1080, 1080], '9-16': [1080, 1920], '16-9': [1920, 1080] });
    const buffer = await handleImageEndpoint(
        leagueObj, team1, team2, options,
        generateLeagueCover, generateTeamCover, generateCover,
        dimensions
    );
    sendImageResponse(req, res, buffer);
}

// Unified image handler for thumb/cover
async function handleImageEndpoint(leagueObj, team1, team2, options, leagueGenerator, teamGenerator, matchupGenerator, [width, height]) {
    const { logo, style, fallback, badge } = options;

    // League only
    if (!team1 && !team2) {
        const result = await handleFallbackToLeague(leagueObj, null, leagueGenerator, { width, height });
        if (result.error) throw new Error(result.error);
        return result;
    }
    
    // Single team
    if (team1 && !team2) {
        try {
            const resolvedTeam = await espnProvider.resolveTeam(leagueObj, team1);
            if (!resolvedTeam.logo && !resolvedTeam.logoAlt) {
                throw new Error('Team logo not found');
            }
            
            return await teamGenerator(
                resolvedTeam.logoAlt || resolvedTeam.logo,
                resolvedTeam.color || '#1a1d2e',
                resolvedTeam.alternateColor || '#0f1419',
                { width, height, teamLogoUrlAlt: resolvedTeam.logo }
            );
        } catch (teamError) {
            return await handleTeamNotFoundError(teamError, fallback === 'true', async () => {
                const result = await handleFallbackToLeague(leagueObj, null, leagueGenerator, { width, height });
                if (result.error) throw new Error(result.error);
                return result;
            });
        }
    }
    
    // Matchup
    const [resolvedTeam1, resolvedTeam2] = await Promise.all([
        espnProvider.resolveTeam(leagueObj, team1),
        espnProvider.resolveTeam(leagueObj, team2)
    ]);
    
    if (!resolvedTeam1.logo || !resolvedTeam2.logo) {
        throw new Error('One or more team logos not found');
    }
    
    const matchupOptions = {
        width,
        height,
        style: parseInt(style) || 1,
        league: logo === 'false' ? null : { logoUrl: await espnProvider.getLeagueLogoUrl(leagueObj) }
    };
    
    let buffer = await matchupGenerator(resolvedTeam1, resolvedTeam2, matchupOptions);
    
    // Apply badge overlay if requested (only for matchups)
    if (isValidBadge(badge)) {
        buffer = await addBadgeOverlay(buffer, badge.toUpperCase());
    }
    
    return buffer;
}

function getDimensions(aspect, presets) {
    const key = aspect === '1x1' || aspect === 'square' ? '1-1'
              : aspect === '16x9' ? '16-9'
              : aspect === '9x16' ? '9-16'
              : 'default';
    return presets[key] || presets.default;
}
