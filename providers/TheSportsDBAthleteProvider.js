// ------------------------------------------------------------------------------
// TheSportsDBAthleteProvider.js
// TheSportsDB athlete-based provider
// Treats individual athletes as "teams" for thumbnail generation
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, generateSlug, applyTeamOverrides } = require('../helpers/teamUtils');
const logger = require('../helpers/logger');
const fsCache = require('../helpers/fsCache');
const { TeamNotFoundError } = require('../helpers/errors');
const { extractDominantColors } = require('../helpers/colorUtils');
const { REQUEST_TIMEOUT } = require('../helpers/requestConfig');

class TheSportsDBAthleteProvider extends BaseProvider {
    constructor() {
        super();
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        this.REQUEST_TIMEOUT = REQUEST_TIMEOUT;
        this.API_KEY = process.env.THESPORTSDB_API_KEY || '3';

        this.colorPalettes = {
            motorsport: ['#0D1B2A', '#1B263B', '#1F2937', '#374151', '#111827'],
            tennis: ['#1B5E20', '#2E7D32', '#6D4C41', '#1565C0', '#9E9D24'],
            default: ['#1A2A3A', '#0F2535', '#1F3545', '#243447', '#2F3E46']
        };

        this.portraitFieldMap = {
            cartoon: 'strCartoon',
            cutout: 'strCutout',
            render: 'strRender',
            thumb: 'strThumb',
            banner: 'strBanner',
            fanart1: 'strFanart1',
            fanart2: 'strFanart2',
            fanart3: 'strFanart3',
            fanart4: 'strFanart4',
            poster: 'strPoster'
        };

        this.defaultPortraitPriority = ['strRender', 'strThumb', 'strFanart1', 'strBanner', 'strCutout'];
    }

    getProviderId() {
        return 'thesportsdbathlete';
    }

    getConfigKey() {
        return ['theSportsDBAthlete', 'theSportsDBAthleteConfig'];
    }

    generateRandomColor(sport = 'default') {
        const normalizedSport = String(sport || 'default').toLowerCase();
        const palette = this.colorPalettes[normalizedSport] || this.colorPalettes.default;
        return palette[Math.floor(Math.random() * palette.length)];
    }

