// ------------------------------------------------------------------------------
// FlagCDNProvider.js
// FlagCDN provider implementation for country flags
// Handles country flag resolution and fetching from flagcdn.com
// ------------------------------------------------------------------------------

const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');
const BaseProvider = require('./BaseProvider');
const { findTeamByAlias, applyTeamOverrides } = require('../helpers/teamUtils');
const { downloadImage } = require('../helpers/imageUtils');
const logger = require('../helpers/logger');

// Custom error class for team/country not found errors
class TeamNotFoundError extends Error {
    constructor(countryIdentifier, availableCountries) {
        const countryNames = Object.keys(availableCountries).slice(0, 20).join(', ');
        const remaining = Object.keys(availableCountries).length > 20 ? ` and ${Object.keys(availableCountries).length - 20} more` : '';
        super(`Country not found: '${countryIdentifier}'. Available countries include: ${countryNames}${remaining}`);
        this.name = 'TeamNotFoundError';
        this.countryIdentifier = countryIdentifier;
        this.availableCountries = availableCountries;
    }
}

class FlagCDNProvider extends BaseProvider {
    constructor() {
        super();
        this.countriesCache = null;
        this.cacheTimestamp = null;
        this.colorCache = new Map();
        this.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10); // 10 seconds
        
        // ISO 3166 alpha-3 to alpha-2 code mappings for common Olympic/sports codes
        this.iso3to2 = {
            'usa': 'us', 'gbr': 'gb', 'can': 'ca', 'aus': 'au', 'fra': 'fr', 'ger': 'de', 'deu': 'de',
            'ita': 'it', 'esp': 'es', 'ned': 'nl', 'nld': 'nl', 'bra': 'br', 'arg': 'ar', 'mex': 'mx',
            'jpn': 'jp', 'chn': 'cn', 'kor': 'kr', 'ind': 'in', 'rus': 'ru', 'ukr': 'ua', 'pol': 'pl',
            'swe': 'se', 'nor': 'no', 'fin': 'fi', 'dnk': 'dk', 'che': 'ch', 'aut': 'at', 'bel': 'be',
            'prt': 'pt', 'irl': 'ie', 'nzl': 'nz', 'zaf': 'za', 'egy': 'eg', 'nga': 'ng', 'ken': 'ke',
            'eth': 'et', 'mar': 'ma', 'alg': 'dz', 'dza': 'dz', 'tur': 'tr', 'sau': 'sa', 'are': 'ae',
            'isr': 'il', 'irn': 'ir', 'iaq': 'iq', 'pak': 'pk', 'ban': 'bd', 'bgd': 'bd', 'tha': 'th',
            'mys': 'my', 'sgp': 'sg', 'idn': 'id', 'phl': 'ph', 'vnm': 'vn', 'cze': 'cz', 'svk': 'sk',
            'hun': 'hu', 'rou': 'ro', 'bgr': 'bg', 'hrv': 'hr', 'srb': 'rs', 'svn': 'si', 'grc': 'gr',
            'col': 'co', 'ven': 've', 'chl': 'cl', 'per': 'pe', 'ecu': 'ec', 'ury': 'uy', 'par': 'py',
            'cri': 'cr', 'pan': 'pa', 'jam': 'jm', 'cub': 'cu', 'dom': 'do',
            // Special Olympic/sports codes
            'eng': 'gb-eng', 'sct': 'gb-sct', 'wal': 'gb-wls', 'nir': 'gb-nir',
            'roc': 'ru', // Russian Olympic Committee (use Russia flag)
            'oar': 'ru', // Olympic Athletes from Russia (use Russia flag)
            'aor': 'ru', // Athletes from Russia (use Russia flag)
            'rpc': 'ru', // Russian Paralympic Committee
        };
    }

    getProviderId() {
        return 'flagcdn';
    }

    getLeagueConfig(league) {
        // Check for config in providers array
        if (league.providers && Array.isArray(league.providers)) {
            for (const providerConfig of league.providers) {
                if (typeof providerConfig === 'object' && providerConfig.flagcdn) {
                    return providerConfig.flagcdn;
                }
            }
        }
        
        return null;
    }

    /**
     * Fetch country codes and names from flagcdn.com
     */
    async fetchCountries() {
        // Return cached data if available and fresh
        if (this.countriesCache && this.cacheTimestamp && 
            Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
            return this.countriesCache;
        }

        try {
            const response = await axios.get('https://flagcdn.com/en/codes.json', {
                timeout: this.REQUEST_TIMEOUT,
                headers: {
                    'User-Agent': 'game-thumbs/1.0'
                }
            });

            this.countriesCache = response.data;
            this.cacheTimestamp = Date.now();

            return this.countriesCache;
        } catch (error) {
            // If we have cached data, return it even if stale
            if (this.countriesCache) {
                logger.warn('FlagCDN fetch failed, using stale cache', { 
                    error: error.message 
                });
                return this.countriesCache;
            }
            throw this.handleHttpError(error, 'FlagCDN country list');
        }
    }

    /**
     * Extract dominant colors from flag image (without filtering light colors)
     */
    async extractFlagColors(imageUrl, numColors = 2) {
        try {
            const imageBuffer = await downloadImage(imageUrl);
            const image = await loadImage(imageBuffer);
            
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            const colorMap = new Map();
            const sampleRate = 5;
            
            for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                // Skip transparent pixels only
                if (a < 128) continue;
                
                // Quantize colors to reduce variations
                const qr = Math.round(r / 15) * 15;
                const qg = Math.round(g / 15) * 15;
                const qb = Math.round(b / 15) * 15;
                
                const colorKey = `${qr},${qg},${qb}`;
                colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
            }
            
            // Sort by frequency and get most common colors
            let sortedColors = Array.from(colorMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, numColors)
                .map(([color]) => {
                    const [r, g, b] = color.split(',').map(Number);
                    return { r, g, b };
                });
            
            // Ensure we have at least 2 colors
            while (sortedColors.length < numColors) {
                sortedColors.push(sortedColors.length === 0 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 });
            }
            
            // If either color is white, use the non-white color for both
            const isWhite = (color) => color.r > 240 && color.g > 240 && color.b > 240;
            
            if (sortedColors.length >= 2) {
                const color1IsWhite = isWhite(sortedColors[0]);
                const color2IsWhite = isWhite(sortedColors[1]);
                
                if (color1IsWhite && !color2IsWhite) {
                    // Color 1 is white, use color 2 for both
                    sortedColors[0] = { ...sortedColors[1] };
                } else if (!color1IsWhite && color2IsWhite) {
                    // Color 2 is white, use color 1 for both
                    sortedColors[1] = { ...sortedColors[0] };
                }
            }
            
            // Desaturate and darken colors for better thumbnails
            const hexColors = sortedColors.map(({ r, g, b }) => {
                // Convert RGB to HSL
                const rNorm = r / 255;
                const gNorm = g / 255;
                const bNorm = b / 255;
                
                const max = Math.max(rNorm, gNorm, bNorm);
                const min = Math.min(rNorm, gNorm, bNorm);
                let h, s, l = (max + min) / 2;
                
                if (max === min) {
                    h = s = 0; // achromatic
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    
                    switch (max) {
                        case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
                        case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
                        case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
                    }
                }
                
                // Reduce saturation by 40% and darken by 30%
                s = s * 0.6;
                l = l * 0.7;
                
                // Convert HSL back to RGB
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                
                let rFinal, gFinal, bFinal;
                if (s === 0) {
                    rFinal = gFinal = bFinal = l;
                } else {
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    rFinal = hue2rgb(p, q, h + 1/3);
                    gFinal = hue2rgb(p, q, h);
                    bFinal = hue2rgb(p, q, h - 1/3);
                }
                
                const finalR = Math.round(rFinal * 255);
                const finalG = Math.round(gFinal * 255);
                const finalB = Math.round(bFinal * 255);
                
                return `#${finalR.toString(16).padStart(2, '0')}${finalG.toString(16).padStart(2, '0')}${finalB.toString(16).padStart(2, '0')}`;
            });
            
            return hexColors;
        } catch (error) {
            logger.warn('Failed to extract flag colors', { url: imageUrl, error: error.message });
            return ['#000000', '#ffffff'];
        }
    }

    /**
     * Normalize country name for matching
     */
    normalizeCountryName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, ' ')         // Normalize whitespace
            .trim();
    }

    /**
     * Score the match between input and country name
     */
    getMatchScore(input, countryName, countryCode) {
        const normalizedInput = this.normalizeCountryName(input);
        const normalizedCountry = this.normalizeCountryName(countryName);
        const inputLower = input.toLowerCase();
        
        // Check ISO 3-letter code match first
        if (this.iso3to2[inputLower] === countryCode.toLowerCase()) {
            return 1100; // Higher than exact 2-letter match
        }
        
        // Exact 2-letter code match
        if (inputLower === countryCode.toLowerCase()) {
            return 1000;
        }
        
        // Exact name match
        if (normalizedInput === normalizedCountry) {
            return 900;
        }
        
        // Check if input matches country name with spaces removed (e.g., "unitedstates" -> "united states")
        const countryNoSpaces = normalizedCountry.replace(/\s+/g, '');
        if (normalizedInput === countryNoSpaces) {
            return 850; // High score, between exact match and starts-with
        }
        
        // Starts with input
        if (normalizedCountry.startsWith(normalizedInput)) {
            return 800;
        }
        
        // Contains input as whole word
        const words = normalizedCountry.split(' ');
        if (words.some(word => word === normalizedInput)) {
            return 700;
        }
        
        // Check if input (without spaces) starts with country name (without spaces)
        const inputNoSpaces = normalizedInput.replace(/\s+/g, '');
        if (countryNoSpaces.startsWith(inputNoSpaces)) {
            return 650;
        }
        
        // Contains input as partial match
        if (normalizedCountry.includes(normalizedInput)) {
            return 600;
        }
        
        // Word-by-word partial matching
        const inputWords = normalizedInput.split(' ');
        const countryWords = words;
        let matchingWords = 0;
        
        for (const inputWord of inputWords) {
            if (countryWords.some(cw => cw.startsWith(inputWord) || inputWord.startsWith(cw))) {
                matchingWords++;
            }
        }
        
        if (matchingWords > 0) {
            return 500 + (matchingWords * 50);
        }
        
        return 0;
    }

    async resolveTeam(league, teamIdentifier) {
        if (!league || !teamIdentifier) {
            throw new Error('Both league and team identifier are required');
        }

        const flagCDNConfig = this.getLeagueConfig(league);
        if (!flagCDNConfig) {
            throw new Error(`League ${league.shortName} is missing FlagCDN configuration`);
        }

        try {
            const countries = await this.fetchCountries();

            // Check for custom alias match first
            const countriesArray = Object.entries(countries).map(([code, name]) => ({
                code,
                name,
                espnId: code // Use country code as ID for alias matching
            }));
            
            const aliasMatch = findTeamByAlias(teamIdentifier, league.shortName.toLowerCase(), countriesArray);
            
            let bestCode = null;
            let bestName = null;
            let bestScore = 0;

            if (aliasMatch) {
                // Found via custom alias
                bestCode = aliasMatch.code;
                bestName = aliasMatch.name;
                bestScore = 1000;
            } else {
                // Check if input is a 3-letter ISO code
                const inputLower = teamIdentifier.toLowerCase();
                if (this.iso3to2[inputLower]) {
                    const mappedCode = this.iso3to2[inputLower];
                    // Find the country with this code
                    for (const [code, name] of Object.entries(countries)) {
                        if (code === mappedCode) {
                            bestCode = code;
                            bestName = name;
                            bestScore = 1100;
                            break;
                        }
                    }
                }
                
                // If still not found, do normal matching
                if (!bestCode) {
                    // Find best matching country
                    for (const [code, name] of Object.entries(countries)) {
                        const score = this.getMatchScore(teamIdentifier, name, code);
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestCode = code;
                            bestName = name;
                        }
                    }
                }
            }

            if (!bestCode || bestScore === 0) {
                throw new TeamNotFoundError(teamIdentifier, countries);
            }

            // Build flag URL (using w2560 for high resolution)
            const flagUrl = `https://flagcdn.com/w2560/${bestCode.toLowerCase()}.png`;

            // Extract colors from flag
            let primaryColor = null;
            let alternateColor = null;
            
            // Check cache first
            const colorCacheKey = `colors_${bestCode}`;
            const cachedColors = this.colorCache.get(colorCacheKey);
            
            if (cachedColors && Date.now() - cachedColors.timestamp < this.CACHE_DURATION) {
                primaryColor = cachedColors.primary;
                alternateColor = cachedColors.alternate;
            } else {
                // Extract colors from flag using custom implementation
                try {
                    const extractedColors = await this.extractFlagColors(flagUrl, 2);
                    primaryColor = extractedColors[0];
                    alternateColor = extractedColors[1];
                    
                    // Cache the extracted colors
                    this.colorCache.set(colorCacheKey, {
                        primary: primaryColor,
                        alternate: alternateColor,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    logger.warn('Failed to extract colors from flag', { country: bestName, code: bestCode, error: error.message });
                    primaryColor = '#000000';
                    alternateColor = '#ffffff';
                }
            }
            
            // Ensure we have valid colors
            if (!primaryColor) primaryColor = '#000000';
            if (!alternateColor) alternateColor = '#ffffff';

            // Build standardized team format
            let teamData = {
                id: bestCode,
                slug: bestCode,
                city: '',
                name: bestName,
                fullName: bestName,
                abbreviation: bestCode.toUpperCase(),
                conference: null,
                division: null,
                logo: flagUrl,
                logoAlt: flagUrl,
                color: primaryColor,
                alternateColor: alternateColor
            };

            // Apply team overrides if any exist
            teamData = applyTeamOverrides(teamData, 'country', bestCode);

            return teamData;
        } catch (error) {
            // Re-throw TeamNotFoundError as-is
            if (error.name === 'TeamNotFoundError') {
                throw error;
            }
            
            logger.error('Country resolution failed', {
                country: teamIdentifier,
                error: error.message
            });
            
            throw new Error(`Failed to resolve country: ${error.message}`);
        }
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        // Countries don't have a league logo
        // Return null to indicate no logo available
        return null;
    }

    clearCache() {
        this.countriesCache = null;
        this.cacheTimestamp = null;
        this.colorCache.clear();
    }
}

module.exports = FlagCDNProvider;
