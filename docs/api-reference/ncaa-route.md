---
layout: default
title: NCAA Shorthand
parent: API Reference
nav_order: 1
---

# NCAA Shorthand Route

**Endpoints:**
- `/ncaa/:sport/:type` (league-only)
- `/ncaa/:sport/:team/:type` (single team)
- `/ncaa/:sport/:team1/:team2/:type` (matchup)

A convenience endpoint for NCAA sports that uses sport names instead of league codes.

---

## Parameters

- `sport` - NCAA sport identifier (e.g., `football`, `basketball`, `womens-basketball`)
- `team` / `team1` - Team identifier (name, city, or abbreviation) *(optional for league-only)*
- `team2` - Second team (name, city, or abbreviation) *(optional for single team)*
- `type` - Image type: `thumb`, `cover`, `logo`, or `raw`

---

## Supported Sports

| Primary Sport | Additional Aliases | Maps to |
|---------------|-------------------|---------|
| `football` | `footballm` | `ncaaf` |
| `basketball` | `basketballm`, `march-madness` | `ncaam` |
| `hockey` | `ice-hockey`, `hockeym` | `ncaah` |
| `soccer` | `soccerm` | `ncaas` |
| `baseball` | `baseballm` | `ncaabb` |
| `lacrosse` | `lacrossem`, `mens-lacrosse` | `ncaalax` |
| `volleyball` | `volleyballm`, `mens-volleyball` | `ncaavb` |
| `water-polo` | `waterpolo`, `waterpolom` | `ncaawp` |
| `womens-basketball` | `basketballw` | `ncaaw` |
| `womens-hockey` | `hockeyw` | `ncaawh` |
| `womens-soccer` | `soccerw` | `ncaaws` |
| `softball` | `softballw` | `ncaasbw` |
| `womens-lacrosse` | `lacrossew` | `ncaawlax` |
| `womens-volleyball` | `volleyballw` | `ncaawvb` |
| `womens-water-polo` | `waterpolow` | `ncaawwp` |
| `field-hockey` | `fieldhockey` | `ncaawfh` |

---

## Examples

### League Images

```
GET /ncaa/football/thumb
GET /ncaa/basketball/cover
GET /ncaa/womens-basketball/logo
```

### Single Team Images

```
GET /ncaa/football/alabama/thumb
GET /ncaa/basketball/duke/cover
GET /ncaa/womens-basketball/uconn/logo
```

### Matchup Images

```
GET /ncaa/football/alabama/georgia/thumb
GET /ncaa/basketball/duke/unc/cover
GET /ncaa/womens-basketball/uconn/south-carolina/thumb?style=2
GET /ncaa/softball/oklahoma/alabama/cover
```

### Raw Data

```
GET /ncaa/football/alabama/raw
GET /ncaa/basketball/duke/raw
GET /ncaa/womens-basketball/uconn/raw
```

Returns the raw team data in JSON format.

---

## Notes

- The NCAA shorthand route automatically forwards to the unified endpoints ([Logo](logo.html), [Thumbnail](thumb.html), [Cover](cover.html))
- All query parameters from the unified endpoints are supported (e.g., `style`, `aspect`, `variant`, `fallback`)
- Deprecated endpoints like `teamlogo` and `leaguelogo` still work but use the unified endpoints instead
