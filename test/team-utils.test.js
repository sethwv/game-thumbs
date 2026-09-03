const assert = require('assert');
const { getTeamMatchScore } = require('../src/helpers/teamUtils');

const carlton = {
    fullName: 'Carlton',
    shortDisplayName: 'Carlton',
    name: 'Blues',
    city: 'Carlton',
    abbreviation: 'CAR'
};

const geelong = {
    fullName: 'Geelong Cats',
    shortDisplayName: 'Geelong Cats',
    name: 'Cats',
    city: 'Geelong',
    abbreviation: 'GEE'
};

assert.ok(getTeamMatchScore('carlton-football-club', carlton) > 0);
assert.ok(getTeamMatchScore('geelong-football-club', geelong) > 0);

console.log('Team utility tests passed');
