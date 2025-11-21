---
layout: default
title: API Reference
nav_order: 3
---

# API Reference
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Endpoint Overview

| Type | Endpoint | Dimensions | Description |
|------|----------|------------|-------------|
| Thumbnail | `/:league/:team1/:team2/thumb[.png]` | 1440x1080 | Landscape matchup thumbnail |
| Cover | `/:league/:team1/:team2/cover[.png]` | 1080x1440 | Portrait matchup cover |
| Logo | `/:league/:team1/:team2/logo[.png]` | 800x800 | Matchup logo (transparent) |
| Team Logo | `/:league/:team/teamlogo[.png]` | Original | Raw team logo |
| League Logo | `/:league/leaguelogo[.png]` | Original | Raw league logo |
| League Thumb | `/:league/leaguethumb[.png]` | 1440x1080 | League logo with gradient |
| League Cover | `/:league/leaguecover[.png]` | 1080x1440 | League cover with gradient |
| Raw Data | `/:league/:team/raw` | JSON | Team data from provider |
| Server Info | `/info` | JSON | Version and git info |

**Note:** The `.png` extension is optional for all image endpoints.

---

## NCAA Shorthand Route

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

---

## Matchup Thumbnail

**Endpoint:** `/:league/:team1/:team2/thumb[.png]`

Generates a landscape matchup thumbnail with diagonal split layout.

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | number | `1` | Visual style (1-4) |
| `logo` | boolean | `true` | Show league logo |
| `fallback` | boolean | `false` | Return league thumbnail if teams not found |

### Styles

- **Style 1:** Diagonal split with team colors
- **Style 2:** Gradient blend between team colors
- **Style 3:** Minimalist badge with team circles and VS text (light background)
- **Style 4:** Minimalist badge with team circles and VS text (dark background)

### Examples

```
GET /nba/lakers/celtics/thumb
GET /nhl/toronto/montreal/thumb?logo=false
GET /nfl/chiefs/49ers/thumb?style=2
GET /ncaaf/alabama/georgia/thumb?style=3
GET /mlb/yankees/redsox/thumb?style=4&logo=false
GET /nba/invalidteam/anotherteam/thumb?fallback=true
```

### Output

1440x1080 PNG image (4:3 aspect ratio)

---

## Matchup Cover

**Endpoint:** `/:league/:team1/:team2/cover[.png]`

Generates a portrait matchup cover with horizontal split.

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | number | `1` | Visual style (1-4) |
| `logo` | boolean | `true` | Show league logo |
| `fallback` | boolean | `false` | Return league cover if teams not found |

### Styles

- **Style 1:** Horizontal split with team colors
- **Style 2:** Gradient blend between team colors
- **Style 3:** Minimalist badge with team circles and VS text (light background)
- **Style 4:** Minimalist badge with team circles and VS text (dark background)

### Examples

```
GET /nba/lakers/celtics/cover
GET /nhl/toronto/montreal/cover?logo=false
GET /nfl/chiefs/49ers/cover?style=2
GET /mlb/yankees/redsox/cover?style=3
GET /ncaam/duke/unc/cover?style=4&logo=false
GET /nfl/badteam/faketeam/cover?fallback=true
```

### Output

1080x1440 PNG image (3:4 aspect ratio)

---

## Matchup Logo

**Endpoint:** `/:league/:team1/:team2/logo[.png]`

Generates a matchup logo with team logos on transparent background.

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | number | `1` | Visual style (1-6) |
| `size` | number | `800` | Output size: 256, 512, 1024, or 2048 |
| `logo` | boolean | `true` | Show league logo badge (always true for styles 5-6) |
| `useLight` | boolean | `false` | Use primary logos instead of dark variants |
| `trim` | boolean | `true` | Trim transparent edges |
| `fallback` | boolean | `false` | Return raw league logo if teams not found |

### Styles

- **Style 1:** Diagonal split with dividing line
- **Style 2:** Side by side
- **Style 3:** Circle badges with team colors (league logo overlays bottom)
- **Style 4:** Square badges with team colors (league logo overlays bottom)
- **Style 5:** Circle badges with league logo on left (white background, league logo required)
- **Style 6:** Square badges with league logo on left (white background, league logo required)

### Examples

```
GET /nba/lakers/celtics/logo
GET /nhl/toronto/montreal/logo?style=2
GET /nfl/chiefs/49ers/logo?style=3
GET /mlb/yankees/redsox/logo?size=2048
GET /nba/lakers/celtics/logo?useLight=true&logo=false
GET /epl/arsenal/chelsea/logo?style=5
GET /nfl/packers/bears/logo?style=6&size=1024
GET /mlb/unknown/invalid/logo?fallback=true
```

