// ------------------------------------------------------------------------------
// logo.js
// Unified route to generate logo images
// - League logo: /:league/logo
// - Team logo: /:league/:team/logo
// - Matchup logo: /:league/:team1/:team2/logo
//
// Built on the shared createImageRoute factory but supplies its own league/team
// case handlers (style-1 diagonal split, _logoPng, variant) since those diverge
// from the thumb/cover defaults. The matchup case reuses the shared renderMatchup
// tail (resolve/skipLogos/winner/badge) with logo-specific options.
// ------------------------------------------------------------------------------

const providerManager = require('../helpers/ProviderManager');
const { generateLogo } = require('../generators/logoGenerator');
const {
    downloadImage,
    downloadImageWithSvgSupport,
    buildSkipLogosTeam,
    selectLogoAndColorForSingleTeam,
    handleTeamNotFoundError
} = require('../helpers/imageUtils');
const { createImageRoute, renderMatchup, applyBadgeWithCaching } = require('../helpers/routeUtils');
const { DIMENSIONS } = require('../config/constants');

const VALID_SIZES = DIMENSIONS.LOGO_VALID_SIZES;

// Apply a valid `size` override (256/512/1024/2048) to square logo options.
function applySizeOverride(logoOptions, size) {
    const sizeValue = parseInt(size);
    if (VALID_SIZES.includes(sizeValue)) {
        logoOptions.width = sizeValue;
        logoOptions.height = sizeValue;
    }
}

// Case 1: League logo (/:league/logo)
async function renderLeagueLogo(ctx) {
    const { req, res, leagueObj, query } = ctx;
    const { size, style, trim, variant, badge } = query;
    const styleValue = parseInt(style) || 0;

    if (styleValue === 1) {
        // Style 1: reuse matchup diagonal split with skipLogos dummy teams
        const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
        const dummyTeam = await buildSkipLogosTeam(leagueLogoUrl);
        const logoOptions = {
            width: DIMENSIONS.LOGO_DEFAULT,
            height: DIMENSIONS.LOGO_DEFAULT,
            style: 1,
            league: { logoUrl: leagueLogoUrl },
            trim: trim !== 'false'
        };
        applySizeOverride(logoOptions, size);
        const buffer = await applyBadgeWithCaching({
            req, res, badge, badgeScale: 0.18,
            generate: () => generateLogo(dummyTeam, { ...dummyTeam }, logoOptions)
        });
        return { buffer };
    }

    // Validate variant parameter if provided
    if (variant && variant !== 'light' && variant !== 'dark') {
        res.status(400).json({ error: `Invalid variant: ${variant}. Use 'light' or 'dark'` });
        return { servedEarly: true };
    }

    const darkLogoPreferred = variant === 'dark';
    const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, darkLogoPreferred);

    if (!leagueLogoUrl) {
        res.status(404).json({ error: 'League logo not found' });
        return { servedEarly: true };
    }

    return { buffer: await downloadImageWithSvgSupport(leagueLogoUrl) };
}

// Case 2: Single team logo (/:league/:team1/logo)
async function renderTeamLogo(ctx) {
    const { req, res, leagueObj, team1, query } = ctx;
    const { size, style, trim, variant, fallback, badge } = query;
    const styleValue = parseInt(style) || 0;

    let logoBuffer;
    try {
        const resolvedTeam = await providerManager.resolveTeam(leagueObj, team1);

        if (styleValue === 1) {
            // Style 1: reuse matchup diagonal split with skipLogos dummy teams.
            // Pick the logo/background by contrast (alt logo before alt color)
            // so e.g. the Yankees get their white alt logo on the navy primary.
            const { logoUrl, backgroundColor } = await selectLogoAndColorForSingleTeam(resolvedTeam);
            const dummyTeam = await buildSkipLogosTeam(null, backgroundColor);
            const logoOptions = {
                width: DIMENSIONS.LOGO_DEFAULT,
                height: DIMENSIONS.LOGO_DEFAULT,
                style: 1,
                league: { logoUrl },
                trim: trim !== 'false'
            };
            applySizeOverride(logoOptions, size);
            logoBuffer = await applyBadgeWithCaching({
                req, res, badge, badgeScale: 0.18,
                generate: () => generateLogo(dummyTeam, { ...dummyTeam }, logoOptions)
            });
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
                res.status(400).json({ error: `Invalid variant: ${variant}. Use 'light' or 'dark'` });
                return { servedEarly: true };
            }

            if (!logoUrl) {
                res.status(404).json({ error: 'Logo not found for team' });
                return { servedEarly: true };
            }

            logoBuffer = await downloadImageWithSvgSupport(logoUrl);
        }
    } catch (teamError) {
        await handleTeamNotFoundError(teamError, fallback === 'true', async () => {
            const darkLogoPreferred = variant === 'dark';
            const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj, darkLogoPreferred);
            logoBuffer = await downloadImageWithSvgSupport(leagueLogoUrl);
        });
    }

    return { buffer: logoBuffer };
}

// Case 3: Matchup logo (/:league/:team1/:team2/logo)
async function renderMatchupLogo(ctx) {
    const { req, res, leagueObj, league, team1, team2, query } = ctx;
    const { size, style, useLight, trim, logo } = query;

    const styleValue = parseInt(style) || 1;
    // Styles 1, 5, and 6 have league logo enabled by default
    const hasLeagueLogoByDefault = styleValue === 1 || styleValue === 5 || styleValue === 6;

    const logoOptions = {
        width: DIMENSIONS.LOGO_DEFAULT,
        height: DIMENSIONS.LOGO_DEFAULT,
        style: styleValue,
        league: (logo === 'true' || (logo !== 'false' && hasLeagueLogoByDefault)) ? league : null,
        useLight: useLight === 'true',
        trim: trim !== 'false'
    };
    applySizeOverride(logoOptions, size);

    return renderMatchup({
        req, res, leagueObj, team1, team2, query,
        leagueLogoPreferDark: useLight !== 'true',
        badgeScale: 0.18,
        buildLeagueInfo: async () => {
            if (!logoOptions.league) return null;
            // For styles 5 and 6, fetch both default and dark logos for contrast checking.
            // Default logo is primary (colored, for light bg); dark logo is alternate (for dark bg).
            if (styleValue === 5 || styleValue === 6) {
                const { logoUrl: leagueLogoUrl, logoUrlAlt: leagueLogoUrlAlt } = await providerManager.getLeagueLogoPair(leagueObj);
                return {
                    logoUrl: leagueLogoUrl,
                    logoUrlAlt: leagueLogoUrlAlt !== leagueLogoUrl ? leagueLogoUrlAlt : null
                };
            }
            const leagueLogoUrl = await providerManager.getLeagueLogoUrl(leagueObj);
            return { logoUrl: leagueLogoUrl };
        },
        generate: (t1, t2, leagueInfo) => generateLogo(t1, t2, { ...logoOptions, league: leagueInfo })
    });
}

module.exports = createImageRoute({
    suffix: 'logo',
    errorContext: 'Logo generation failed',
    renderLeague: renderLeagueLogo,
    renderTeam: renderTeamLogo,
    renderMatchupCase: renderMatchupLogo
});
