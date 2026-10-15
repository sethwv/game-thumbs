const assert = require('assert');
const axios = require('axios');
const { ESPNProvider } = require('../src/providers/ESPNProvider');

async function run() {
    const originalGet = axios.get;
    axios.get = async url => {
        if (url.includes('/cricket/scorepanel')) {
            return {
                data: {
                    scores: [{
                        leagues: [
                            { id: 24289, slug: '24289' },
                            { id: 'series-id', slug: 'series-slug-test-v2' },
                            { id: 99 }
                        ],
                        events: [{
                            competitions: [{
                                competitors: [
                                    { team: { id: '1', displayName: 'Bangladesh Women', abbreviation: 'BAN', logo: 'https://example.com/ban.png', color: '111111', alternateColor: '222222' } },
                                    { team: { id: '2', displayName: 'New Zealand Women', abbreviation: 'NZL', logo: 'https://example.com/nzl.png', color: '333333', alternateColor: '444444' } }
                                ]
                            }]
                        }]
                    }]
                }
            };
        }

        return {
            data: {
                items: [
                    { $ref: 'http://sports.core.api.espn.com/v2/sports/football?lang=en&region=us' }
                ]
            }
        };
    };

    try {
        const provider = new ESPNProvider();
        const sports = await provider.fetchAllSports();
        const cricketLeagues = await provider.fetchCricketLeagues();
        const cricketTeams = await provider.fetchCricketTeams('24289');
        const fallbackCricketTeams = await provider.fetchTeamData({
            shortName: 'series-slug-test-v2',
            _isESPNFallback: true,
            providers: [{ espn: { espnSport: 'cricket', espnSlug: 'series-slug-test-v2' } }]
        });

        assert.deepStrictEqual(sports.sort(), ['cricket', 'football']);
        assert.deepStrictEqual(
            Array.from(cricketLeagues).sort(),
            ['24289', '99', 'series-slug-test-v2']
        );
        assert.deepStrictEqual(
            cricketTeams.map(entry => entry.team.displayName),
            ['Bangladesh Women', 'New Zealand Women']
        );
        assert.deepStrictEqual(fallbackCricketTeams, cricketTeams);
        const resolvedTeam = await provider.resolveTeam({
            shortName: 'series-slug-test-v2',
            _isESPNFallback: true,
            providers: [{ espn: { espnSport: 'cricket', espnSlug: 'series-slug-test-v2' } }]
        }, 'nzl');
        assert.strictEqual(resolvedTeam.abbreviation, 'NZL');
        assert.strictEqual(resolvedTeam.logo, 'https://example.com/nzl.png');
        console.log('ESPN provider tests passed');
    } finally {
        axios.get = originalGet;
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
