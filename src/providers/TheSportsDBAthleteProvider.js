// ------------------------------------------------------------------------------
// TheSportsDBAthleteProvider.js
// TheSportsDB athlete-based provider for individual/combat sports (e.g. Boxing).
// Treats individual fighters/athletes as "teams" for thumbnail generation.
//
// ESPN does not carry boxing, but TheSportsDB does (league id 4445, sport
// "Fighting"). The free API key ('3') does NOT expose a roster endpoint
// (lookup_all_players returns null), so unlike ESPNAthleteProvider we cannot
// prefetch and match locally. Instead we resolve per-request via
// searchplayers.php?p=<name>, guarded by sport to reject wrong-sport matches.
//
// Configuration (per league, under providers[].thesportsdbathlete):
// - sport:      Required. strSport guard (e.g. "Fighting").
// - teamFilter: Optional. Substring that strTeam must contain (e.g. "Boxing"),
//               used to exclude other "Fighting" sports like MMA.
// - leagueId:   Optional. TheSportsDB league id for the league logo (e.g. "4445").
// - leagueName: Optional. Human-readable league name (informational).
//
// Caching: data and link responses are API-keyed and rarely change, so they are
// cached aggressively (~30 days). Image assets (strCutout/strThumb/badges) are
// served from TheSportsDB's CDN and are NOT gated by the API key, so they are
// fetched through the normal thumbnail asset pipeline, not cached here.
// ------------------------------------------------------------------------------

const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const { getTeamMatchScoreWithOverrides, generateSlug, applyTeamOverrides } = require('../helpers/teamUtils');
const logger = require('../helpers/logger');
const fsCache = require('../helpers/fsCache');
const { TeamNotFoundError } = require('../helpers/errors');
const { REQUEST_TIMEOUT, bullpenUrl, getBullpenHeaders } = require('../helpers/requestConfig');

const CACHE_SUBDIR = 'thesportsdb-athletes';

class TheSportsDBAthleteProvider extends BaseProvider {
    constructor() {
        super();
        // Aggressive long-term caching of data/links (~30 days). Fighter identity,
        // headshot URLs, and league badges change rarely and the free key is
        // rate-sensitive.
        this.CACHE_DURATION = 30 * 24 * 60 * 60 * 1000;
        // Negative ("not found") results are cached only briefly so a newly added
        // boxer is not blocked for a month.
        this.NEGATIVE_CACHE_DURATION = 24 * 60 * 60 * 1000;
        this.REQUEST_TIMEOUT = REQUEST_TIMEOUT;

        // Combat-sports palette (dark blues), mirrors ESPNAthleteProvider.
        // Extracting colors from a fighter photo yields skin tones, so we use a
        // fixed palette instead.
        this.colorPalette = [
            '#1A2A3A', '#1F3545', '#0F2535', '#1A3040', '#0F1F30',
            '#1F3040', '#1A2535', '#0F2030', '#1A2F3F', '#152535',
            '#1A3545', '#0F2540', '#152A3A', '#1A2F40', '#1F3545',
            '#0F1A2A', '#1A2A40', '#152F45', '#1A3040', '#0F2535'
        ];
    }

    getProviderId() {
        return 'thesportsdbathlete';
    }

    getConfigKey() {
        return 'thesportsdbathlete';
    }

    generateRandomColor() {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }

    async resolveTeam(league, athleteIdentifier) {
        if (!league || !athleteIdentifier) {
            throw new Error('Both league and athlete identifier are required');
        }

        const config = this.getLeagueConfig(league);
        if (!config) {
            throw new Error(`League ${league.shortName} is missing TheSportsDB athlete configuration`);
        }

        try {
            const candidates = await this.fetchCandidates(league, athleteIdentifier);

            // Sport guard: free-tier search has no sport filter and returns a
            // single best match across all sports, so reject anything that is not
            // the configured sport (and, if set, the configured team substring).
            const guarded = candidates.filter(p => this.matchesSport(p, config));

            let bestMatch = null;
            let bestScore = 0;
            for (const player of guarded) {
                const { firstName, lastName } = this.splitName(player.strPlayer);
                const athleteObj = {
                    fullName: player.strPlayer,
                    shortDisplayName: lastName,
                    name: lastName,
                    city: firstName,
                    abbreviation: (firstName[0] || '') + (lastName[0] || '')
                };

                const score = getTeamMatchScoreWithOverrides(
                    athleteIdentifier,
                    athleteObj,
                    generateSlug(player.strPlayer),
                    league.shortName.toLowerCase()
                );

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = player;
                }
            }

            if (!bestMatch || bestScore === 0) {
                // No enumerable roster on the free tier, so no available list.
                throw new TeamNotFoundError(athleteIdentifier, league, []);
            }

            const { firstName, lastName } = this.splitName(bestMatch.strPlayer);
            const slug = generateSlug(bestMatch.strPlayer);

            // Prefer the transparent cutout for thumbnails, fall back to render/thumb.
            const logo = bestMatch.strCutout || bestMatch.strRender || bestMatch.strThumb || null;
            const logoAlt = bestMatch.strThumb || bestMatch.strCutout || null;

            let athleteData = {
                id: bestMatch.idPlayer,
                slug,
                city: firstName,
                name: lastName,
                fullName: bestMatch.strPlayer,
                abbreviation: (firstName[0] || '') + (lastName[0] || ''),
                conference: null,
                division: null,
                logo,
                logoAlt,
                color: this.generateRandomColor(),
                alternateColor: this.generateRandomColor()
            };

            athleteData = applyTeamOverrides(athleteData, league.shortName.toLowerCase(), slug);
            return athleteData;
        } catch (error) {
            if (error instanceof TeamNotFoundError) {
                throw error;
            }
            throw new Error(`Failed to resolve athlete: ${error.message}`);
        }
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

