---
layout: default
title: Matchup Cover
parent: API Reference
nav_order: 3
---

# Matchup Cover

**Endpoint:** `/:league/:team1/:team2/cover[.png]`

Generates a portrait matchup cover with horizontal split.

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `style` | number | `1` | Visual style (1-4) |
| `logo` | boolean | `true` | Show league logo |
| `fallback` | boolean | `false` | Return league cover if teams not found |

---

## Styles

- **Style 1:** Horizontal split with team colors
- **Style 2:** Gradient blend between team colors
- **Style 3:** Minimalist badge with team circles and VS text (light background)
- **Style 4:** Minimalist badge with team circles and VS text (dark background)

---

## Examples

```
GET /nba/lakers/celtics/cover
GET /nhl/toronto/montreal/cover?logo=false
GET /nfl/chiefs/49ers/cover?style=2
GET /mlb/yankees/redsox/cover?style=3
GET /ncaam/duke/unc/cover?style=4&logo=false
GET /nfl/badteam/faketeam/cover?fallback=true
```

---

## Output

1080x1440 PNG image (3:4 aspect ratio)
