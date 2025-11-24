---
layout: default
title: Matchup Thumbnail
parent: API Reference
nav_order: 2
---

# Matchup Thumbnail

**Endpoint:** `/:league/:team1/:team2/thumb[.png]`

Generates a landscape matchup thumbnail with diagonal split layout.

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
| `fallback` | boolean | `false` | Return league thumbnail if teams not found |
| `aspect` | string | `4-3` | Aspect ratio (`4-3` or `16-9`) |

---

## Styles

- **Style 1:** Diagonal split with team colors
- **Style 2:** Gradient blend between team colors
- **Style 3:** Minimalist badge with team circles and VS text (light background)
- **Style 4:** Minimalist badge with team circles and VS text (dark background)

---

## Examples

```
GET /nba/lakers/celtics/thumb
GET /nhl/toronto/montreal/thumb?logo=false
GET /nfl/chiefs/49ers/thumb?style=2
GET /ncaaf/alabama/georgia/thumb?style=3
GET /mlb/yankees/redsox/thumb?style=4&logo=false
GET /nba/invalidteam/anotherteam/thumb?fallback=true
GET /nfl/chiefs/49ers/thumb?aspect=16-9
```

---

## Output

- **4-3 aspect ratio** (default): 1440x1080 PNG image
- **16-9 aspect ratio**: 1920x1080 PNG image
