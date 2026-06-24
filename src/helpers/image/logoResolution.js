// ------------------------------------------------------------------------------
// image/logoResolution.js
// Logo selection by contrast, team resolution with fallbacks (greyscale league
// logo / skipLogos dummies / feeder + fallback leagues), and the winner effect.
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const logger = require('../logger');
const { getTeamMatchScore, normalizeCompact } = require('../teamUtils');
const { extractDominantColors, darkenColor } = require('../colorUtils');
const { downloadImageWithSvgSupport, trimImage } = require('./imageIO');
const { convertToGreyscale, getAverageColor, hexToRgb, rgbToHex, colorDistance } = require('./draw');

const COLOR_SIMILARITY_THRESHOLD = 120; // Colors closer than this need special handling

/**
 * Handle TeamNotFoundError with optional fallback behavior
 * @param {Error} error - The error thrown during team resolution
 * @param {boolean} enableFallback - Whether fallback is enabled
 * @param {Function} fallbackFn - Function to call if fallback is enabled
 * @returns {Promise<any>} Result from fallback function or rethrows error
 */
async function handleTeamNotFoundError(error, enableFallback, fallbackFn) {
    if (enableFallback && error.name === 'TeamNotFoundError') {
        return await fallbackFn();
    }
    throw error;
}

/**
 * Generate a fallback team object using greyscale league logo
 * This can be used in matchup generation when a team is not found
 * The logo will be processed to be greyscale with reduced opacity
 * @param {string} leagueLogoUrl - URL of the league logo
 * @param {string} teamName - Name for the fallback team (e.g., "Unknown Team")
 * @returns {Promise<Object>} Team object compatible with generators
 */
async function generateFallbackTeamObject(leagueLogoUrl, teamName = 'Unknown Team') {
    try {
        // Download and process the league logo to greyscale
        const logoBuffer = await downloadImageWithSvgSupport(leagueLogoUrl);

        // Validate the buffer before processing
        if (!logoBuffer || !Buffer.isBuffer(logoBuffer) || logoBuffer.length === 0) {
            throw new Error('Invalid or empty image buffer received');
        }

        const trimmedLogoBuffer = await trimImage(logoBuffer, leagueLogoUrl);
        const logo = await loadImage(trimmedLogoBuffer);

        // Convert to greyscale (we'll store as buffer for reuse)
        const greyscaleLogo = await convertToGreyscale(logo, 0.35);
        const greyscaleBuffer = greyscaleLogo.toBuffer('image/png');

        // Create a temporary file path or data URL for the greyscale logo
        // For simplicity, we'll use a base64 data URL
        const base64Logo = `data:image/png;base64,${greyscaleBuffer.toString('base64')}`;

        return {
            name: teamName,
            logo: base64Logo,
            logoAlt: base64Logo,
            color: '#d3d3d3',  // Light grey
            alternateColor: '#b8b8b8',  // Slightly darker grey
            isFallback: true  // Mark this as a fallback team
        };
    } catch (error) {
        // If league logo processing fails, use minimal text-based ultimate fallback
        logger.warn('Failed to generate fallback with league logo, using text fallback', {
            teamName,
            leagueLogoUrl,
            error: error.message
        });

        // Generate minimal text-based logo: single bold letter on transparent background
        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');

        // Transparent background (no fill)

        // Draw single letter (first character of team name)
        const letter = teamName.charAt(0).toUpperCase();
        ctx.fillStyle = '#999999';
        ctx.font = 'bold 280px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, 200, 200);

        const fallbackBuffer = canvas.toBuffer('image/png');
        const base64Logo = `data:image/png;base64,${fallbackBuffer.toString('base64')}`;

        return {
            name: teamName,
            logo: base64Logo,
            logoAlt: base64Logo,
            color: '#d3d3d3',
            alternateColor: '#b8b8b8',
            isFallback: true
        };
    }
}

/**
 * Helper to resolve a single team with all fallback options
 */
