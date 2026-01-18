---
layout: default
title: Thumbnail
parent: API Reference
nav_order: 7
---

# Thumbnail Endpoint

{: .highlight }
> **Unified API:** One endpoint that handles league thumbnails, team thumbnails, and matchup thumbnails.

**Endpoints:**
- `/:league/thumb[.png]` - League thumbnail (dark gradient with logo)
- `/:league/:team/thumb[.png]` - Team thumbnail (team color gradient with logo)
- `/:league/:team1/:team2/thumb[.png]` - Matchup thumbnail (split design, 1440x1080)

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team` / `team1` / `team2` - Team identifier (name, city, or abbreviation)
  - **Athlete Sports (Tennis, MMA):** Use athlete names (e.g., `djokovic`, `serena-williams`)
  - **Doubles/Teams:** Use `+` to combine multiple athletes (e.g., `djokovic+federer`)

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `aspect` | string | `4-3` | Aspect ratio: `4-3` (1440x1080), `16-9` (1920x1080), or `1-1` (1080x1080) |
| `style` | integer | 1 | Visual style 1-4 (matchup only) |
| `logo` | boolean | true | Include league logo (matchup only) |
| `badge` | string | - | Add quality badge overlay: `ALT`, `4K`, `HD`, `FHD`, or `UHD` (matchup only) |
| `fallback` | boolean | false | **Single team:** Return league thumb. **Matchup:** Use greyscale league logo for missing teams |

---

## Matchup Styles

**Applies to:** `/:league/:team1/:team2/thumb` only

- **Style 1:** Diagonal split with team colors
- **Style 2:** Gradient blend between team colors
- **Style 3:** Minimalist badge with team circles and VS text (light background)
- **Style 4:** Minimalist badge with team circles and VS text (dark background)
- **Style 99:** 3D embossed with textured backgrounds, reflections, and metallic VS badge _(credit: @shelf on Dispatcharr Discord)_

---

## Examples

### League Thumbnails
```
GET /nba/thumb
GET /nfl/thumb.png
GET /ncaaf/thumb?aspect=16-9
GET /nba/thumb?aspect=1-1
```

### Team Thumbnails
```
GET /nba/lakers/thumb
GET /nfl/chiefs/thumb.png
GET /mls/lafc/thumb
```

### Matchup Thumbnails
```
GET /nba/lakers/celtics/thumb
GET /nfl/chiefs/49ers/thumb?style=2
GET /ncaaf/alabama/georgia/thumb?logo=false
GET /nhl/tor/mtl/thumb?style=99
GET /epl/arsenal/chelsea/thumb?badge=4K
GET /nba/lakers/celtics/thumb?badge=HD&style=3
```

### Athlete Sports (Singles)
```
GET /tennis/djokovic/federer/thumb
GET /tennis/serena-williams/osaka/thumb?style=2
GET /ufc/jon-jones/stipe-miocic/thumb
```

### Tennis Doubles
```
GET /tennis/djokovic+federer/nadal+murray/thumb
GET /tennis/serena-williams+venus-williams/osaka+azarenka/thumb?style=3
GET /tennis/ram+salisbury/koolhof+skupski/thumb?logo=false
```

---

## Output

- **Default:** 1440x1080 PNG (4:3 aspect ratio)
- **16:9:** 1920x1080 PNG
- **1:1 (Square):** 1080x1080 PNG

---

## Notes

- **League:** Dark gradient with league logo centered
- **Team:** Team color gradient with team logo centered  
- **Matchup:** Split design with team colors and logos
- Automatically selects best logo variants based on contrast

---

## Deprecated Endpoint

- `/:league/leaguethumb` → Use `/:league/thumb`
