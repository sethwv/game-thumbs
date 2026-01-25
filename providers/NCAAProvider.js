// ------------------------------------------------------------------------------
// NCAAProvider.js
// Provider for NCAA.com logo API with SVG-to-PNG conversion
// Uses ncaa.com's official logo endpoint and converts SVG to PNG
// ------------------------------------------------------------------------------

const BaseProvider = require('./BaseProvider');
const logger = require('../helpers/logger');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');
let sharp = null;
try {
    sharp = require('sharp');
} catch (e) {
    sharp = null; // optional; falls back to canvas
}

const SPORTS = [
    'volleyball-women',
    'basketball-men',
    'basketball-women',
    'football',
    'baseball',
    'softball',
    'soccer-men',
    'soccer-women'
];

const DIVISIONS = ['d1', 'd2', 'd3'];
const MASCOT_SUFFIXES = [
    'bulldogs','bulldog','eagles','wildcats','lions','tigers','panthers','bearcats','bears','hawks','knights','raiders','trojans','spartans','falcons','wolves','vikings','rams','owls','mustangs','cardinals','cougars','broncos','chargers','warriors'
];

const PNG_WIDTH = 2048;
const PNG_HEIGHT = 2048;
const LOGO_DENSITY = 400;
const COLOR_SAMPLE_RATE = 20;
const TEAM_POOL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

// Custom error class for team not found errors
class TeamNotFoundError extends Error {
    constructor(teamIdentifier, leagueName, message) {
        super(message || `Team not found: '${teamIdentifier}' in ${leagueName}`);
        this.name = 'TeamNotFoundError';
        this.teamIdentifier = teamIdentifier;
        this.league = leagueName;
    }
}

async function rasterizeWithSharp(svgBuffer, width, height) {
    const sharpPng = await sharp(svgBuffer, { density: LOGO_DENSITY })
        .resize(width, height, { fit: 'inside', withoutEnlargement: false })
        .png({ compressionLevel: 0, effort: 1 })
        .toBuffer();
    const image = await loadImage(sharpPng);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return { pngBuffer: sharpPng, canvas };
}

async function rasterizeWithCanvas(svgBuffer, width, height) {
    const svgDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
    const image = await loadImage(svgDataUrl);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.antialias = 'subpixel';
    ctx.patternQuality = 'best';

    const intrinsicWidth = image.width || width;
    const intrinsicHeight = image.height || height;
    const scale = Math.min(width / intrinsicWidth, height / intrinsicHeight);
    const scaledWidth = intrinsicWidth * scale;
    const scaledHeight = intrinsicHeight * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    const pngBuffer = canvas.toBuffer('image/png', {
        compressionLevel: 0,
        filters: 0
    });
    return { pngBuffer, canvas };
}

async function rasterizeLogo(svgBuffer, width = PNG_WIDTH, height = PNG_HEIGHT) {
    if (sharp) {
        return rasterizeWithSharp(svgBuffer, width, height);
    }
    return rasterizeWithCanvas(svgBuffer, width, height);
}

function extractPalette(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const colorMap = new Map();

    for (let i = 0; i < pixels.length; i += 4 * COLOR_SAMPLE_RATE) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];

        if (a < 128 || (r > 240 && g > 240 && b > 240)) continue;

        const qr = Math.round(r / 10) * 10;
        const qg = Math.round(g / 10) * 10;
        const qb = Math.round(b / 10) * 10;

        const colorKey = `${qr},${qg},${qb}`;
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    if (colorMap.size === 0) return { color: null, alternateColor: null };

    const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([color]) => {
            const [r, g, b] = color.split(',').map(Number);
            const hex = '#' + [r, g, b].map(x => {
                const h = x.toString(16);
                return h.length === 1 ? '0' + h : h;
            }).join('');
            return hex;
        });

    return {
        color: sortedColors[0] || null,
        alternateColor: sortedColors[1] || sortedColors[0] || null
    };
}

