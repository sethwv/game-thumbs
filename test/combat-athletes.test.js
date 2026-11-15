const assert = require('assert');
const axios = require('axios');
const { createCanvas } = require('canvas');
const fs = require('fs');
const { TheSportsDBAthleteProvider } = require('../src/providers/TheSportsDBAthleteProvider');
const { findLeague } = require('../src/leagues');

async function main() {
    const provider = new TheSportsDBAthleteProvider();
    const wwe = await findLeague('wwe');
    const aew = await findLeague('aew');
    const bkfc = await findLeague('bkfc');
    const boxing = await findLeague('boxing');
    for (const league of [wwe, aew, bkfc]) {
        assert(league.logoUrl);
        assert(fs.existsSync(league.logoUrl));
        assert.strictEqual(provider.getLeagueConfig(league).sport, 'Fighting');
        assert.strictEqual(await provider.getLeagueLogoUrl(league), league.logoUrl);
    }

    const player = (name, team, id = team) => ({
        idPlayer: id, strPlayer: name, strTeam: team, strSport: 'Fighting',
        strCutout: `${id}.png`, strThumb: `${id}-thumb.png`
    });
    let candidates = [];
    provider.fetchCandidates = async () => candidates;

    candidates = [player('Cody Rhodes', 'All Elite Wrestling', 'old'), player('Cody Rhodes', 'Smackdown Mens', 'new')];
    let result = await provider.resolveTeam(wwe, 'Cody Rhodes');
    assert.strictEqual(result.id, 'new');
    assert.strictEqual(result.logo, 'new.png');
    assert.strictEqual(result.logoAlt, 'new-thumb.png');
    assert.strictEqual((await provider.resolveTeam(aew, 'Cody Rhodes')).id, 'old');

    candidates = [player('Mike Perry', 'MVP MMA Welterweight')];
    assert.strictEqual((await provider.resolveTeam(bkfc, 'Mike Perry')).fullName, 'Mike Perry');
    candidates = [player('John Cena', '_Retired Wrestling')];
    assert.strictEqual((await provider.resolveTeam(wwe, 'John Cena')).fullName, 'John Cena');
    candidates = [{ ...player('John Smith', 'Tennis'), strSport: 'Tennis' }];
    await assert.rejects(provider.resolveTeam(wwe, 'John Smith'));
    candidates = [player('Cody Rhodes', 'Smackdown Mens')];
    await assert.rejects(provider.resolveTeam(wwe, 'Unrelated Name'));
    await assert.rejects(provider.resolveTeam(boxing, 'Cody Rhodes'));
    candidates = [player('Cody Rhodes', 'Boxing Heavyweight')];
    assert.strictEqual((await provider.resolveTeam(boxing, 'Cody Rhodes')).fullName, 'Cody Rhodes');

    // A weak preferred match must not beat a stronger name match.
    candidates = [player('John Cena', '_Retired Wrestling', 'exact'), player('John Cena Junior', 'WWE Mens', 'partial')];
    assert.strictEqual((await provider.resolveTeam(wwe, 'John Cena')).id, 'exact');

    const originalGet = axios.get;
    const canvas = createCanvas(10, 10);
    canvas.getContext('2d').fillRect(0, 0, 10, 10);
    const image = canvas.toBuffer('image/png');
    axios.get = async () => ({ data: image });
    try {
        provider.fetchCandidates = async (_league, name) => name === 'Cody Rhodes'
            ? [player(name, 'Smackdown Mens', 'cody')]
            : name === 'Roman Reigns' ? [player(name, 'Smackdown Mens', 'roman')] : [];
        const composite = await provider.resolveTeam(wwe, 'Cody Rhodes+Roman Reigns');
        assert(composite._isComposite);
        assert.deepStrictEqual(composite._athletes.map(a => a.id), ['cody', 'roman']);
        assert(composite.logo.startsWith('data:image/png;base64,'));
        await assert.rejects(provider.resolveTeam(wwe, 'Cody Rhodes+Missing Person'));

        const manager = require('../src/helpers/ProviderManager');
        const shared = require('../src/providers/TheSportsDBAthleteProvider');
        const originalFetch = shared.fetchCandidates;
        shared.fetchCandidates = provider.fetchCandidates;
        try {
            const url = '/wwe/Cody%20Rhodes/Roman%20Reigns/logo?logo=false';
            const req = { params: { league: 'wwe', team1: 'Cody Rhodes', team2: 'Roman Reigns' }, query: { logo: 'false' }, url, originalUrl: url, ip: '127.0.0.1' };
            const res = { headers: {}, set(name, value) { this.headers[name] = value; return this; }, send(body) { this.body = body; this.headersSent = true; return this; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
            assert.strictEqual(await manager.getLeagueLogoUrl(wwe), './assets/WWE.png');
            await require('../src/routes/logo').handler(req, res);
            assert.strictEqual(res.statusCode || 200, 200, JSON.stringify(res.body));
            assert.strictEqual(res.headers['Content-Type'], 'image/png');
        } finally {
            shared.fetchCandidates = originalFetch;
        }
    } finally {
        axios.get = originalGet;
    }
    console.log('Combat athlete tests passed');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
