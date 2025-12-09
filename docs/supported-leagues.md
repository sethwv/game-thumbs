---
layout: default
title: Supported Leagues
nav_order: 4
---

# Supported Leagues
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Professional Leagues

| League Name | Code | Provider | Feeder Leagues |
|-------------|------|----------|----------------|
| National Basketball Association | `nba` | ESPN | |
| Women's National Basketball Association | `wnba` | ESPN | |
| National Football League | `nfl` | ESPN | |
| United Football League | `ufl` | ESPN | |
| Major League Baseball | `mlb` | ESPN | |
| National Hockey League | `nhl` | ESPN | |
| National Lacrosse League | `nll` | ESPN | |
| Professional Women's Hockey League | `pwhl` | HockeyTech | |
| Canadian Football League | `cfl` | TheSportsDB | |
| Canadian Hockey League | `chl` | Local Logo Only | OHL, WHL, QMJHL |
| Ontario Hockey League | `ohl` | TheSportsDB | CHL |
| Western Hockey League | `whl` | TheSportsDB | CHL |
| Quebec Maritimes Junior Hockey League | `qmjhl` | TheSportsDB | CHL |
| American Hockey League | `ahl` | TheSportsDB | |
| English Premier League | `epl` | TheSportsDB / ESPN | Championship, League One, League Two |
| EFL Championship | `championship` | ESPN | |
| EFL League One | `league-one` | ESPN | |
| EFL League Two | `league-two` | ESPN | |
| La Liga (Spain) | `laliga` | ESPN | Segunda División |
| Segunda División (Spain) | `segunda` | ESPN | |
| Bundesliga (Germany) | `bundesliga` | ESPN | 2. Bundesliga |
| 2. Bundesliga (Germany) | `2-bundesliga` | ESPN | |
| Serie A (Italy) | `seriea` | ESPN | Serie B |
| Serie B (Italy) | `serieb` | ESPN | |
| Ligue 1 (France) | `ligue1` | ESPN | Ligue 2 |
| Ligue 2 (France) | `ligue2` | ESPN | |
| Major League Soccer | `mls` | ESPN | |
| UEFA Champions League | `uefa` | ESPN | |
| UEFA Europa League | `europa` | ESPN | |
| UEFA Europa Conference League | `conference` | ESPN | |
| FIFA World Cup | `worldcup` | ESPN | All WCQ Confederations |
| FIFA WCQ - UEFA | `wcq-uefa` | ESPN | |
| FIFA WCQ - CONMEBOL | `wcq-conmebol` | ESPN | |
| FIFA WCQ - CONCACAF | `wcq-concacaf` | ESPN | |
| FIFA WCQ - AFC | `wcq-afc` | ESPN | |
| FIFA WCQ - CAF | `wcq-caf` | ESPN | |
| FIFA WCQ - OFC | `wcq-ofc` | ESPN | |

---

## International

| League Name | Code | Provider | Notes |
|-------------|------|----------|-------|
| Country Matchups | `country` | FlagCDN | Country flags for international matchups |
| Olympic Games | `olympics` | FlagCDN | Olympic team flags and colors |

**Examples:**
```
GET /country/canada/usa/thumb
GET /olympics/usa/china/cover
GET /country/france/germany/logo
```

**Features:**
- Automatic country resolution with ISO 3166 codes (2-letter and 3-letter)
- Olympic team codes (ROC, OAR, RPC)
- UK home nations support (ENG, SCT, WAL, NIR)
- High-resolution flag images (2560px width)
- Automatic color extraction from flags
- Desaturated and darkened colors for thumbnail backgrounds
- 7-day country and color caching

---

## Combat Sports

Game Thumbs supports **athlete-based** combat sports leagues where individual fighters are treated as "teams" for matchup generation.

| League Name | Code | Provider | Athletes |
|-------------|------|----------|----------|
| Ultimate Fighting Championship | `ufc` | ESPN Athlete | 600+ |
| Professional Fighters League | `pfl` | ESPN Athlete | 200+ |
| Bellator MMA | `bellator` | ESPN Athlete | 300+ |

**Examples:**
```
GET /ufc/jon-jones/stipe-miocic/thumb
GET /pfl/kayla-harrison/larissa-pacheco/logo
GET /bellator/ryan-bader/corey-anderson/cover
```

**Features:**
- Automatic athlete roster caching (72-hour duration)
- Background cache refresh before expiration
- Smart name matching (first name, last name, full name)
- Randomly assigned dark color palettes for visual consistency
- Headshot images used as fighter "logos"

---

## NCAA Men's Sports