function generateSchoolSlugs(teamName) {
    const slugs = [];
    const normalize = (str) => str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const camelWords = teamName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(/\s+/);
    const spaceWords = teamName.split(/\s+/);
    const words = camelWords.length > spaceWords.length ? camelWords : spaceWords;

    if (words.length === 1) {
        const token = words[0].toLowerCase();
        for (const suffix of MASCOT_SUFFIXES) {
            if (token.endsWith(suffix) && token.length > suffix.length + 2) {
                const base = token.slice(0, -suffix.length);
                const baseNorm = normalize(base);
                if (baseNorm && baseNorm.length >= 3) {
                    slugs.push(baseNorm);
                    slugs.push(`${baseNorm}-state`);
                    slugs.push(`${baseNorm}-st`);
                    slugs.push(`${baseNorm}-${suffix}`);
                    slugs.push(`${baseNorm}-state-${suffix}`);
                    slugs.push(`${baseNorm}-st-${suffix}`);
                }
                break;
            }
        }
    }

    const fullText = words.join(' ').toLowerCase();

    if (fullText.includes(' st ') || fullText.match(/\bst\b/)) {
        const withST = words.map(w => w.toLowerCase() === 'st' ? 's-t' : w).join(' ');
        const stWords = withST.split(' ');
        slugs.push(normalize(stWords.slice(0, -1).join(' ')));
        slugs.push(normalize(stWords.slice(0, 2).join(' ')));
    }

    for (let i = words.length - 1; i >= 1; i--) {
        const partial = words.slice(0, i).join(' ');
        const slug = normalize(partial);
        if (slug && slug.length >= 3 && !slugs.includes(slug)) {
            slugs.push(slug);
        }
    }

    for (let i = words.length; i >= 2; i--) {
        const partial = words.slice(0, i).join('').toLowerCase();
        if (partial.length >= 3 && !slugs.includes(partial)) {
            slugs.push(partial);
        }
    }

    if (fullText.includes('st') || fullText.includes('state')) {
        const withState = fullText.replace(/\bst\b/g, 'state');
        const stateWords = withState.split(/\s+/);
        for (let i = stateWords.length; i >= 2; i--) {
            const slug = normalize(stateWords.slice(0, i).join(' '));
            if (slug && !slugs.includes(slug)) {
                slugs.push(slug);
            }
        }
    }

    return slugs;
}

function matchTeamToTeam(teamIdentifier, teams) {
    const splitCamel = teamIdentifier
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

    let cleanInput = splitCamel.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const hasST = /\bst\b/.test(cleanInput);
    const inputWords = cleanInput.split(' ');
    const schoolWords = inputWords.slice(0, Math.max(2, inputWords.length - 1));

    if (hasST) {
        let bestSciTech = null;
        let bestSciTechScore = 0;

        for (const [seoname, team] of Object.entries(teams)) {
            const cleanName = team.name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!/science/.test(cleanName) || !/technology/.test(cleanName)) continue;

            const nameWords = cleanName.split(' ').filter(w => w.length > 1);
            const schoolMatches = schoolWords.filter(w => w.length > 1 && nameWords.includes(w)).length;

            if (schoolMatches === 0) continue;

            let score = (schoolMatches / schoolWords.length) * 140;
            let sequenceBonus = 0;
            for (let i = 0; i < schoolWords.length && i < nameWords.length; i++) {
                if (schoolWords[i] === nameWords[i]) sequenceBonus += 30;
            }
            score += sequenceBonus;

            const lengthDiff = Math.abs(cleanName.length - cleanInput.length);
            if (lengthDiff > 30) score -= 25;
            else if (lengthDiff > 20) score -= 10;

            if (score > bestSciTechScore) {
                bestSciTechScore = score;
                bestSciTech = seoname;
            }
        }

        if (bestSciTech && bestSciTechScore >= 50) {
            return bestSciTech;
        }
    }

    let bestMatch = null;
    let bestScore = 0;

    const normalizedSlug = cleanInput.replace(/\s+/g, '-');
    const condensedInput = cleanInput.replace(/\s+/g, '');

    for (const [seoname, team] of Object.entries(teams)) {
        const cleanName = team.name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const condensedSeoname = seoname.replace(/-/g, '');
        if (normalizedSlug === seoname || condensedInput === condensedSeoname || condensedInput.startsWith(condensedSeoname)) {
            return seoname;
        }

        if (cleanInput.replace(/\s+/g, '-') === seoname || 
            schoolWords.join('-') === seoname ||
            schoolWords.join(' ').replace(/\s+/g, '-') === seoname) {
            return seoname;
        }

        if (cleanInput === cleanName) {
            return seoname;
        }

        let score = 0;
        const nameWords = cleanName.split(' ').filter(w => w.length > 1);

        if (hasST && /science.*technology|s.*t/.test(cleanName)) {
            score += 80;
        }

        if (hasST && /\bstate\b/.test(cleanName) && !/science|technology/.test(cleanName)) {
            score -= 50;
        }

        const schoolMatches = schoolWords.filter(w => w.length > 1 && nameWords.includes(w)).length;
        if (schoolWords.length > 0 && schoolMatches > 0) {
            const matchRatio = schoolMatches / schoolWords.length;
            score += matchRatio * 100;
            let sequenceBonus = 0;
            for (let i = 0; i < schoolWords.length && i < nameWords.length; i++) {
                if (schoolWords[i] === nameWords[i]) {
                    sequenceBonus += 20;
                }
            }
            score += sequenceBonus;
        }

        const lengthDiff = Math.abs(cleanName.length - cleanInput.length);
        if (lengthDiff > 20) {
            score -= 30;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = seoname;
        }
    }

    return bestScore >= 100 ? bestMatch : null;
}