### Output

PNG image with transparent background (square, size based on `size` parameter)

### Notes

- For styles 3 and 4, the logo variant is automatically selected for best contrast. The `useLight` parameter is ignored.
- Styles 5 and 6 require the league logo and ignore the `logo` parameter (always treated as `true`).
- Styles 5 and 6 automatically select the best league logo variant based on contrast against white background.
- In style 5, circles overlap by up to 5% to maximize size while preventing edge clipping.

---

## Team Logo

**Endpoint:** `/:league/:team/teamlogo[.png]`

Returns the raw team logo image directly from the provider (proxied through the server).

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team` - Team identifier (name, city, or abbreviation)

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | string | `light` | Logo variant: `light` or `dark` |

### Examples

```
GET /nba/lakers/teamlogo
GET /nfl/chiefs/teamlogo.png
GET /nhl/toronto/teamlogo?variant=dark
GET /ncaaf/alabama/teamlogo?variant=light
GET /mlb/yankees/teamlogo
```

### Output

PNG image (original resolution from provider)

### Notes

- Images are cached using the same 24-hour cache system
- If a dark variant is requested but not available, the light variant is returned
- The image is proxied through the server to ensure compatibility with all clients

---

## League Logo

**Endpoint:** `/:league/leaguelogo[.png]`

Returns the raw league logo image directly from the provider (proxied through the server).

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | string | `dark` | Logo variant: `light` or `dark` |

### Examples

```
GET /nba/leaguelogo
GET /nfl/leaguelogo.png
GET /epl/leaguelogo?variant=dark
GET /ncaaf/leaguelogo?variant=light
GET /mls/leaguelogo
```

### Output

PNG image (original resolution from provider)

---

## League Thumbnail

**Endpoint:** `/:league/leaguethumb[.png]`

Generates a landscape thumbnail featuring the league logo centered on a moody dark gradient background with subtle hints of the league's brand colors.

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))

### Examples

```
GET /nba/leaguethumb
GET /nfl/leaguethumb.png
GET /ncaaf/leaguethumb
GET /mls/leaguethumb
```

### Output

1440x1080 PNG image (4:3 aspect ratio)

### Notes

- Uses a moody dark gradient background with subtle hints of the league's brand colors
- The logo is displayed large and centered (60% of the smaller dimension)
- A subtle drop shadow is applied to the logo for depth
- Automatically selects the best logo variant (light/dark) based on contrast

---

## League Cover

**Endpoint:** `/:league/leaguecover[.png]`

Generates a portrait cover featuring the league logo centered on a moody dark gradient background with subtle hints of the league's brand colors.

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))

### Examples

```
GET /nba/leaguecover
GET /nfl/leaguecover.png
GET /ncaaf/leaguecover
GET /mls/leaguecover
```

### Output

1080x1440 PNG image (3:4 aspect ratio)

### Notes

- Identical to league thumbnail but in portrait orientation
- Uses the same moody dark gradient with brand color hints
- Perfect for vertical/portrait displays and mobile screens

---

## Raw Team Data

**Endpoint:** `/:league/:team/raw`

Returns raw JSON data for a team from the provider.

### Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team` - Team identifier (name, city, or abbreviation)

### Examples

```
GET /nba/lakers/raw
GET /nfl/chiefs/raw
GET /ncaaf/alabama/raw
```

### Output

JSON object containing:

```json
{
  "id": "13",
  "city": "Los Angeles",
  "name": "Lakers",
  "fullName": "Los Angeles Lakers",
  "abbreviation": "LAL",
  "conference": "Western Conference",
  "division": "Pacific Division",
  "logo": "https://a.espncdn.com/i/teamlogos/nba/500/lal.png",
  "logoAlt": "https://a.espncdn.com/i/teamlogos/nba/500-dark/lal.png",
  "color": "#552583",
  "alternateColor": "#FDB927"
}
```

---

## Server Info

**Endpoint:** `/info`

Returns server version and git information.

### Examples

```
GET /info
```

### Output

```json
{
  "name": "Game Thumbs API",
  "git": {
    "branch": "main",
    "commit": "a1b2c3d",
    "tag": "v0.0.1"
  }
}
```

If the working tree has uncommitted changes, `dirty: true` will be included in the git object. If not in a git repository, the `git` field will be `null`.
