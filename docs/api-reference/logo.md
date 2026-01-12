---
layout: default
title: Logo
parent: API Reference
nav_order: 6
---

# Logo Endpoint

{: .highlight }
> **Unified API:** One endpoint that handles league logos, team logos, and matchup logos.

**Endpoints:**
- `/:league/logo[.png]` - League logo (raw from provider)
- `/:league/:team/logo[.png]` - Team logo (raw from provider)
- `/:league/:team1/:team2/logo[.png]` - Matchup logo (1024x1024, transparent)

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team` / `team1` / `team2` - Team identifier (name, city, or abbreviation)

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | string | `light` | Logo variant: `light` or `dark` (league/team only) |
| `style` | integer | 1 | Visual style 1-6 (matchup only) |
| `size` | integer | 1024 | Output size: 256, 512, 1024, or 2048 (matchup only) |
| `logo` | boolean | false | Include league logo (matchup only) |
| `trim` | boolean | true | Trim whitespace (matchup only) |
| `badge` | string | - | Add quality badge overlay: `ALT`, `4K`, `HD`, `FHD`, or `UHD` (matchup only) |
| `fallback` | boolean | false | **Single team:** Return league logo. **Matchup:** Use greyscale league logo for missing teams |

---

## Matchup Styles

**Applies to:** `/:league/:team1/:team2/logo` only

- **Style 1:** Diagonal split with dividing line
- **Style 2:** Side by side
- **Style 3:** Circle badges with team colors (league logo overlays bottom)
- **Style 4:** Square badges with team colors (league logo overlays bottom)
- **Style 5:** Circle badges with league logo on left (white background, league logo required)
- **Style 6:** Square badges with league logo on left (white background, league logo required)

---

## Examples

### League Logos
```
GET /nba/logo
GET /nfl/logo.png
GET /epl/logo?variant=dark
```

### Team Logos
```
GET /nba/lakers/logo
GET /nfl/chiefs/logo.png
GET /nhl/toronto/logo?variant=dark
```

### Matchup Logos
```
GET /nba/lakers/celtics/logo
GET /nfl/chiefs/49ers/logo?style=3
GET /ncaaf/alabama/georgia/logo?size=2048
GET /nhl/tor/mtl/logo?badge=4K
GET /epl/arsenal/chelsea/logo?badge=ALT&style=2
```

---

## Output

- **League/Team:** PNG image (original resolution from provider)
- **Matchup:** PNG image (1024x1024 by default, transparent background)

---

## Deprecated Endpoints

- `/:league/leaguelogo` → Use `/:league/logo`
- `/:league/:team/teamlogo` → Use `/:league/:team/logo`
