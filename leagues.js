// ------------------------------------------------------------------------------
// leagues.js
// ------------------------------------------------------------------------------

function findLeague(identifier) {
    identifier = identifier?.shortName?.toLowerCase() ?? identifier?.toLowerCase();
    for (const key in leagues) {
        const league = leagues[key];
        if (league.shortName.toLowerCase() === identifier ||
            league.espnSlug.toLowerCase() === identifier ||
            league.name.toLowerCase() === identifier) {
            return league;
        }
    }
    return null;
}

function getEndpoint(league) {
    if (!league.usesESPN) {
        return null;
    }
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.espnSport}/${league.espnSlug}/teams?limit=500`;
    return url;
}

// ------------------------------------------------------------------------------

// https://sports.core.api.espn.com/v2/sports/?limit=999
// https://sports.core.api.espn.com/v2/sports/baseball/leagues?limit=999

const leagues = {
    nba: {
        name: 'National Basketball Association',
        shortName: 'NBA',
        usesESPN: true,
        espnSlug: 'nba',
        espnSport: 'basketball',
    },
    wnba: {
        name: 'Women\'s National Basketball Association',
        shortName: 'WNBA',
        usesESPN: true,
        espnSlug: 'wnba',
        espnSport: 'basketball',
    },


    nfl: {
        name: 'National Football League',
        shortName: 'NFL',
        usesESPN: true,
        espnSlug: 'nfl',
        espnSport: 'football',
    },
    // Does not have images on ESPN
    // cfl: {
    //     name: 'Canadian Football League',
    //     shortName: 'CFL',
    //     usesESPN: true,
    //     espnSlug: 'cfl',
    //     espnSport: 'football',
    // },
    ufl: {
        name: 'United Football League',
        shortName: 'UFL',
        usesESPN: true,
        espnSlug: 'ufl',
        espnSport: 'football',
    },


    mlb: {
        name: 'Major League Baseball',
        shortName: 'MLB',
        usesESPN: true,
        espnSlug: 'mlb',
        espnSport: 'baseball',
    },


    nhl: {
        name: 'National Hockey League',
        shortName: 'NHL',
        usesESPN: true,
        espnSlug: 'nhl',
        espnSport: 'hockey',
    },


    epl: {
        name: 'English Premier League',
        shortName: 'EPL',
        usesESPN: true,
        espnSlug: 'eng.1',
        espnSport: 'soccer',
    },
    mls: {
        name: 'Major League Soccer',
        shortName: 'MLS',
        usesESPN: true,
        espnSlug: 'usa.1',
        espnSport: 'soccer',
    },
    uefa: {
        name: 'UEFA Champions League',
        shortName: 'UEFA',
        usesESPN: true,
        espnSlug: 'uefa.champions',
        espnSport: 'soccer',
    },


    ncaaf: {
        name: 'NCAA Football',
        shortName: 'NCAAF',
        usesESPN: true,
        espnSlug: 'college-football',
        espnSport: 'football',
    },


    ncaam: {
        name: 'NCAA Men\'s Basketball',
        shortName: 'NCAAM',
        usesESPN: true,
        espnSlug: 'mens-college-basketball',
        espnSport: 'basketball',
    },
    naacw: {
        name: 'NCAA Women\'s Basketball',
        shortName: 'NCAAW',
        usesESPN: true,
        espnSlug: 'womens-college-basketball',
        espnSport: 'basketball',
    }
}

// ------------------------------------------------------------------------------

module.exports = {
    leagues,
    findLeague,
    getEndpoint
};

// ------------------------------------------------------------------------------