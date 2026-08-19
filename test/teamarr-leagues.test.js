const assert = require('assert');
const { buildLeagues, extractLeagueRows } = require('../scripts/generate-teamarr-leagues');
const { mergeLeaguesData } = require('../src/helpers/jsonMerger');

const schema = `
INSERT OR REPLACE INTO leagues (
    league_code, provider, provider_league_id, provider_league_name,
    display_name, sport, league_alias, event_type
) VALUES
    ('uru.2', 'tsdb', '5072', 'Uruguayan Segunda División', 'AUF Segunda', 'soccer', NULL, 'team_vs_team'),
    ('quoted', 'tsdb', '1', 'Teamarr O''Brien, United', 'Quoted League', 'soccer', 'QL', 'team_vs_team'),
    ('boxing', 'tsdb', '4445', 'Boxing', 'Boxing', 'boxing', NULL, 'event_card'),
    ('imsa', 'tsdb', '4488', 'IMSA SportsCar Championship', 'IMSA', 'racing', NULL, 'event'),
    ('nfl', 'espn', 'football/nfl', NULL, 'NFL', 'football', 'NFL', 'team_vs_team');
`;

const { leagues, tsdbCount, excludedCount } = buildLeagues(schema);
assert.strictEqual(tsdbCount, 4);
assert.strictEqual(excludedCount, 2);
assert.deepStrictEqual(Object.keys(leagues), ['quoted', 'uru.2']);
assert.deepStrictEqual(leagues.quoted.providers[0].theSportsDB, {
    leagueId: '1',
    leagueName: "Teamarr O'Brien, United"
});
assert.strictEqual(leagues['uru.2'].shortName, 'URU.2');
assert.throws(() => extractLeagueRows('CREATE TABLE leagues (league_code TEXT);'), /Could not find/);

const manual = {
    ipl: {
        name: 'Indian Premier League',
        shortName: 'IPL',
        providers: [{ espn: { espnSlug: 'ipl', espnSport: 'cricket' } }]
    }
};
const generated = {
    ipl: {
        name: 'Different name',
        shortName: 'Different',
        providers: [{ theSportsDB: { leagueId: '4460', leagueName: 'Indian Premier League' } }]
    }
};
const merged = mergeLeaguesData(manual, generated, true);
assert.strictEqual(merged.ipl.name, 'Indian Premier League');
assert.deepStrictEqual(merged.ipl.providers, [
    { espn: { espnSlug: 'ipl', espnSport: 'cricket' } },
    { theSportsDB: { leagueId: '4460', leagueName: 'Indian Premier League' } }
]);
assert.deepStrictEqual(
    mergeLeaguesData(merged, generated).ipl.providers,
    merged.ipl.providers
);

console.log('Teamarr league generation tests passed');
