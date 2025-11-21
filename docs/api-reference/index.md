---
layout: default
title: API Reference
nav_order: 3
has_children: true
has_toc: false
---

# API Reference

Complete documentation for all API endpoints.

---

## Endpoint Overview

| Type | Endpoint | Dimensions | Description |
|------|----------|------------|-------------|
| Thumbnail | `/:league/:team1/:team2/thumb[.png]` | 1440x1080 | Landscape matchup thumbnail |
| Cover | `/:league/:team1/:team2/cover[.png]` | 1080x1440 | Portrait matchup cover |
| Logo | `/:league/:team1/:team2/logo[.png]` | 1024x1024 | Matchup logo (transparent) |
| Team Logo | `/:league/:team/teamlogo[.png]` | Original | Raw team logo |
| League Logo | `/:league/leaguelogo[.png]` | Original | Raw league logo |
| League Thumb | `/:league/leaguethumb[.png]` | 1440x1080 | League logo with gradient |
| League Cover | `/:league/leaguecover[.png]` | 1080x1440 | League cover with gradient |
| Raw Data | `/:league/:team/raw` | JSON | Team data from provider |
| Server Info | `/info` | JSON | Version and git info |

**Note:** The `.png` extension is optional for all image endpoints.

---

## Quick Reference

Browse detailed documentation for each endpoint:

- [NCAA Shorthand](/ncaa-route.html) - Convenience route for NCAA sports
- [Matchup Thumbnail](/matchup-thumb.html) - Landscape matchup images
- [Matchup Cover](/matchup-cover.html) - Portrait matchup images
- [Matchup Logo](/matchup-logo.html) - Transparent matchup logos
- [Team Logo](/team-logo.html) - Raw team logos
- [League Logo](/league-logo.html) - Raw league logos
- [League Thumbnail](/league-thumb.html) - League landscape images
- [League Cover](/league-cover.html) - League portrait images
- [Raw Team Data](/raw-data.html) - JSON team data
- [Server Info](/server-info.html) - Server version info

---

## NCAA Shorthand Route (Legacy)

**Endpoint:** `/ncaa/:sport/:team1/:team2/:type`

A convenience endpoint for NCAA sports that uses sport names instead of league codes.

### Parameters

- `sport` - NCAA sport identifier (e.g., `football`, `basketball`, `womens-basketball`)
- `team1` - First team (name, city, or abbreviation) *(optional for `leaguelogo`)*
- `team2` - Second team (name, city, or abbreviation) *(only required for matchup types)*
- `type` - Image type: `thumb`, `cover`, `logo`, `teamlogo`, or `leaguelogo`

### Supported Sports

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

### Examples

```
GET /ncaa/football/alabama/georgia/thumb
GET /ncaa/basketball/duke/unc/cover
GET /ncaa/womens-basketball/uconn/south-carolina/thumb?style=2
GET /ncaa/softball/oklahoma/alabama/cover
GET /ncaa/football/alabama/teamlogo
GET /ncaa/basketball/leaguelogo
```
