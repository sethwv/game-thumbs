---
layout: default
title: NCAA Shorthand
parent: API Reference
nav_order: 1
---

# NCAA Shorthand Route

**Endpoint:** `/ncaa/:sport/:team1/:team2/:type`

A convenience endpoint for NCAA sports that uses sport names instead of league codes.

---

## Parameters

- `sport` - NCAA sport identifier (e.g., `football`, `basketball`, `womens-basketball`)
- `team1` - First team (name, city, or abbreviation) *(optional for `leaguelogo`)*
- `team2` - Second team (name, city, or abbreviation) *(only required for matchup types)*
- `type` - Image type: `thumb`, `cover`, `logo`, `teamlogo`, `leaguelogo`, or `raw`

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

### Matchup Images

```
GET /ncaa/football/alabama/georgia/thumb
GET /ncaa/basketball/duke/unc/cover
GET /ncaa/womens-basketball/uconn/south-carolina/thumb?style=2
GET /ncaa/softball/oklahoma/alabama/cover
```

### Single Team Images

```
GET /ncaa/football/alabama/teamlogo
GET /ncaa/basketball/duke/logo
```

### League Images

```
GET /ncaa/basketball/leaguelogo
GET /ncaa/football/leaguethumb
```

### Raw Data

```
GET /ncaa/football/alabama/raw
GET /ncaa/basketball/duke/raw
GET /ncaa/womens-basketball/uconn/raw
```

Returns the raw team data in JSON format.