async function resolveSingleTeamWithFallback(providerManager, leagueObj, teamIdentifier, enableFallback) {
    try {
        // Suppress logging on initial attempt - we'll log when we have a final usable team
        let resolvedTeam = await providerManager.resolveTeam(leagueObj, teamIdentifier, new Set(), null, true);

        // Check if team was found but has no logo - try other providers in parallel
        if (!resolvedTeam.logo && !resolvedTeam.logoAlt) {
            const providers = providerManager.getProvidersForLeague(leagueObj);
            const providerPromises = providers.map(provider =>
                provider.resolveTeam(leagueObj, teamIdentifier)
                    .then(team => ({ provider, team }))
                    .catch(() => null)
            );

            const results = await Promise.all(providerPromises);
            const teamWithLogo = results.find(result =>
                result && result.team && (result.team.logo || result.team.logoAlt)
            );

            if (teamWithLogo) {
                logger.teamResolved(
                    teamWithLogo.provider.getProviderId(),
                    leagueObj.shortName,
                    teamWithLogo.team.fullName || teamWithLogo.team.name
                );
                return { team: teamWithLogo.team, failed: false };
            }

            // Try feeder leagues in parallel
            if (leagueObj.feederLeagues && leagueObj.feederLeagues.length > 0) {
                const { findLeague } = require('../../leagues');
                const feederPromises = leagueObj.feederLeagues.map(async (feederLeagueKey) => {
                    const feederLeague = findLeague(feederLeagueKey);
                    if (!feederLeague) return null;
                    try {
                        const feederTeam = await providerManager.resolveTeam(feederLeague, teamIdentifier, new Set(), null, true);
                        if (feederTeam && (feederTeam.logo || feederTeam.logoAlt)) {
                            return { team: feederTeam, league: feederLeagueKey, leagueObj: feederLeague };
                        }
                    } catch (err) {
                        return null;
                    }
                    return null;
                });

                const feederResults = await Promise.all(feederPromises);
                const feederMatch = feederResults.find(result => result !== null);

                if (feederMatch) {
                    // Get the provider ID from the resolved team
                    const providerId = feederMatch.team.providerId || 'unknown';
                    logger.teamResolved(providerId, feederMatch.league, feederMatch.team.fullName || feederMatch.team.name);
                    return { team: feederMatch.team, failed: false };
                }
            }

            // Try fallback league (for NCAA sports that fall back to basketball roster)
            if (leagueObj.fallbackLeague) {
                const { findLeague } = require('../../leagues');
                const fallbackLeague = findLeague(leagueObj.fallbackLeague);
                if (fallbackLeague) {
                    try {
                        // Get providers and try to resolve in fallback league
                        const providers = providerManager.getProvidersForLeague(fallbackLeague);
                        for (const provider of providers) {
                            try {
                                const fallbackTeam = await provider.resolveTeam(fallbackLeague, teamIdentifier);
                                if (fallbackTeam && (fallbackTeam.logo || fallbackTeam.logoAlt)) {
                                    // Log with fallback flag
                                    logger.teamResolved(
                                        provider.getProviderId(),
                                        fallbackLeague.shortName,
                                        fallbackTeam.fullName || fallbackTeam.name,
                                        true // isFallback
                                    );
                                    return { team: fallbackTeam, failed: false };
                                }
                            } catch (err) {
                                // Try next provider
                            }
                        }
                    } catch (err) {
                        // Fallback league also failed, continue to greyscale
                    }
                }
            }

            logger.teamNotFound(teamIdentifier, leagueObj.shortName.toUpperCase());
            return { team: null, failed: true };
        }
        // Team was found with logo in original league - log it
        const { isCustomTeam } = require('../teamUtils');
        const leagueKey = leagueObj.shortName?.toLowerCase() || leagueObj.name?.toLowerCase();
        const teamKey = teamIdentifier.toLowerCase();
        const isCustom = isCustomTeam(leagueKey, teamKey);

        // Get provider ID from the resolved team or fallback to league's first provider
        const providerId = isCustom ? 'custom' : (resolvedTeam.providerId || 'unknown');
        logger.teamResolved(providerId, leagueObj.shortName, resolvedTeam.fullName || resolvedTeam.name);
        return { team: resolvedTeam, failed: false };
    } catch (error) {
        if (enableFallback) {
            if (!leagueObj.skipLogos) {
                logger.teamNotFound(teamIdentifier, leagueObj.shortName.toUpperCase());
            }
            return { team: null, failed: true };
        }
        throw error;
    }
}