    normalizeText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    normalizeLeagueToken(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\bone\b/g, '1')
            .replace(/\btwo\b/g, '2')
            .replace(/\bthree\b/g, '3')
            .replace(/\bfour\b/g, '4')
            .replace(/\bfive\b/g, '5')
            .replace(/[^a-z0-9]/g, '');
    }

    async resolveTeam(league, athleteIdentifier) {
        if (!league || !athleteIdentifier) {
            throw new Error('Both league and athlete identifier are required');
        }

        const config = this.getLeagueConfig(league);
        if (!config) {
            throw new Error(`League ${league.shortName} is missing TheSportsDB athlete configuration`);
        }

        // Support composite athlete matchups using the same syntax as ESPNAthleteProvider.
        if (athleteIdentifier.includes('+')) {
            const athleteNames = athleteIdentifier.split('+').map(name => name.trim()).filter(Boolean);
            if (athleteNames.length < 2) {
                throw new Error('Composite athlete requests require at least two names');
            }

            const resolvedAthletes = [];
            for (const athleteName of athleteNames) {
                const athlete = await this.resolveSingleAthlete(league, athleteName, config);
                resolvedAthletes.push(athlete);
            }

            const { mergeAthletesIntoTeam } = require('../helpers/athleteComposite');
            return mergeAthletesIntoTeam(resolvedAthletes, config.sport || 'default');
        }

        return this.resolveSingleAthlete(league, athleteIdentifier, config);
    }

    async resolveSingleAthlete(league, athleteIdentifier, config) {
        const athletes = await this.fetchAthleteCandidates(athleteIdentifier);
        const filteredAthletes = this.filterCandidatesByLeague(athletes, config);

        let bestMatch = null;
        let bestScore = 0;
        const normalizedInput = this.normalizeText(athleteIdentifier);

        for (const athlete of filteredAthletes) {
            const parsedName = this.parseName(athlete.strPlayer || athlete.strPlayerAlternate || '');
            const athleteSlug = generateSlug(athlete.strPlayer || athlete.strPlayerAlternate || athlete.idPlayer);
            const exactCandidates = [
                athlete.strPlayer,
                athlete.strPlayerAlternate,
                athleteSlug,
                `${parsedName.first}-${parsedName.last}`
            ]
                .filter(Boolean)
                .map(value => this.normalizeText(value));

            if (exactCandidates.includes(normalizedInput)) {
                bestMatch = athlete;
                bestScore = 10000;
                break;
            }

            const athleteObj = {
                fullName: athlete.strPlayer || athlete.strPlayerAlternate,
                shortDisplayName: athlete.strPlayer,
                name: parsedName.last,
                city: parsedName.first,
                abbreviation: `${parsedName.first?.[0] || ''}${parsedName.last?.[0] || ''}`
            };

            const score = getTeamMatchScoreWithOverrides(
                athleteIdentifier,
                athleteObj,
                athleteSlug,
                league.shortName.toLowerCase()
            );

            if (score > bestScore) {
                bestScore = score;
                bestMatch = athlete;
            }
        }

        // Reject weak fuzzy matches to avoid unrelated cross-sport/cross-league picks.
        if (!bestMatch || bestScore < 250) {
            const availableAthletes = filteredAthletes.map(athlete => ({
                id: athlete.idPlayer,
                fullName: athlete.strPlayer,
                name: athlete.strPlayer
            }));
            throw new TeamNotFoundError(athleteIdentifier, league, availableAthletes);
        }

        const hydratedBestMatch = await this.hydrateAthleteDetails(bestMatch);

        const parsedName = this.parseName(hydratedBestMatch.strPlayer || hydratedBestMatch.strPlayerAlternate || '');
        const athleteSlug = generateSlug(hydratedBestMatch.strPlayer || hydratedBestMatch.strPlayerAlternate || hydratedBestMatch.idPlayer);

        const portraitPriority = this.getPortraitPriority(config);
        const primaryLogo = this.pickPortrait(hydratedBestMatch, portraitPriority);
        const alternateLogo = primaryLogo || this.pickPortrait(hydratedBestMatch, portraitPriority.slice(1)) || this.pickPortrait(hydratedBestMatch, this.defaultPortraitPriority);

        if (!primaryLogo && !alternateLogo) {
            logger.warn('TheSportsDB athlete matched but has no image', {
                league: league.shortName,
                athlete: hydratedBestMatch.strPlayer,
                id: hydratedBestMatch.idPlayer
            });
        }

        const sport = hydratedBestMatch.strSport || config.sport || 'default';
        const { primaryColor, alternateColor } = await this.resolveColors(config, hydratedBestMatch.idPlayer, primaryLogo, alternateLogo, sport);

        let athleteData = {
            id: hydratedBestMatch.idPlayer,
            slug: athleteSlug,
            city: parsedName.first,
            name: parsedName.last || hydratedBestMatch.strPlayer,
            fullName: hydratedBestMatch.strPlayer,
            abbreviation: `${parsedName.first?.[0] || ''}${parsedName.last?.[0] || ''}`,
            conference: null,
            division: null,
            logo: primaryLogo,
            logoAlt: alternateLogo,
            color: primaryColor,
            alternateColor: alternateColor,
            isAthlete: true
        };

        athleteData = applyTeamOverrides(athleteData, league.shortName.toLowerCase(), athleteSlug);
        return athleteData;
    }

    parseName(fullName) {
        const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
            return { first: '', last: '' };
        }
        if (parts.length === 1) {
            return { first: parts[0], last: parts[0] };
        }
        return {
            first: parts[0],
            last: parts.slice(1).join(' ')
        };
    }

    getPortraitPriority(config = {}) {
        const configuredPriority = Array.isArray(config.portraitPriority) ? config.portraitPriority : [];
        const configuredType = config.portraitType ? [config.portraitType] : [];

        const normalized = [...configuredPriority, ...configuredType]
            .map(value => String(value || '').trim())
            .map(value => this.normalizePortraitField(value))
            .filter(Boolean);

        const unique = [];
        for (const fieldName of normalized) {
            if (!unique.includes(fieldName)) {
                unique.push(fieldName);
            }
        }

        for (const fallbackField of this.defaultPortraitPriority) {
            if (!unique.includes(fallbackField)) {
                unique.push(fallbackField);
            }
        }

        return unique;
    }

    normalizePortraitField(field) {
        const lower = String(field || '').toLowerCase();

        if (this.portraitFieldMap[lower]) {
            return this.portraitFieldMap[lower];
        }

        // Accept direct TheSportsDB property names in any casing, e.g. strCartoon.
        const directFieldMap = {
            strthumb: 'strThumb',
            strposter: 'strPoster',
            strcutout: 'strCutout',
            strcartoon: 'strCartoon',
            strrender: 'strRender',
            strbanner: 'strBanner',
            strfanart1: 'strFanart1',
            strfanart2: 'strFanart2',
            strfanart3: 'strFanart3',
            strfanart4: 'strFanart4'
        };

        return directFieldMap[lower] || null;
    }

    pickPortrait(athlete, fields = []) {
        for (const fieldName of fields) {
            const value = athlete[fieldName];
            if (value && typeof value === 'string' && value.trim()) {
                return value;
            }
        }
        return null;
    }

    async resolveColors(config, athleteId, primaryLogo, alternateLogo, sport) {
        const fallbackPrimary = this.generateRandomColor(sport);
        const fallbackAlternate = this.generateRandomColor(sport);
        const shouldExtractColors = config.extractColors === true || config.extractColors === 'true';

        if (!shouldExtractColors) {
            return {
                primaryColor: fallbackPrimary,
                alternateColor: fallbackAlternate
            };
        }

        const logoForColorExtraction = primaryLogo || alternateLogo;
        if (!logoForColorExtraction) {
            return {
                primaryColor: fallbackPrimary,
                alternateColor: fallbackAlternate
            };
        }

        const colorCacheKey = `colors_${athleteId}_${this.normalizeText(logoForColorExtraction)}`;
        const cachedColors = fsCache.getJSON('thesportsdb-athlete-colors', colorCacheKey, this.CACHE_DURATION);
        if (cachedColors) {
            return {
                primaryColor: cachedColors.primary || fallbackPrimary,
                alternateColor: cachedColors.alternate || fallbackAlternate
            };
        }

        try {
            const extractedColors = await extractDominantColors(logoForColorExtraction, 2);
            const primaryColor = extractedColors?.[0] || fallbackPrimary;
            const alternateColor = extractedColors?.[1] || fallbackAlternate;

            fsCache.setJSON('thesportsdb-athlete-colors', colorCacheKey, {
                primary: primaryColor,
                alternate: alternateColor
            });

            return {
                primaryColor,
                alternateColor
            };
        } catch (error) {
            logger.warn('TheSportsDB athlete color extraction failed, using palette fallback', {
                athleteId,
                error: error.message
            });

            return {
                primaryColor: fallbackPrimary,
                alternateColor: fallbackAlternate
            };
        }
    }

    filterCandidatesByLeague(athletes, config) {
        const normalizedLeagueId = String(config.leagueId || '').trim();
        const normalizedLeagueName = this.normalizeLeagueToken(config.leagueName);
        const normalizedSport = this.normalizeText(config.sport);
        const hasLeagueConstraints = Boolean(normalizedLeagueId || normalizedLeagueName || normalizedSport);

        const filtered = athletes.filter(athlete => {
            let matchedAnyConstraint = false;

            if (normalizedLeagueId) {
                const athleteLeagueId = String(athlete.idLeague || '').trim();
                if (athleteLeagueId) {
                    if (athleteLeagueId !== normalizedLeagueId) {
                        return false;
                    }
                    matchedAnyConstraint = true;
                }
            }

            if (normalizedLeagueName) {
                const athleteLeagueName = this.normalizeLeagueToken(athlete.strLeague);
                if (athleteLeagueName) {
                    const leagueNameMatches = athleteLeagueName.includes(normalizedLeagueName) || normalizedLeagueName.includes(athleteLeagueName);
                    if (!leagueNameMatches) {
                        return false;
                    }
                    matchedAnyConstraint = true;
                }
            }

            if (normalizedSport) {
                const athleteSport = this.normalizeText(athlete.strSport);
                if (athleteSport) {
                    if (athleteSport !== normalizedSport) {
                        return false;
                    }
                    matchedAnyConstraint = true;
                }
            }

            if (hasLeagueConstraints && !matchedAnyConstraint) {
                return false;
            }

            return true;
        });

        // If constraints exist, keep filtering strict to avoid out-of-league matches.
        if (hasLeagueConstraints) {
            return filtered;
        }

        return filtered.length > 0 ? filtered : athletes;
    }

    async getLeagueLogoUrl(league, darkLogoPreferred = true) {
        const config = this.getLeagueConfig(league);
        if (!config) {
            throw new Error(`League ${league.shortName} is missing TheSportsDB athlete configuration`);
        }

        if (darkLogoPreferred && league.logoUrlDark) {
            return league.logoUrlDark;
        }
        if (league.logoUrl) {
            return league.logoUrl;
        }

        if (!config.leagueId) {
            return null;
        }

        const cacheKey = `league_${config.leagueId}`;
        const cached = fsCache.getJSON('thesportsdb-athlete', cacheKey, this.CACHE_DURATION);
        if (cached) {
            return cached.strBadge || cached.strLogo || cached.strPoster || null;
        }

        const url = `https://www.thesportsdb.com/api/v1/json/${this.API_KEY}/lookupleague.php?id=${config.leagueId}`;

        try {
            const response = await axios.get(url, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const leagueData = response.data?.leagues?.[0] || null;
            if (!leagueData) {
                return null;
            }

            fsCache.setJSON('thesportsdb-athlete', cacheKey, leagueData);
            return leagueData.strBadge || leagueData.strLogo || leagueData.strPoster || null;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching TheSportsDB athlete league logo for ${league.shortName}`);
        }
    }

    async fetchAthleteCandidates(athleteIdentifier) {
        const identifier = String(athleteIdentifier || '').trim();
        if (!identifier) {
            return [];
        }

        const cacheKey = this.normalizeText(identifier);
        const cached = fsCache.getJSON('thesportsdb-athlete', cacheKey, this.CACHE_DURATION);
        if (cached) {
            return cached;
        }

        const numericId = this.extractNumericId(identifier);
        let athletes = [];

        if (numericId) {
            athletes = await this.fetchByAthleteId(numericId);
        }

        if (athletes.length === 0) {
            const nameCandidates = [identifier, identifier.replace(/[-_]+/g, ' ')]
                .map(value => value.trim())
                .filter(Boolean)
                .filter((value, index, arr) => arr.indexOf(value) === index);

            const merged = [];
            const seenIds = new Set();

            for (const candidate of nameCandidates) {
                const candidateResults = await this.fetchByAthleteName(candidate);
                for (const athlete of candidateResults) {
                    const key = athlete.idPlayer || athlete.strPlayer;
                    if (!key || seenIds.has(key)) {
                        continue;
                    }
                    seenIds.add(key);
                    merged.push(athlete);
                }
            }

            athletes = merged;
        }

        fsCache.setJSON('thesportsdb-athlete', cacheKey, athletes);
        return athletes;
    }

    extractNumericId(identifier) {
        const directIdMatch = String(identifier).match(/^\d+$/);
        if (directIdMatch) {
            return directIdMatch[0];
        }

        const prefixedIdMatch = String(identifier).match(/^(\d+)-/);
        if (prefixedIdMatch) {
            return prefixedIdMatch[1];
        }

        return null;
    }

    async fetchByAthleteId(athleteId) {
        const url = `https://www.thesportsdb.com/api/v1/json/${this.API_KEY}/lookupplayer.php?id=${athleteId}`;

        try {
            const response = await axios.get(url, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return response.data?.players || [];
        } catch (error) {
            logger.warn('TheSportsDB athlete lookup by id failed', {
                athleteId,
                error: error.message
            });
            return [];
        }
    }

    async fetchByAthleteName(name) {
        const encodedName = encodeURIComponent(name);
        const url = `https://www.thesportsdb.com/api/v1/json/${this.API_KEY}/searchplayers.php?p=${encodedName}`;

        try {
            const response = await axios.get(url, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return response.data?.player || [];
        } catch (error) {
            throw this.handleHttpError(error, `Searching TheSportsDB athletes for '${name}'`);
        }
    }

    async hydrateAthleteDetails(athlete) {
        const athleteId = String(athlete?.idPlayer || '').trim();
        if (!athleteId) {
            return athlete;
        }

        const cacheKey = `player_full_${athleteId}`;
        const cached = fsCache.getJSON('thesportsdb-athlete', cacheKey, this.CACHE_DURATION);
        if (cached) {
            return { ...athlete, ...cached };
        }

        try {
            const fullProfiles = await this.fetchByAthleteId(athleteId);
            const fullProfile = fullProfiles[0];
            if (!fullProfile) {
                return athlete;
            }

            fsCache.setJSON('thesportsdb-athlete', cacheKey, fullProfile);
            return { ...athlete, ...fullProfile };
        } catch (error) {
            logger.warn('TheSportsDB athlete full-profile hydration failed', {
                athleteId,
                error: error.message
            });
            return athlete;
        }
    }

    clearCache() {
        fsCache.clearSubdir('thesportsdb-athlete');
        fsCache.clearSubdir('thesportsdb-athlete-colors');
    }
}

// Export singleton instance (ProviderManager and express.js share the same instance)
const sharedInstance = new TheSportsDBAthleteProvider();
module.exports = sharedInstance;
module.exports.TheSportsDBAthleteProvider = TheSportsDBAthleteProvider;

// ------------------------------------------------------------------------------