class NCAAProvider extends BaseProvider {
    constructor() {
        super();
        this.cache = new Map(); // Cache for converted logos
        this.poolInitPromise = null;
        this.teamsPoolExpiry = null; // TTL for teams pool cache
        this.teamsPoolTtlMs = TEAM_POOL_TTL_MS;
    }

    getProviderId() {
        return 'ncaa';
    }

    /**
     * Convert SVG to PNG using canvas
     * @param {Buffer} svgBuffer - SVG data
     * @param {number} width - Output width (default: 2048 for sharper PNG output)
     * @param {number} height - Output height (default: 2048 for sharper PNG output)
     * @returns {Promise<{pngBuffer: Buffer, canvas: any}>} PNG buffer and canvas for color extraction
     */
    async convertSvgToPng(svgBuffer, width = PNG_WIDTH, height = PNG_HEIGHT) {
        try {
            return await rasterizeLogo(svgBuffer, width, height);
        } catch (error) {
            logger.warn(`Failed to convert SVG to PNG: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch and convert NCAA.com logo
     * @param {string} schoolSlug - School SEO slug (e.g., 'michigan', 'duke')
     * @param {boolean} darkBackground - Whether to fetch dark background version
     * @returns {Promise<{buffer: Buffer, url: string}>}
     */
    async fetchAndConvertLogo(schoolSlug, darkBackground = false) {
        const bgParam = darkBackground ? 'bgd' : 'bgl';
        const url = `https://www.ncaa.com/sites/default/files/images/logos/schools/${bgParam}/${schoolSlug}.svg`;
        
        // Check cache
        const cacheKey = `${schoolSlug}-${bgParam}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: REQUEST_TIMEOUT,
                maxRedirects: 5,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const svgBuffer = Buffer.from(response.data);
            const { pngBuffer, canvas } = await this.convertSvgToPng(svgBuffer);
            
            const result = {
                buffer: pngBuffer,
                canvas: canvas,
                url: url // Keep original URL for reference
            };
            
            // Cache the result
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            // Suppress noisy logs for blocked/missing NCAA assets
            if (error.response?.status === 404 || error.response?.status === 403) {
                throw new Error(`Logo not available for school: ${schoolSlug}`);
            }
            logger.warn(`  ✗ Error fetching ${schoolSlug}: ${error.message}`, {
                status: error.response?.status,
                url
            });
            throw error;
        }
    }

    /**
     * Initialize comprehensive teams pool from all divisions and sports
     * Fetches all NCAA teams across d1, d2, d3 for better matching coverage
     * @returns {Promise<Object>} Map of seoname -> {name, seoname, sport, division}
     */
    async initializeTeamsPool() {
        const now = Date.now();

        if (this.poolInitialized && this.teamsPool && this.teamsPoolExpiry && now < this.teamsPoolExpiry) {
            return this.teamsPool;
        }

        if (this.poolInitPromise) {
            return this.poolInitPromise;
        }

        const teams = {};

        // Fetch all sport/division combinations in parallel
        const fetchPromises = [];
        for (const sport of SPORTS) {
            for (const division of DIVISIONS) {
                fetchPromises.push(
                    axios.get(`https://www.ncaa.com/json/teams/${sport}/${division}`, {
                        timeout: 10000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GameThumbs/1.0)' }
                    })
                    .then(response => ({ sport, division, data: response.data }))
                    .catch(error => {
                        logger.warn(`[NCAA Provider] Failed ${sport}/${division}: ${error.message}`);
                        return null;
                    })
                );
            }
        }

        this.poolInitPromise = (async () => {
            try {
                const results = await Promise.all(fetchPromises);

                // Process all results
                for (const result of results) {
                    if (!result || !result.data?.content || !Array.isArray(result.data.content)) {
                        continue;
                    }

                    for (const team of result.data.content) {
                        // Use seoname as key, but include sport/division for context
                        // If duplicate seoname, prefer higher division (d1 > d2 > d3)
                        if (!teams[team.seoname] || 
                            (result.division === 'd1' && teams[team.seoname].division !== 'd1') ||
                            (result.division === 'd2' && teams[team.seoname].division === 'd3')) {
                            teams[team.seoname] = {
                                name: team.name,
                                seoname: team.seoname,
                                sport: result.sport,
                                division: result.division
                            };
                        }
                    }
                }

                this.teamsPool = teams;
                this.poolInitialized = true;
                this.teamsPoolExpiry = Date.now() + this.teamsPoolTtlMs;
                return teams;
            } finally {
                this.poolInitPromise = null;
            }
        })();

        return this.poolInitPromise;
    }

    /**
     * Resolve team using NCAA.com logo API
     * @param {Object} league - League configuration
     * @param {string} teamIdentifier - Team name or identifier
     * @returns {Promise<Object>} Team data with converted PNG logo
     */
    async resolveTeam(league, teamIdentifier) {
        // Initialize teams pool on first use
        const teams = await this.initializeTeamsPool();

        let slugsToTry = [];

        // Try matching with teams pool
        if (Object.keys(teams).length > 0) {
            const matchedSlug = matchTeamToTeam(teamIdentifier, teams);
            if (matchedSlug) {
                const team = teams[matchedSlug];
                slugsToTry.push(matchedSlug);
            }
        }

        // Fall back to slug generation if no match found
        if (slugsToTry.length === 0) {
            slugsToTry = generateSchoolSlugs(teamIdentifier);
        }
        
        // Try each slug variation
        for (const schoolSlug of slugsToTry) {
            try {
                // Fetch and convert logo
                const { buffer, canvas, url } = await this.fetchAndConvertLogo(schoolSlug, false);
                
                // Extract colors from canvas directly
                let color = null;
                let alternateColor = null;
                try {
                    const palette = extractPalette(canvas);
                    color = palette.color;
                    alternateColor = palette.alternateColor;
                } catch (colorError) {
                    // ignore palette failure
                }

                // Return standardized team object
                return {
                    name: teamIdentifier, // Use input name as-is
                    abbreviation: schoolSlug.toUpperCase().substring(0, 4),
                    logo: `data:image/png;base64,${buffer.toString('base64')}`, // Data URL with PNG
                    logoUrl: url, // Original SVG URL for reference
                    color: color,
                    alternateColor: alternateColor,
                    providerId: this.getProviderId(),
                    metadata: {
                        schoolSlug: schoolSlug,
                        logoFormat: 'png-converted-from-svg',
                        originalSvgUrl: url
                    }
                };
            } catch (error) {
                // Continue to next slug
            }
        }

        // All slug variations failed
        throw new TeamNotFoundError(
            teamIdentifier,
            league.name,
            `NCAA.com logo not found for team: ${teamIdentifier} (tried slugs: ${slugsToTry.join(', ')})`
        );
    }

    /**
     * Get league logo URL
     * @param {Object} league - League configuration
     * @param {boolean} darkLogoPreferred - Whether dark logo is preferred
     * @returns {Promise<string>} League logo URL
     */
    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        // NCAA.com doesn't have league logos, return null to use default
        return league.logoUrl || null;
    }
}

module.exports = NCAAProvider;