/**
 * Build a skipLogos dummy team object with a mood color derived from an image URL.
 * Used for style-1 renderings where no real team data is needed.
 * @param {string} imageUrl - URL of an image to extract dominant color from
 * @param {string} [color] - Optional explicit color to use instead of extracting
 * @returns {Promise<Object>} A dummy team object with skipLogos: true
 */
async function buildSkipLogosTeam(imageUrl, color) {
    let moodColor = '#1a1d2e';
    if (color) {
        moodColor = color;
    } else if (imageUrl) {
        try {
            const colors = await extractDominantColors(imageUrl, 1);
            if (colors.length > 0) {
                moodColor = darkenColor(colors[0], 92);
            }
        } catch (error) {
            logger.warn('Failed to extract mood color, using default', { error: error.message });
        }
    }
    return {
        name: '',
        logo: null,
        logoAlt: null,
        color: moodColor,
        alternateColor: moodColor,
        isFallback: true,
        skipLogos: true
    };
}

/**
 * Resolve both teams with fallback support for matchup generation
 * @param {Object} providerManager - The provider manager instance
 * @param {Object} leagueObj - League object
 * @param {string} team1Identifier - First team identifier
 * @param {string} team2Identifier - Second team identifier
 * @param {boolean} enableFallback - Whether to use fallback for missing teams
 * @param {string} leagueLogoUrl - League logo URL for fallback
 * @returns {Promise<{team1: Object, team2: Object, useLeagueLogoOnly?: boolean}>}
 */
async function resolveTeamsWithFallback(providerManager, leagueObj, team1Identifier, team2Identifier, enableFallback, leagueLogoUrl) {
    // Resolve both teams in parallel
    const [result1, result2] = await Promise.all([
        resolveSingleTeamWithFallback(providerManager, leagueObj, team1Identifier, enableFallback),
        resolveSingleTeamWithFallback(providerManager, leagueObj, team2Identifier, enableFallback)
    ]);

    let resolvedTeam1 = result1.team;
    let resolvedTeam2 = result2.team;

    // If any team fails and the league has skipLogos enabled,
    // create dummy teams that render only colored rectangles with the league logo
    if ((result1.failed || result2.failed) && leagueObj.skipLogos) {
        const dummyTeam = await buildSkipLogosTeam(leagueLogoUrl);

        return {
            team1: dummyTeam,
            team2: { ...dummyTeam }
        };
    }

    // For non-skipLogos leagues, fall back to greyscale league logos
    if (result1.failed && result2.failed) {
        try {
            const logoBuffer = await downloadImageWithSvgSupport(leagueLogoUrl);
            if (!logoBuffer || !Buffer.isBuffer(logoBuffer) || logoBuffer.length === 0) {
                throw new Error('Invalid or empty image buffer received');
            }

            const trimmedLogoBuffer = await trimImage(logoBuffer, leagueLogoUrl);
            const logo = await loadImage(trimmedLogoBuffer);
            const greyscaleLogo = await convertToGreyscale(logo, 0.35);
            const greyscaleBuffer = greyscaleLogo.toBuffer('image/png');
            const base64Logo = `data:image/png;base64,${greyscaleBuffer.toString('base64')}`;

            resolvedTeam1 = {
                name: team1Identifier,
                logo: base64Logo,
                logoAlt: base64Logo,
                color: '#d3d3d3',
                alternateColor: '#b8b8b8',
                isFallback: true
            };
            resolvedTeam2 = {
                name: team2Identifier,
                logo: base64Logo,
                logoAlt: base64Logo,
                color: '#d3d3d3',
                alternateColor: '#b8b8b8',
                isFallback: true
            };
        } catch (error) {
            logger.warn('Failed to generate fallback with league logo', {
                leagueLogoUrl,
                error: error.message
            });
            throw error;
        }
    } else if (result1.failed || result2.failed) {
        const fallbackPromises = [];
        if (result1.failed) {
            fallbackPromises.push(generateFallbackTeamObject(leagueLogoUrl, team1Identifier));
        } else {
            fallbackPromises.push(Promise.resolve(resolvedTeam1));
        }
        if (result2.failed) {
            fallbackPromises.push(generateFallbackTeamObject(leagueLogoUrl, team2Identifier));
        } else {
            fallbackPromises.push(Promise.resolve(resolvedTeam2));
        }
        [resolvedTeam1, resolvedTeam2] = await Promise.all(fallbackPromises);
    }

    return {
        team1: resolvedTeam1,
        team2: resolvedTeam2
    };
}