        try {
            const leagueData = await this.fetchLeagueData(league, config.leagueId);
            return leagueData?.strBadge || leagueData?.strLogo || leagueData?.strPoster || null;
        } catch (error) {
            logger.warn('Failed to get league logo', { league: league.shortName, error: error.message });
            return null;
        }
    }

    clearCache() {
        fsCache.clearSubdir(CACHE_SUBDIR);
    }

    // ------------------------------------------------------------------------------
    // Private helper methods
    // ------------------------------------------------------------------------------

    // Returns true if a TheSportsDB player matches the configured sport guard.
    matchesSport(player, config) {
        if (!player) return false;
        if (config.sport && (player.strSport || '').toLowerCase() !== config.sport.toLowerCase()) {
            return false;
        }
        if (config.teamFilter) {
            const team = (player.strTeam || '').toLowerCase();
            if (!team.includes(config.teamFilter.toLowerCase())) {
                return false;
            }
        }
        return true;
    }

    // Split a display name into first/last for matching and initials.
    splitName(displayName) {
        const parts = (displayName || '').trim().split(/\s+/);
        if (parts.length === 0) return { firstName: '', lastName: '' };
        if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
        return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }

    // Fetch candidate players for an identifier, with long-term caching of hits
    // and short-term caching of "not found" results.
    async fetchCandidates(league, athleteIdentifier) {
        const cacheKey = `${league.shortName}_${generateSlug(athleteIdentifier)}`;

        // Hit cache (long TTL).
        const cached = fsCache.getJSON(CACHE_SUBDIR, cacheKey, this.CACHE_DURATION);
        if (cached && Array.isArray(cached.players) && cached.players.length > 0) {
            return cached.players;
        }
        // Negative cache (short TTL).
        if (cached && cached.notFound) {
            const negative = fsCache.getJSON(CACHE_SUBDIR, cacheKey, this.NEGATIVE_CACHE_DURATION);
            if (negative && negative.notFound) {
                return [];
            }
        }

        const url = bullpenUrl('thesportsdb', `/api/v1/json/x/searchplayers.php?p=${encodeURIComponent(athleteIdentifier)}`);
        let players = [];
        try {
            const response = await axios.get(url, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0', ...getBullpenHeaders(url) }
            });
            players = response.data?.player || [];
        } catch (error) {
            throw this.handleHttpError(error, `Searching players for ${league.shortName}`);
        }

        if (players.length > 0) {
            fsCache.setJSON(CACHE_SUBDIR, cacheKey, { players });
        } else {
            fsCache.setJSON(CACHE_SUBDIR, cacheKey, { notFound: true });
        }
        return players;
    }

    async fetchLeagueData(league, leagueId) {
        const cacheKey = `${league.shortName}_league`;
        const cached = fsCache.getJSON(CACHE_SUBDIR, cacheKey, this.CACHE_DURATION);
        if (cached) {
            return cached;
        }

        const url = bullpenUrl('thesportsdb', `/api/v1/json/x/lookupleague.php?id=${leagueId}`);
        try {
            const response = await axios.get(url, {
                timeout: this.REQUEST_TIMEOUT,
                headers: { 'User-Agent': 'Mozilla/5.0', ...getBullpenHeaders(url) }
            });
            const leagueData = response.data?.leagues?.[0];
            if (!leagueData) {
                throw new Error('League not found');
            }
            fsCache.setJSON(CACHE_SUBDIR, cacheKey, leagueData);
            return leagueData;
        } catch (error) {
            throw this.handleHttpError(error, `Fetching league data for ${league.shortName}`);
        }
    }
}

// Export singleton instance (ProviderManager and express.js share the same instance)
const sharedInstance = new TheSportsDBAthleteProvider();
module.exports = sharedInstance;
module.exports.TheSportsDBAthleteProvider = TheSportsDBAthleteProvider;

// ------------------------------------------------------------------------------