| Sport | Code | Provider |
|-------|------|----------|
| NCAA Football | `ncaaf` | ESPN |
| NCAA Men's Basketball | `ncaam` | ESPN |
| NCAA Ice Hockey (Men's) | `ncaah` | ESPN |
| NCAA Soccer (Men's) | `ncaas` | ESPN |
| NCAA Baseball | `ncaabb` | ESPN |
| NCAA Lacrosse (Men's) | `ncaalax` | ESPN |
| NCAA Volleyball (Men's) | `ncaavb` | ESPN |
| NCAA Water Polo (Men's) | `ncaawp` | ESPN |

---

## NCAA Women's Sports

| Sport | Code | Provider | Fallback |
|-------|------|----------|----------|
| NCAA Women's Basketball | `ncaaw` | ESPN | Men's Basketball |
| NCAA Ice Hockey (Women's) | `ncaawh` | ESPN | Men's Hockey |
| NCAA Soccer (Women's) | `ncaaws` | ESPN | Men's Soccer |
| NCAA Softball | `ncaasbw` | ESPN | Football |
| NCAA Lacrosse (Women's) | `ncaawlax` | ESPN | Football |
| NCAA Volleyball (Women's) | `ncaawvb` | ESPN | Football |
| NCAA Water Polo (Women's) | `ncaawwp` | ESPN | Football |
| NCAA Field Hockey (Women's) | `ncaawfh` | ESPN | Football |

**Note:** Women's NCAA sports automatically fall back to the indicated sport when a team is not found. This ensures maximum compatibility when teams don't have dedicated women's programs.

---

## NCAA Shorthand

The `/ncaa/:sport/:team1/:team2/:type` endpoint provides a convenient way to access NCAA sports using sport names instead of league codes.

**Format:** `/ncaa/:sport/:team1/:team2/:type`

See the [NCAA Shorthand API Reference](api-reference/ncaa-route.html) for the complete list of supported sport identifiers and aliases.

**Examples:**
```
/ncaa/football/alabama/georgia/thumb
/ncaa/march-madness/duke/unc/cover
/ncaa/womens-basketball/uconn/stanford/logo
/ncaa/ice-hockey/minnesota/wisconsin/thumb
/ncaa/softball/oklahoma/alabama/cover
```

---

## Usage Examples

### Professional Leagues

```
GET /nba/lakers/celtics/thumb
GET /nfl/chiefs/49ers/cover
GET /mlb/yankees/redsox/logo
GET /nhl/maple-leafs/canadiens/thumb
GET /ohl/london-knights/ottawa-67s/cover
GET /epl/manchester-united/chelsea/thumb
GET /mls/lafc/galaxy/cover
```

### NCAA Leagues (Direct)

```
GET /ncaaf/alabama/georgia/thumb
GET /ncaam/duke/unc/cover
GET /ncaaw/uconn/stanford/logo
GET /ncaah/minnesota/wisconsin/thumb
```

### NCAA Shorthand

```
GET /ncaa/football/alabama/georgia/thumb
GET /ncaa/basketball/duke/unc/cover
GET /ncaa/womens-basketball/uconn/stanford/logo
GET /ncaa/hockey/minnesota/wisconsin/thumb
```

---

## Data Providers

For detailed information about data providers, caching strategies, and API endpoints, see the [Technical Details](technical-details.html#data-providers) page.

---

## Adding New Leagues

New leagues can be added by configuring them in `leagues.json`. Each league requires:

- **shortName**: League code used in API endpoints
- **name**: Full league name for display
- **providers**: Array of provider configurations (tried in order)

### Single Provider Configuration

**ESPN Provider:**
```javascript
{
  "shortName": "nba",
  "name": "National Basketball Association",
  "providers": [
    {
      "espn": {
        "espnSport": "basketball",
        "espnSlug": "nba"
      }
    }
  ]
}
```

The provider type is automatically inferred from the config field (`espn` = ESPN provider).

**TheSportsDB Provider:**
```javascript
{
  "shortName": "ohl",
  "name": "Ontario Hockey League",
  "logoUrl": "./assets/OHL_LIGHTMODE.png",
  "logoUrlDark": "./assets/OHL_DARKMODE.png",
  "providers": [
    {
      "theSportsDB": {
        "leagueId": "5159",
        "leagueName": "Canadian OHL"
      }
    }
  ]
}
```

The provider type is automatically inferred from the config field (`theSportsDB` = TheSportsDB provider).

**FlagCDN Provider (International):**
```javascript
{
  "shortName": "olympics",
  "name": "Olympic Games",
  "logoUrl": "./assets/2026_OLYMPICS.png",
  "providers": [
    {
      "flagcdn": {}
    }
  ]
}
```

The provider type is automatically inferred from the config field (`flagcdn` = FlagCDN provider).

### Multiple Providers with Priority

Configure multiple providers for the same league. They are tried in order (top to bottom) before falling back to `fallbackLeague`:

```javascript
{
  "shortName": "ohl",
  "name": "Ontario Hockey League",
  "logoUrl": "./assets/OHL_LIGHTMODE.png",
  "logoUrlDark": "./assets/OHL_DARKMODE.png",
  "providers": [
    {
      "theSportsDB": {
        "leagueId": "5159",
        "leagueName": "Canadian OHL"
      }
    },
    {
      "espn": {
        "espnSport": "hockey",
        "espnSlug": "ohl"
      }
    }
  ],
  "fallbackLeague": "nhl"
}
```

Provider types are automatically inferred: `theSportsDB` = TheSportsDB, `espn` = ESPN.

**Resolution Order (top to bottom):**
1. Try TheSportsDB first
2. If team not found, try ESPN
3. If still not found, fall back to NHL league

### Configuration Fields

**Required:**
- `name`: Full league name for display
- `providers`: Array of provider configurations (tried in priority order)

**Optional:**
- `logoUrl`: Custom league logo URL or local path (light mode)
- `logoUrlDark`: Custom dark mode league logo URL or local path
- `aliases`: Array of alternative names for the league
- `fallbackLeague`: League code to fall back to when team not found (checked after all providers)

For more details on the technical implementation, see [Technical Details](technical-details.html).
