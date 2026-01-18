---
layout: default
title: Cover
parent: API Reference
nav_order: 8
---

# Cover Endpoint

{: .highlight }
> **Unified API:** One endpoint that handles league covers, team covers, and matchup covers.

**Endpoints:**
- `/:league/cover[.png]` - League cover (dark gradient with logo)
- `/:league/:team/cover[.png]` - Team cover (team color gradient with logo)
- `/:league/:team1/:team2/cover[.png]` - Matchup cover (split design, 1080x1440)

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
| `aspect` | string | `3-4` | Aspect ratio: `3-4` (1080x1440), `9-16` (1080x1920), or `1-1` (1080x1080) |
| `style` | integer | 1 | Visual style 1-4 (matchup only) |
| `logo` | boolean | true | Include league logo (matchup only) |
| `badge` | string | - | Add quality badge overlay: `ALT`, `4K`, `HD`, `FHD`, or `UHD` (matchup only) |
| `fallback` | boolean | false | **Single team:** Return league cover. **Matchup:** Use greyscale league logo for missing teams |

---

## Matchup Styles

**Applies to:** `/:league/:team1/:team2/cover` only

- **Style 1:** Horizontal split with team colors
- **Style 2:** Gradient blend between team colors
- **Style 3:** Minimalist badge with team circles and VS text (light background)
- **Style 4:** Minimalist badge with team circles and VS text (dark background)
- **Style 99:** 3D embossed with textured backgrounds, reflections, and metallic VS badge _(credit: @shelf on Dispatcharr Discord)_

---

## Examples

### League Covers
```
GET /nba/cover
GET /nfl/cover.png
GET /ncaaf/cover?aspect=9-16
GET /nba/cover?aspect=1-1
```

### Team Covers
```
GET /nba/lakers/cover
GET /nfl/chiefs/cover.png
GET /mls/lafc/cover
```

### Matchup Covers
```
GET /nba/lakers/celtics/cover
GET /nfl/chiefs/49ers/cover?style=2
GET /ncaaf/alabama/georgia/cover?logo=false
GET /nhl/tor/mtl/cover?style=99
GET /epl/arsenal/chelsea/cover?badge=UHD
GET /nba/lakers/celtics/cover?badge=4K&style=2
```

### Athlete Sports
```
GET /tennis/djokovic/federer/cover
GET /tennis/djokovic+federer/nadal+murray/cover?style=3
GET /ufc/jon-jones/stipe-miocic/cover?style=2
```

---

## Output

- **Default:** 1080x1440 PNG (3:4 aspect ratio)
- **9:16:** 1080x1920 PNG
- **1:1 (Square):** 1080x1080 PNG

---

## Notes

- **League:** Dark gradient with league logo centered
- **Team:** Team color gradient with team logo centered  
- **Matchup:** Split design with team colors and logos
- Identical to thumbnail but in portrait orientation
- Perfect for vertical/portrait displays and mobile screens

---

## Deprecated Endpoint

- `/:league/leaguecover` → Use `/:league/cover`