/**
 * Convert a team to a greyscale loser (for winner parameter)
 * @param {Object} team - The team object to convert
 * @returns {Promise<Object>} Modified team object with greyscale logos and grey colors
 */
async function convertTeamToGreyscaleLoser(team) {
    try {
        // Download and convert primary logo to greyscale
        const logoBuffer = await downloadImageWithSvgSupport(team.logo);
        const logoImage = await loadImage(logoBuffer);
        const greyscaleCanvas = await convertToGreyscale(logoImage, 0.35);
        const greyscaleBuffer = greyscaleCanvas.toBuffer('image/png');
        const base64Logo = `data:image/png;base64,${greyscaleBuffer.toString('base64')}`;

        // Also convert logoAlt if it exists and is different
        let base64LogoAlt = base64Logo;
        if (team.logoAlt && team.logoAlt !== team.logo) {
            try {
                const logoAltBuffer = await downloadImageWithSvgSupport(team.logoAlt);
                const logoAltImage = await loadImage(logoAltBuffer);
                const greyscaleAltCanvas = await convertToGreyscale(logoAltImage, 0.35);
                const greyscaleAltBuffer = greyscaleAltCanvas.toBuffer('image/png');
                base64LogoAlt = `data:image/png;base64,${greyscaleAltBuffer.toString('base64')}`;
            } catch (error) {
                logger.warn('Failed to convert logoAlt to greyscale', { team: team.name });
            }
        }

        return {
            ...team,
            logo: base64Logo,
            logoAlt: base64LogoAlt,
            color: '#d3d3d3',
            alternateColor: '#b8b8b8',
            isLoser: true
        };
    } catch (error) {
        logger.error('Failed to convert team to greyscale', { team: team.name, error: error.message });
        return team; // Return unchanged on error
    }
}

/**
 * Apply winner effect by converting the losing team to greyscale
 * @param {Object} providerManager - Provider manager instance
 * @param {Object} leagueObj - League object
 * @param {string} winnerIdentifier - Winner team identifier from query param
 * @param {string} team1Identifier - Team 1 identifier from path
 * @param {string} team2Identifier - Team 2 identifier from path
 * @param {Object} team1 - Resolved team 1 object
 * @param {Object} team2 - Resolved team 2 object
 * @returns {Promise<{team1: Object, team2: Object}>} Modified team objects
 */
async function applyWinnerEffect(
    providerManager,
    leagueObj,
    winnerIdentifier,
    team1Identifier,
    team2Identifier,
    team1,
    team2
) {
    try {
        // Skip if teams have skipLogos flag (fallback case)
        if (team1.skipLogos || team2.skipLogos) {
            return { team1, team2 };
        }

        // Phase 1: Identifier Matching (fast path)
        const normalizedWinner = normalizeCompact(winnerIdentifier);
        const normalizedTeam1 = normalizeCompact(team1Identifier);
        const normalizedTeam2 = normalizeCompact(team2Identifier);

        if (normalizedWinner === normalizedTeam1) {
            // Team 1 is winner, apply greyscale to team 2
            const greyTeam2 = await convertTeamToGreyscaleLoser(team2);
            logger.winnerApplied(team1.name, team2.name);
            return { team1, team2: greyTeam2 };
        }

        if (normalizedWinner === normalizedTeam2) {
            // Team 2 is winner, apply greyscale to team 1
            const greyTeam1 = await convertTeamToGreyscaleLoser(team1);
            logger.winnerApplied(team2.name, team1.name);
            return { team1: greyTeam1, team2 };
        }

        // Phase 2: Resolved Team Matching (fallback)
        let winnerTeam;
        try {
            winnerTeam = await providerManager.resolveTeam(leagueObj, winnerIdentifier, new Set(), null, true);
        } catch (error) {
            logger.warn('Failed to resolve winner team', { winner: winnerIdentifier });
            return { team1, team2 }; // Return unchanged
        }

        // Calculate match scores between winner and both teams
        const team1Score = Math.max(
            getTeamMatchScore(winnerIdentifier, team1),
            getTeamMatchScore(winnerTeam.name || '', team1),
            getTeamMatchScore(winnerTeam.fullName || '', team1)
        );

        const team2Score = Math.max(
            getTeamMatchScore(winnerIdentifier, team2),
            getTeamMatchScore(winnerTeam.name || '', team2),
            getTeamMatchScore(winnerTeam.fullName || '', team2)
        );

        const MATCH_THRESHOLD = 500;

        if (team1Score > team2Score && team1Score >= MATCH_THRESHOLD) {
            // Team 1 is winner
            const greyTeam2 = await convertTeamToGreyscaleLoser(team2);
            logger.winnerApplied(team1.name, team2.name);
            return { team1, team2: greyTeam2 };
        } else if (team2Score > team1Score && team2Score >= MATCH_THRESHOLD) {
            // Team 2 is winner
            const greyTeam1 = await convertTeamToGreyscaleLoser(team1);
            logger.winnerApplied(team2.name, team1.name);
            return { team1: greyTeam1, team2 };
        } else {
            // No clear match or ambiguous
            logger.warn('Winner does not match either team', {
                winner: winnerIdentifier,
                scores: `${team1.name}: ${team1Score}, ${team2.name}: ${team2Score}`
            });
            return { team1, team2 }; // Return unchanged
        }
    } catch (error) {
        logger.error('Error applying winner effect', { winner: winnerIdentifier, error: error.message });
        return { team1, team2 }; // Return unchanged on error
    }
}

