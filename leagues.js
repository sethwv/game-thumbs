// ------------------------------------------------------------------------------
// leagues.js
// ------------------------------------------------------------------------------

function findLeague(identifier) {
    if (!identifier) return null;
    
    const searchTerm = (identifier?.shortName ?? identifier).toLowerCase();
    
    for (const key in leagues) {
        const league = leagues[key];
        
        // Match by shortName (primary identifier)
        if (league.shortName?.toLowerCase() === searchTerm) {
            return league;
        }
        
        // Match by full name
        if (league.name?.toLowerCase() === searchTerm) {
            return league;
        }
        
        // Match by league key
        if (key.toLowerCase() === searchTerm) {
            return league;
        }
        
        // Match by common aliases (provider-agnostic)
        if (league.aliases && league.aliases.some(alias => alias.toLowerCase() === searchTerm)) {
            return league;
        }
    }
    
    return null;
}

// ------------------------------------------------------------------------------

const leagues = {
    nba: {
        name: 'National Basketball Association',
        shortName: 'NBA',
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'nba',
            espnSport: 'basketball',
        },
    },
    wnba: {
        name: 'Women\'s National Basketball Association',
        shortName: 'WNBA',
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'wnba',
            espnSport: 'basketball',
        },
    },


    nfl: {
        name: 'National Football League',
        shortName: 'NFL',
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'nfl',
            espnSport: 'football',
        },
    },
    ufl: {
        name: 'United Football League',
        shortName: 'UFL',
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'ufl',
            espnSport: 'football',
        },
    },


    mlb: {
        name: 'Major League Baseball',
        shortName: 'MLB',
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'mlb',
            espnSport: 'baseball',
        },
    },


    nhl: {
        name: 'National Hockey League',
        shortName: 'NHL',
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'nhl',
            espnSport: 'hockey',
        },
    },


    epl: {
        name: 'English Premier League',
        shortName: 'EPL',
        aliases: ['premier league', 'premier', 'england', 'eng.1'],
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'eng.1',
            espnSport: 'soccer',
        },
    },
    mls: {
        name: 'Major League Soccer',
        shortName: 'MLS',
        aliases: ['major league soccer', 'usa.1'],
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'usa.1',
            espnSport: 'soccer',
        },
    },
    uefa: {
        name: 'UEFA Champions League',
        shortName: 'UEFA',
        aliases: ['champions league', 'ucl', 'uefa.champions'],
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'uefa.champions',
            espnSport: 'soccer',
        },
    },


    ncaaf: {
        name: 'NCAA Football',
        shortName: 'NCAAF',
        aliases: ['college football', 'college-football', 'ncaa football'],
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'college-football',
            espnSport: 'football',
        },
    },


    ncaah: {
        name: 'NCAA Ice Hockey',
        shortName: 'NCAAH',
        aliases: ['college ice hockey', 'mens college ice hockey'],
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'mens-college-hockey',
            espnSport: 'hockey',
        },
    },
    ncaawh: {
        name: 'NCAA Women\'s Ice Hockey',
        shortName: 'NCAAWH',
        aliases: ['women\'s college ice hockey', 'womens college ice hockey'],
        providerId: 'espn',
        fallbackLeague: 'ncaah', // Fall back to men's hockey if team not found
        espnConfig: {
            espnSlug: 'womens-college-hockey',
            espnSport: 'hockey',
        },
    },


    ncaam: {
        name: 'NCAA Men\'s Basketball',
        shortName: 'NCAAM',
        aliases: ['college basketball', 'mens college basketball', 'mens-college-basketball', 'march madness'],
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'mens-college-basketball',
            espnSport: 'basketball',
        },
    },
    ncaaw: {
        name: 'NCAA Women\'s Basketball',
        shortName: 'NCAAW',
        aliases: ['womens college basketball', 'womens-college-basketball', 'women\'s basketball'],
        providerId: 'espn',
        fallbackLeague: 'ncaam', // Fall back to men's basketball if team not found
        espnConfig: {
            espnSlug: 'womens-college-basketball',
            espnSport: 'basketball',
        },
    },

    ncaas: {
        name: 'NCAA Soccer',
        shortName: 'NCAAS',
        aliases: ['college soccer', 'mens-college-soccer', 'womens-college-soccer'],
        providerId: 'espn',
        espnConfig: {
            espnSlug: 'usa.ncaa.m.1',
            espnSport: 'soccer',
        },
    },
    ncaaws: {
        name: 'NCAA Women\'s Soccer',
        shortName: 'NCAAWS',
        aliases: ['womens college soccer', 'women\'s college soccer'],
        providerId: 'espn',
        fallbackLeague: 'ncaas', // Fall back to men's soccer if team not found
        espnConfig: {
            espnSlug: 'usa.ncaa.w.1',
            espnSport: 'soccer',
        },
    },
};

// ------------------------------------------------------------------------------

module.exports = {
    leagues,
    findLeague,
};

// ------------------------------------------------------------------------------