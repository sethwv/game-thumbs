const assert = require('assert');
const providerManager = require('../src/helpers/ProviderManager');
const colorUtils = require('../src/helpers/colorUtils');

const league = {
    shortName: 'epl',
    name: 'English Premier League',
    logoUrl: 'https://example.com/epl-light.png',
    logoUrlDark: 'https://example.com/epl-dark.png',
    providers: [{ espn: { espnSlug: 'eng.1' } }]
};

assert.strictEqual(providerManager.isLeagueTeamIdentifier(league, 'epl'), true);
assert.strictEqual(providerManager.isLeagueTeamIdentifier(league, 'ENG.1'), true);
assert.strictEqual(providerManager.isLeagueTeamIdentifier(league, 'English Premier League'), true);
assert.strictEqual(providerManager.isLeagueTeamIdentifier(league, 'english-premier-league'), true);
assert.strictEqual(providerManager.isLeagueTeamIdentifier(league, 'eng'), false);
assert.strictEqual(providerManager.isLeagueTeamIdentifier(league, 'premier league'), false);

async function testLeagueTeamResolution() {
    const originalExtractDominantColors = colorUtils.extractDominantColors;
    colorUtils.extractDominantColors = async () => ['#3d195b', '#00ff87'];

    try {
        const team = await providerManager.resolveTeam(league, 'eng.1');
        assert.deepStrictEqual(team, {
            id: 'league:epl',
            slug: 'epl',
            name: 'English Premier League',
            fullName: 'English Premier League',
            abbreviation: 'EPL',
            logo: 'https://example.com/epl-light.png',
            logoAlt: 'https://example.com/epl-dark.png',
            color: '#3d195b',
            alternateColor: '#00ff87',
            providerId: 'league'
        });
    } finally {
        colorUtils.extractDominantColors = originalExtractDominantColors;
    }
}

testLeagueTeamResolution()
    .then(() => console.log('League team tests passed'))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
