---
layout: default
title: ESPN Direct Lookup
parent: API Reference
nav_order: 15
---

# ESPN Direct Lookup

{: .highlight }
> **Direct API Access:** Bypass leagues.json normalization and query ESPN API directly using sport and league identifiers.

**Endpoints:**
- `/espn/:sport/:league/logo` - League logo
- `/espn/:sport/:league/thumb` - League thumbnail (1440x1080)
- `/espn/:sport/:league/cover` - League cover (1080x1440)
- `/espn/:sport/:league/:team/logo` - Team logo
- `/espn/:sport/:league/:team/thumb` - Team thumbnail (1440x1080)
- `/espn/:sport/:league/:team/cover` - Team cover (1080x1440)
- `/espn/:sport/:league/:team1/:team2/logo` - Matchup logo (1024x1024)
- `/espn/:sport/:league/:team1/:team2/thumb` - Matchup thumbnail (1440x1080)
- `/espn/:sport/:league/:team1/:team2/cover` - Matchup cover (1080x1440)

---

## Overview

The ESPN direct lookup endpoints provide a way to access ESPN's sports data without relying on the pre-configured league mappings in `leagues.json`. This is useful for:

- **Testing new leagues** before adding them to the configuration
- **Accessing obscure sports** not in the standard league list
- **Development and debugging** of ESPN API integrations
- **Flexible league identifiers** when you know the ESPN sport/league codes

### How It Works

1. **Sport and League:** Passed directly to ESPN API (only trimmed, not normalized)
2. **Team Matching:** Uses the standard team matching/normalization logic
3. **Image Generation:** Same generators as regular endpoints (logo, thumb, cover)

---

## Parameters

### Path Parameters

- `sport` - ESPN sport identifier (e.g., `basketball`, `football`, `soccer`)
- `league` - ESPN league slug (e.g., `nba`, `nfl`, `eng.1`)
- `team` / `team1` / `team2` - Team identifier (name, city, or abbreviation)

{: .note }
> The `sport` and `league` parameters are passed **directly** to ESPN's API with only whitespace trimming. No normalization or validation occurs against `leagues.json`.

---

## Query Parameters

The ESPN Direct endpoints support the same query parameters as their corresponding unified endpoints:

- **Logo parameters:** See [Logo Endpoint documentation](/logo.html#query-parameters)
- **Thumbnail parameters:** See [Thumbnail Endpoint documentation](/thumb.html#query-parameters)
- **Cover parameters:** See [Cover Endpoint documentation](/cover.html#query-parameters)

All standard parameters (`variant`, `size`, `style`, `aspect`, `logo`, `fallback`, `badge`, etc.) work identically to the unified endpoints.

---

## ESPN Sport and League Codes

### Common Sport Codes

| Sport | ESPN Code |
|-------|-----------|
| Basketball | `basketball` |
| Football | `football` |
| Soccer | `soccer` |
| Hockey | `hockey` |
| Baseball | `baseball` |

### Common League Slugs

| League | ESPN Slug |
|--------|-----------|
| NBA | `nba` |
| WNBA | `wnba` |
| NFL | `nfl` |
| UFL | `ufl` |
| NHL | `nhl` |
| MLB | `mlb` |
| MLS | `mls` |
| Premier League | `eng.1` |
| La Liga | `esp.1` |
| Bundesliga | `ger.1` |
| Serie A | `ita.1` |
| Ligue 1 | `fra.1` |
| UEFA Champions League | `uefa.champions` |
| NCAA Football | `college-football` |
| NCAA Men's Basketball | `mens-college-basketball` |
| NCAA Women's Basketball | `womens-college-basketball` |

{: .note }
> To find ESPN sport/league codes, visit ESPN's website and check the URL structure. For example, `https://www.espn.com/soccer/league/_/name/eng.1` uses sport `soccer` and league `eng.1`.

---

## Examples

### League Logos
```
GET /espn/basketball/nba/logo
GET /espn/football/nfl/logo?variant=dark
GET /espn/soccer/eng.1/logo
```

### Team Logos
```
GET /espn/basketball/nba/lakers/logo
GET /espn/football/nfl/chiefs/logo?size=1024
GET /espn/soccer/eng.1/arsenal/logo?variant=dark
```

### Matchup Logos
```
GET /espn/basketball/nba/lakers/celtics/logo
GET /espn/football/nfl/chiefs/49ers/logo?style=2
GET /espn/soccer/eng.1/arsenal/chelsea/logo?style=5&league=true
```

### League Thumbnails
```
GET /espn/basketball/nba/thumb
GET /espn/football/nfl/thumb?aspect=16-9
```

### Team Thumbnails
```
GET /espn/basketball/nba/warriors/thumb
GET /espn/hockey/nhl/bruins/thumb?aspect=1-1
```

### Matchup Thumbnails
```
GET /espn/basketball/nba/heat/bucks/thumb
GET /espn/football/nfl/cowboys/eagles/thumb?style=2
GET /espn/soccer/esp.1/barcelona/real-madrid/thumb?logo=false
```

### League Covers
```
GET /espn/baseball/mlb/cover
GET /espn/soccer/uefa.champions/cover?aspect=16-9
```

### Team Covers
```
GET /espn/basketball/wnba/liberty/cover
GET /espn/hockey/nhl/maple-leafs/cover?aspect=9-16
```

### Matchup Covers
```
GET /espn/baseball/mlb/yankees/red-sox/cover
GET /espn/basketball/nba/nets/knicks/cover?style=3
```

---

## Use Cases

### Testing New Leagues

Before adding a league to `leagues.json`, test if ESPN has the data:

```
GET /espn/soccer/fra.2/logo
GET /espn/basketball/gleague/logo
```

### Accessing International Leagues

Access leagues not in the standard configuration:

```
GET /espn/soccer/ita.2/logo
GET /espn/basketball/euroleague/logo
```

### Development and Debugging

Quickly test ESPN API responses without configuration changes:

```
GET /espn/football/college-football/ohio-state/logo
GET /espn/hockey/nhl/kraken/logo
```

---

## Differences from Regular Endpoints

| Feature | Regular Endpoints | ESPN Direct |
|---------|------------------|-------------|
| League validation | ✅ Validated against `leagues.json` | ❌ No validation |
| League normalization | ✅ Aliases supported | ❌ Direct passthrough |
| Provider flexibility | ✅ Can use multiple providers | ❌ ESPN only |
| Configuration required | ✅ Must be in `leagues.json` | ❌ No configuration needed |
| Team matching | ✅ Uses overrides | ✅ Uses overrides |
| Error messages | Standard | Standard (mirrors regular endpoints) |

---

## Error Handling

### Team Not Found
If a team cannot be found, you'll receive:
```json
{
  "error": "Team not found: 'invalid-team' in NBA. Available teams: Boston Celtics, Brooklyn Nets, ..."
}
```

Use `fallback=true` to return the league logo instead:
```
GET /espn/basketball/nba/invalid-team/logo?fallback=true
```

### League Not Found
If ESPN doesn't have data for the sport/league combination:
```json
{
  "error": "League not found: API request failed: ..."
}
```

---

## Performance

- **Caching:** Same caching strategy as regular endpoints (24 hours default)
- **Rate Limiting:** Same rate limits apply (30 requests/min for images)
- **Team Resolution:** Uses ESPN's team matching with overrides from `teams.json`

---

## Related Documentation

- [Logo Endpoint](/logo.html) - Regular league-based logo endpoint
- [Thumbnail Endpoint](/thumb.html) - Regular league-based thumbnail endpoint
- [Cover Endpoint](/cover.html) - Regular league-based cover endpoint
- [Team Matching](/team-matching.html) - How team identification works
- [Supported Leagues](/supported-leagues.html) - Pre-configured leagues
