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
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/football.png',
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
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/icehockey.png',
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
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/icehockey.png',
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
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball.png',
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
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball.png',
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
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/soccer.png',
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
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/soccer.png',
        espnConfig: {
            espnSlug: 'usa.ncaa.w.1',
            espnSport: 'soccer',
        },
    },


    ncaabb: {
        name: 'NCAA Baseball',
        shortName: 'NCAABB',
        aliases: ['college baseball', 'mens college baseball'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/baseball.png',
        espnConfig: {
            espnSlug: 'college-baseball',
            espnSport: 'baseball',
        },
    },
    ncaasbw: {
        name: 'NCAA Softball',
        shortName: 'NCAASBW',
        aliases: ['college softball', 'womens college softball', 'women\'s college softball'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/softball.png',
        espnConfig: {
            espnSlug: 'college-softball',
            espnSport: 'baseball',
        },
    },


    ncaalax: {
        name: 'NCAA Men\'s Lacrosse',
        shortName: 'NCAALAX',
        aliases: ['college lacrosse', 'mens college lacrosse', 'men\'s lacrosse'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/lacrosse.png',
        espnConfig: {
            espnSlug: 'mens-college-lacrosse',
            espnSport: 'lacrosse',
        },
    },
    ncaawlax: {
        name: 'NCAA Women\'s Lacrosse',
        shortName: 'NCAAWLAX',
        aliases: ['womens college lacrosse', 'women\'s college lacrosse', 'womens lacrosse'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/lacrosse.png',
        espnConfig: {
            espnSlug: 'womens-college-lacrosse',
            espnSport: 'lacrosse',
        },
    },


    ncaavb: {
        name: 'NCAA Men\'s Volleyball',
        shortName: 'NCAAVB',
        aliases: ['college volleyball', 'mens college volleyball', 'men\'s volleyball'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/volleyball.png',
        espnConfig: {
            espnSlug: 'mens-college-volleyball',
            espnSport: 'volleyball',
        },
    },
    ncaawvb: {
        name: 'NCAA Women\'s Volleyball',
        shortName: 'NCAAWVB',
        aliases: ['womens college volleyball', 'women\'s college volleyball', 'womens volleyball'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/volleyball.png',
        espnConfig: {
            espnSlug: 'womens-college-volleyball',
            espnSport: 'volleyball',
        },
    },


    ncaawp: {
        name: 'NCAA Men\'s Water Polo',
        shortName: 'NCAAWP',
        aliases: ['college water polo', 'mens college water polo', 'men\'s water polo'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/waterpolo.png',
        espnConfig: {
            espnSlug: 'mens-college-water-polo',
            espnSport: 'water-polo',
        },
    },
    ncaawwp: {
        name: 'NCAA Women\'s Water Polo',
        shortName: 'NCAAWWP',
        aliases: ['womens college water polo', 'women\'s college water polo', 'womens water polo'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/waterpolo.png',
        espnConfig: {
            espnSlug: 'womens-college-water-polo',
            espnSport: 'water-polo',
        },
    },


    ncaawfh: {
        name: 'NCAA Women\'s Field Hockey',
        shortName: 'NCAAWFH',
        aliases: ['womens college field hockey', 'women\'s college field hockey', 'womens field hockey', 'field hockey'],
        providerId: 'espn',
        fallbackLeague: 'ncaaf', // Fall back to football if team not found
        logoUrl: 'https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/fieldhockey.png',
        espnConfig: {
            espnSlug: 'womens-college-field-hockey',
            espnSport: 'field-hockey',
        },
    },
};

// ------------------------------------------------------------------------------

module.exports = {
    leagues,
    findLeague,
};

// ------------------------------------------------------------------------------