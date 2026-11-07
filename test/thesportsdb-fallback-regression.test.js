const assert = require('assert');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const fsCache = require('../src/helpers/fsCache');
const { TheSportsDBProvider } = require('../src/providers/TheSportsDBProvider');
const { TheSportsDBAthleteProvider } = require('../src/providers/TheSportsDBAthleteProvider');
const { downloadImageWithSvgSupport } = require('../src/helpers/image/imageIO');
const { resolveTeamsWithFallback } = require('../src/helpers/image/logoResolution');

async function main() {
    const originalKey = process.env.THESPORTSDB_API_KEY;
    const originalGet = axios.get;
    const originalCacheGet = fsCache.getJSON;
    const originalCacheSet = fsCache.setJSON;
    try {
        delete process.env.THESPORTSDB_API_KEY;
        const teamsProvider = new TheSportsDBProvider();
        const athleteProvider = new TheSportsDBAthleteProvider();
        assert.strictEqual(teamsProvider.API_KEY, '123');
        assert.strictEqual(athleteProvider.API_KEY, '123');
        process.env.THESPORTSDB_API_KEY = 'custom-key';
        assert.strictEqual(new TheSportsDBProvider().API_KEY, 'custom-key');
        assert.strictEqual(new TheSportsDBAthleteProvider().API_KEY, 'custom-key');

        fsCache.getJSON = () => null;
        fsCache.setJSON = () => {};
        const urls = [];
        axios.get = async url => {
            urls.push(url);
            if (url.includes('search_all_teams')) return { data: { teams: [{ strTeam: 'Winnipeg' }] } };
            if (url.includes('searchplayers')) return { data: { player: [{ strPlayer: 'Boxer' }] } };
            return { data: { leagues: [{ strBadge: 'league.png' }] } };
        };
        const league = { shortName: 'cfl', providers: [{ theSportsDB: { leagueId: '4405', leagueName: 'CFL' } }] };
        assert.strictEqual((await teamsProvider.fetchTeamData(league))[0].strTeam, 'Winnipeg');
        assert.strictEqual((await teamsProvider.fetchLeagueData(league)).strBadge, 'league.png');
        assert.strictEqual((await athleteProvider.fetchCandidates({ shortName: 'boxing' }, 'Boxer'))[0].strPlayer, 'Boxer');
        assert.strictEqual((await athleteProvider.fetchLeagueData({ shortName: 'boxing' }, '4445')).strBadge, 'league.png');
        assert(urls.every(url => url.includes('/json/123/')));

        await assert.rejects(downloadImageWithSvgSupport(null), /Invalid URL or path: null/);
        const canvas = createCanvas(20, 20);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(2, 2, 16, 16);
        const png = canvas.toBuffer('image/png');
        const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
        assert.deepStrictEqual(await downloadImageWithSvgSupport(dataUrl), png);

        const missing = { resolveTeam: async () => { throw new Error('provider unavailable'); } };
        const resolved = { name: 'Montreal', logo: dataUrl, color: '#ff0000' };
        const partial = { resolveTeam: async (_league, name) => {
            if (name === 'Winnipeg') throw new Error('provider unavailable');
            return resolved;
        } };
        for (const logo of [null, 'data:image/png;base64,YmFk']) {
            const result = await resolveTeamsWithFallback(missing, league, 'Winnipeg', 'Montreal', true, logo);
            assert.strictEqual(result.team1.name, 'Winnipeg');
            assert.strictEqual(result.team2.name, 'Montreal');
            assert(result.team1.isFallback && result.team2.isFallback);
            assert.notStrictEqual(result.team1.logo, result.team2.logo);
            await loadImage(Buffer.from(result.team1.logo.split(',')[1], 'base64'));
            await loadImage(Buffer.from(result.team2.logo.split(',')[1], 'base64'));
        }
        const shared = await resolveTeamsWithFallback(missing, league, 'Winnipeg', 'Montreal', true, dataUrl);
        assert.strictEqual(shared.team1.logo, shared.team2.logo);
        const one = await resolveTeamsWithFallback(partial, league, 'Winnipeg', 'Montreal', true, null);
        assert(one.team1.isFallback);
        assert.strictEqual(one.team2, resolved);
        await assert.rejects(resolveTeamsWithFallback(missing, league, 'Winnipeg', 'Montreal', false, null), /provider unavailable/);

        const providerManager = require('../src/helpers/ProviderManager');
        const originalResolve = providerManager.resolveTeam;
        const originalLogo = providerManager.getLeagueLogoUrl;
        try {
            providerManager.resolveTeam = missing.resolveTeam;
            providerManager.getLeagueLogoUrl = async () => null;
            const route = require('../src/routes/logo');
            const url = '/cfl/WinnipegBlueBombers/MontrealAlouettes/logo?style=1&logo=true&fallback=true';
            const req = { params: { league: 'cfl', team1: 'WinnipegBlueBombers', team2: 'MontrealAlouettes' }, query: { style: '1', logo: 'true', fallback: 'true' }, url, originalUrl: url, ip: '127.0.0.1' };
            const res = { headers: {}, set(name, value) { this.headers[name] = value; return this; }, send(body) { this.body = body; this.headersSent = true; return this; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
            await route.handler(req, res);
            assert.strictEqual(res.statusCode || 200, 200, JSON.stringify(res.body));
            assert.strictEqual(res.headers['Content-Type'], 'image/png');
            assert.deepStrictEqual(res.body.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
        } finally {
            providerManager.resolveTeam = originalResolve;
            providerManager.getLeagueLogoUrl = originalLogo;
        }
        console.log('TheSportsDB and fallback regression tests passed');
    } finally {
        if (originalKey === undefined) delete process.env.THESPORTSDB_API_KEY;
        else process.env.THESPORTSDB_API_KEY = originalKey;
        axios.get = originalGet;
        fsCache.getJSON = originalCacheGet;
        fsCache.setJSON = originalCacheSet;
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
