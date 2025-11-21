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

| League Name | Code | Provider |
|-------------|------|----------|
| National Basketball Association | `nba` | ESPN |
| Women's National Basketball Association | `wnba` | ESPN |
| National Football League | `nfl` | ESPN |
| United Football League | `ufl` | ESPN |
| Major League Baseball | `mlb` | ESPN |
| National Hockey League | `nhl` | ESPN |
| National Lacrosse League | `nll` | ESPN |
| English Premier League | `epl` | ESPN |
| La Liga (Spain) | `laliga` | ESPN |
| Bundesliga (Germany) | `bundesliga` | ESPN |
| Serie A (Italy) | `seriea` | ESPN |
| Ligue 1 (France) | `ligue1` | ESPN |
| Major League Soccer | `mls` | ESPN |
| UEFA Champions League | `uefa` | ESPN |
| UEFA Europa League | `europa` | ESPN |
| UEFA Europa Conference League | `conference` | ESPN |
| FIFA World Cup | `worldcup` | ESPN |

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

The `/ncaa/:sport/:team1/:team2/:type` endpoint accepts these sport identifiers:

### Men's Sports

| Primary Sport | Additional Aliases | Maps to League Code |
|---------------|-------------------|---------------------|
| `football` | `footballm` | `ncaaf` |
| `basketball` | `basketballm`, `march-madness` | `ncaam` |
| `hockey` | `ice-hockey`, `hockeym`, `ice-hockeym` | `ncaah` |
| `soccer` | `soccerm` | `ncaas` |
| `baseball` | `baseballm` | `ncaabb` |
| `lacrosse` | `lacrossem`, `mens-lacrosse` | `ncaalax` |
| `volleyball` | `volleyballm`, `mens-volleyball` | `ncaavb` |
| `water-polo` | `waterpolo`, `waterpolom`, `mens-water-polo` | `ncaawp` |

### Women's Sports

| Primary Sport | Additional Aliases | Maps to League Code |
|---------------|-------------------|---------------------|
| `womens-basketball` | `basketballw`, `womens-college-basketball` | `ncaaw` |
| `womens-hockey` | `hockeyw`, `womens-college-hockey` | `ncaawh` |
| `womens-soccer` | `soccerw`, `womens-college-soccer` | `ncaaws` |
| `softball` | `softballw`, `womens-softball` | `ncaasbw` |
| `womens-lacrosse` | `lacrossew`, `womens-college-lacrosse` | `ncaawlax` |
| `womens-volleyball` | `volleyballw`, `womens-college-volleyball` | `ncaawvb` |
| `womens-water-polo` | `waterpolow`, `womens-college-water-polo` | `ncaawwp` |
| `field-hockey` | `fieldhockey`, `womens-field-hockey`, `womens-college-field-hockey` | `ncaawfh` |

### Examples

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

### ESPN

All leagues currently use ESPN as the data provider. Team data is fetched from ESPN's public APIs:

**Professional Leagues:**
- `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams`

**NCAA Leagues:**
- `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams`

### Caching

- Team data is cached for 24 hours to minimize API calls
- League logos are cached for 24 hours
- Generated images are cached for 24 hours based on content hash

See [Technical Details](technical-details.html) for more information on caching and data sources.

---

## Adding New Leagues

New leagues can be added by configuring them in `leagues.js`. Each league requires:

- **shortName**: League code used in API endpoints
- **fullName**: Full league name for display
- **providerId**: Data provider (currently only `espn` supported)
- **espnConfig**: ESPN sport and slug configuration
  - `espnSport`: ESPN sport identifier (e.g., `basketball`, `football`, `soccer`)
  - `espnSlug`: ESPN league slug (e.g., `nba`, `nfl`, `eng.1` for EPL)

### Example League Configuration

```javascript
{
  shortName: 'nba',
  fullName: 'NBA',
  providerId: 'espn',
  espnConfig: {
    espnSport: 'basketball',
    espnSlug: 'nba'
  }
}
```

For more details on the technical implementation, see [Technical Details](technical-details.html).
