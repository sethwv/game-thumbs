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

{: .note }
> Examples below include `logo=true` to display the league logo in the center.

| Style | Description | Preview |
|-------|-------------|--------|
| **1: Horizontal Split** | Horizontal split with team colors separated by a white line. | [![Style 1](https://game-thumbs.swvn.io/nhl/leafs/senators/cover?style=1&logo=true)](https://game-thumbs.swvn.io/nhl/leafs/senators/cover?style=1&logo=true) |
| **2: Gradient Blend** | Smooth gradient blend between team colors. | [![Style 2](https://game-thumbs.swvn.io/nba/raptors/heat/cover?style=2&logo=true)](https://game-thumbs.swvn.io/nba/raptors/heat/cover?style=2&logo=true) |
| **3: Minimalist Badge (Light)** | Minimalist design with team circles, VS text, and light background. | [![Style 3](https://game-thumbs.swvn.io/mlb/bluejays/redsox/cover?style=3&logo=true)](https://game-thumbs.swvn.io/mlb/bluejays/redsox/cover?style=3&logo=true) |
| **4: Minimalist Badge (Dark)** | Minimalist design with team circles, VS text, and dark background. | [![Style 4](https://game-thumbs.swvn.io/nhl/canadiens/bruins/cover?style=4&logo=true)](https://game-thumbs.swvn.io/nhl/canadiens/bruins/cover?style=4&logo=true) |
| **5: Grid Background** | Dark background with grey diagonal grid lines and fade to black effect. | [![Style 5](https://game-thumbs.swvn.io/mls/montreal/toronto-fc/cover?style=5&logo=true)](https://game-thumbs.swvn.io/mls/montreal/toronto-fc/cover?style=5&logo=true) |
| **6: Grid with Team Colors** | Dark background with team color gradient grid lines and fade to black effect. | [![Style 6](https://game-thumbs.swvn.io/nhl/oilers/canucks/cover?style=6&logo=true)](https://game-thumbs.swvn.io/nhl/oilers/canucks/cover?style=6&logo=true) |
| **99: 3D Embossed** | 3D embossed design with textured backgrounds, reflections, and metallic VS badge.<br/>_Credit: @shelf on Dispatcharr Discord_ | [![Style 99](https://game-thumbs.swvn.io/nhl/jets/flames/cover?style=99&logo=true)](https://game-thumbs.swvn.io/nhl/jets/flames/cover?style=99&logo=true) |

---

## Examples

### League Covers

Dark gradient background with centered league logo.

| League | Preview | URL |
|--------|---------|-----|
| **NHL** | [![NHL Cover](https://game-thumbs.swvn.io/nhl/cover)](https://game-thumbs.swvn.io/nhl/cover) | `/nhl/cover` |
| **NBA** | [![NBA Cover](https://game-thumbs.swvn.io/nba/cover)](https://game-thumbs.swvn.io/nba/cover) | `/nba/cover` |
| **MLB** | [![MLB Cover](https://game-thumbs.swvn.io/mlb/cover)](https://game-thumbs.swvn.io/mlb/cover) | `/mlb/cover` |
| **MLS (1:1)** | [![MLS Cover](https://game-thumbs.swvn.io/mls/cover?aspect=1-1)](https://game-thumbs.swvn.io/mls/cover?aspect=1-1) | `/mls/cover?aspect=1-1` |

### Team Covers

Team color gradient background with centered team logo.

| Team | Preview | URL |
|------|---------|-----|
| **Leafs** | [![Leafs Cover](https://game-thumbs.swvn.io/nhl/leafs/cover)](https://game-thumbs.swvn.io/nhl/leafs/cover) | `/nhl/leafs/cover` |
| **Raptors** | [![Raptors Cover](https://game-thumbs.swvn.io/nba/raptors/cover)](https://game-thumbs.swvn.io/nba/raptors/cover) | `/nba/raptors/cover` |
| **Blue Jays** | [![Blue Jays Cover](https://game-thumbs.swvn.io/mlb/bluejays/cover)](https://game-thumbs.swvn.io/mlb/bluejays/cover) | `/mlb/bluejays/cover` |

### Matchup Covers

**Basic:**
```
GET /nhl/leafs/canadiens/cover
GET /nba/raptors/warriors/cover?style=2
GET /mlb/bluejays/orioles/cover?logo=false
GET /nhl/oilers/jets/cover?style=99
GET /mls/toronto-fc/montreal/cover?badge=UHD
GET /nhl/canucks/flames/cover?badge=4K&style=2
GET /nhl/senators/sabres/cover?style=5
GET /mls/vancouver/seattle/cover?style=6
```

### Fallback Behavior

When `fallback=true` is set, the API gracefully handles missing data instead of returning errors.

#### Unsupported League Fallback

If a league is not configured but exists in ESPN's API, automatically uses ESPN provider.

| Request | Behavior |
|---------|----------|
| `/eng.w.1/team1/team2/cover?fallback=true` | Detects unconfigured league → creates temporary config → resolves teams normally |

{: .note }
> This enables support for 100+ ESPN leagues (e.g., WSL, Brazilian Serie A, J-League, Liga MX lower divisions) without manual configuration.

#### Single Team Fallback

If a team is not found, returns the league cover instead.

| Request | Preview | Behavior |
|---------|---------|----------|
| `/nba/invalidteam/cover?fallback=true` | [![Single Team Fallback](https://game-thumbs.swvn.io/nba/invalidteam/cover?fallback=true)](https://game-thumbs.swvn.io/nba/invalidteam/cover?fallback=true) | Returns NBA league cover |

#### Matchup Fallback

If one or both teams are not found, uses greyscale league logo for missing teams.

| Request | Preview | Behavior |
|---------|---------|----------|
| `/nhl/leafs/invalidteam/cover?fallback=true&logo=true` | [![Matchup Fallback](https://game-thumbs.swvn.io/nhl/leafs/invalidteam/cover?fallback=true&logo=true)](https://game-thumbs.swvn.io/nhl/leafs/invalidteam/cover?fallback=true&logo=true) | Valid team + greyscale NHL logo |
| `/mlb/invalidteam1/invalidteam2/cover?fallback=true&logo=true` | [![Both Teams Fallback](https://game-thumbs.swvn.io/mlb/invalidteam1/invalidteam2/cover?fallback=true&logo=true)](https://game-thumbs.swvn.io/mlb/invalidteam1/invalidteam2/cover?fallback=true&logo=true) | Both sides use greyscale MLB logo |

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
