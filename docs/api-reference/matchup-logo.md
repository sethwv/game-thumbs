---
layout: default
title: Matchup Logo
parent: API Reference
nav_order: 4
---

# Matchup Logo

**Endpoint:** `/:league/:team1/:team2/logo[.png]`

Generates a matchup logo with team logos on transparent background.

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | number | `1` | Visual style (1-6) |
| `size` | number | `1024` | Output size: 256, 512, 1024, or 2048 |
| `logo` | boolean | `true` | Show league logo badge (always true for styles 5-6) |
| `useLight` | boolean | `false` | Use primary logos instead of dark variants |
| `trim` | boolean | `true` | Trim transparent edges |
| `fallback` | boolean | `false` | Return raw league logo if teams not found |

---

## Styles

- **Style 1:** Diagonal split with dividing line
- **Style 2:** Side by side
- **Style 3:** Circle badges with team colors (league logo overlays bottom)
- **Style 4:** Square badges with team colors (league logo overlays bottom)
- **Style 5:** Circle badges with league logo on left (white background, league logo required)
- **Style 6:** Square badges with league logo on left (white background, league logo required)

---

## Examples

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

---

## Output

PNG image with transparent background (square, size based on `size` parameter)

---

## Notes

- For styles 3 and 4, the logo variant is automatically selected for best contrast. The `useLight` parameter is ignored.
- Styles 5 and 6 require the league logo and ignore the `logo` parameter (always treated as `true`).
- Styles 5 and 6 automatically select the best league logo variant based on contrast against white background.
- In style 5, circles overlap by up to 5% to maximize size while preventing edge clipping.