async function selectBestLogo(team, backgroundColor) {
    try {
        // If team has a pre-converted PNG data URL (from SVG conversion), use that
        if (team._logoPng) {
            return team._logoPng;
        }

        // Validate that we have a primary logo
        if (!team.logo) {
            throw new Error('No logo available for team');
        }

        // If no logoAlt, use the primary logo
        if (!team.logoAlt) {
            return team.logo;
        }

        // Check if this is an athlete (headshot + flag scenario, or a
        // TheSportsDB player cutout). For athletes we always prefer the primary
        // image (ESPN headshot / TSDB cutout) over the alternate when it loads,
        // rather than choosing by contrast.
        const isAthlete = team.logo.includes('espncdn.com/i/headshots/')
            || team.logo.includes('/player/cutout/');

        // Try to load primary logo first
        let primaryBuffer, primaryImage;
        try {
            primaryBuffer = await downloadImageWithSvgSupport(team.logo);
            primaryImage = await loadImage(primaryBuffer);

            // For athletes, always prefer headshot/cutout if it loads successfully
            if (isAthlete) {
                return team.logo;
            }
        } catch (error) {
            // Primary logo failed (e.g., 404 for athlete headshot), use logoAlt instead
            return team.logoAlt;
        }

        // For non-athletes (teams), try to load alternate logo and choose based on contrast
        let altBuffer, altImage;
        try {
            altBuffer = await downloadImageWithSvgSupport(team.logoAlt);
            altImage = await loadImage(altBuffer);
        } catch (error) {
            // Alt logo failed, use primary
            return team.logo;
        }

        // Both logos loaded successfully, calculate color distances
        const primaryAvgColor = getAverageColor(primaryImage);
        const primaryHex = rgbToHex(primaryAvgColor);
        const primaryDistance = colorDistance(primaryHex, backgroundColor);

        const altAvgColor = getAverageColor(altImage);
        const altHex = rgbToHex(altAvgColor);
        const altDistance = colorDistance(altHex, backgroundColor);

        // Check if background is dark (closer to black than white)
        const bgRgb = hexToRgb(backgroundColor);
        const bgBrightness = bgRgb ? (bgRgb.r + bgRgb.g + bgRgb.b) / 3 : 128;
        const isDarkBackground = bgBrightness < 128;

        // For dark backgrounds, prefer logoAlt (ESPN's alt logos are designed for dark backgrounds)
        // unless primary logo has significantly better contrast
        if (isDarkBackground) {
            // Use logoAlt unless primary is MUCH better (50+ points better contrast)
            if (altDistance > primaryDistance - 50) {
                return team.logoAlt;
            }
        } else {
            // For light backgrounds, use the original logic
            // If primary logo is a bad fit, use logoAlt instead
            if (primaryDistance < COLOR_SIMILARITY_THRESHOLD && altDistance > primaryDistance) {
                return team.logoAlt;
            }
        }

        // Otherwise use primary logo
        return team.logo;
    } catch (error) {
        logger.warn('Error selecting best logo', { error: error.message, team: team.name });
        // Fallback to primary logo on error
        return team.logo;
    }
}

/**
 * Choose the logo + background color for a single-team style=1 badge based on contrast.
 *
 * The team's primary color is the preferred background. We try the alternate logo
 * before falling back to the alternate color, so a team like the Yankees ends up with
 * their white alt logo on their navy primary color rather than a navy logo that
 * disappears into a navy background.
 *
 * Preference order (first combination clearing the contrast threshold wins):
 *   1. primary color  + primary logo
 *   2. primary color  + alt logo
 *   3. alt color      + primary logo
 *   4. alt color      + alt logo
 * If none clear the threshold, the combination with the greatest contrast is used.
 *
 * @param {Object} team - Resolved team object (color, alternateColor, logo, logoAlt, _logoPng)
 * @returns {Promise<{logoUrl: string, backgroundColor: string}>}
 */
async function selectLogoAndColorForSingleTeam(team) {
    const primaryColor = team.color || '#000000';
    const altColor = team.alternateColor || primaryColor;

    const primaryLogoUrl = team._logoPng || team.logo;

    // Load each candidate logo and record its average color. Drop any that fail to load.
    const logos = [];
    if (primaryLogoUrl) {
        try {
            const img = await loadImage(await downloadImageWithSvgSupport(primaryLogoUrl));
            logos.push({ url: primaryLogoUrl, avgHex: rgbToHex(getAverageColor(img)) });
        } catch (error) {
            logger.warn('Failed to load primary logo for contrast check', { error: error.message, team: team.name });
        }
    }
    if (team.logoAlt) {
        try {
            const img = await loadImage(await downloadImageWithSvgSupport(team.logoAlt));
            logos.push({ url: team.logoAlt, avgHex: rgbToHex(getAverageColor(img)) });
        } catch (error) {
            logger.warn('Failed to load alt logo for contrast check', { error: error.message, team: team.name });
        }
    }

    // Nothing loaded: preserve previous behavior.
    if (logos.length === 0) {
        return { logoUrl: primaryLogoUrl, backgroundColor: primaryColor };
    }

    // Background colors in preference order, skipping the alt color when it matches primary.
    const backgrounds = [primaryColor];
    if (altColor !== primaryColor) {
        backgrounds.push(altColor);
    }

    // Build combinations: outer loop = background, inner loop = logo (alt logo before alt color).
    let best = null;
    for (const backgroundColor of backgrounds) {
        for (const logo of logos) {
            const distance = colorDistance(logo.avgHex, backgroundColor);
            if (distance >= COLOR_SIMILARITY_THRESHOLD) {
                return { logoUrl: logo.url, backgroundColor };
            }
            if (!best || distance > best.distance) {
                best = { logoUrl: logo.url, backgroundColor, distance };
            }
        }
    }

    return { logoUrl: best.logoUrl, backgroundColor: best.backgroundColor };
}

/**
 * Load a team logo with automatic selection, downloading, and trimming
 * This is the recommended way to load logos as it handles all processing in one step
 * @param {Object} team - Team object with logo and logoAlt properties
 * @param {string} backgroundColor - Background color for contrast checking
 * @returns {Promise<Image>} Loaded and trimmed logo image ready to use
 */
async function loadTrimmedLogo(team, backgroundColor) {
    try {
        // Select best logo based on contrast (handles fallback to logoAlt automatically)
        const logoUrl = await selectBestLogo(team, backgroundColor);

        // Download and trim the logo (with URL as cache key)
        let logoBuffer = await downloadImageWithSvgSupport(logoUrl);
        logoBuffer = await trimImage(logoBuffer, logoUrl);

        // Load and return the image
        return await loadImage(logoBuffer);
    } catch (error) {
        logger.warn('Error loading trimmed logo', {
            team: team.name,
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    selectBestLogo,
    selectLogoAndColorForSingleTeam,
    loadTrimmedLogo,
    handleTeamNotFoundError,
    generateFallbackTeamObject,
    buildSkipLogosTeam,
    resolveTeamsWithFallback,
    convertTeamToGreyscaleLoser,
    applyWinnerEffect
};
