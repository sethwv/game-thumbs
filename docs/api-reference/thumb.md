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

{: .note }
> Examples below include `logo=true` to display the league logo in the center.

| Style | Description | Preview |
|-------|-------------|--------|
| **1: Diagonal Split** | Diagonal split with team colors separated by a white line. | [![Style 1](https://game-thumbs.swvn.io/nhl/leafs/canadiens/thumb?style=1&logo=true)](https://game-thumbs.swvn.io/nhl/leafs/canadiens/thumb?style=1&logo=true) |
| **2: Gradient Blend** | Smooth gradient blend between team colors. | [![Style 2](https://game-thumbs.swvn.io/nba/raptors/celtics/thumb?style=2&logo=true)](https://game-thumbs.swvn.io/nba/raptors/celtics/thumb?style=2&logo=true) |
| **3: Minimalist Badge (Light)** | Minimalist design with team circles, VS text, and light background. | [![Style 3](https://game-thumbs.swvn.io/mlb/bluejays/yankees/thumb?style=3&logo=true)](https://game-thumbs.swvn.io/mlb/bluejays/yankees/thumb?style=3&logo=true) |
| **4: Minimalist Badge (Dark)** | Minimalist design with team circles, VS text, and dark background. | [![Style 4](https://game-thumbs.swvn.io/nhl/oilers/flames/thumb?style=4&logo=true)](https://game-thumbs.swvn.io/nhl/oilers/flames/thumb?style=4&logo=true) |
| **5: Grid Background** | Dark background with grey diagonal grid lines and fade to black effect. | [![Style 5](https://game-thumbs.swvn.io/mls/toronto-fc/montreal/thumb?style=5&logo=true)](https://game-thumbs.swvn.io/mls/toronto-fc/montreal/thumb?style=5&logo=true) |
| **6: Grid with Team Colors** | Dark background with team color gradient grid lines and fade to black effect. | [![Style 6](https://game-thumbs.swvn.io/nhl/canucks/senators/thumb?style=6&logo=true)](https://game-thumbs.swvn.io/nhl/canucks/senators/thumb?style=6&logo=true) |
| **99: 3D Embossed** | 3D embossed design with textured backgrounds, reflections, and metallic VS badge.<br/>_Credit: @shelf on Dispatcharr Discord_ | [![Style 99](https://game-thumbs.swvn.io/nhl/leafs/bruins/thumb?style=99&logo=true)](https://game-thumbs.swvn.io/nhl/leafs/bruins/thumb?style=99&logo=true) |

---

## Examples

### League Thumbnails

Dark gradient background with centered league logo.

| League | Preview | URL |
|--------|---------|-----|
| **NHL** | [![NHL Thumb](https://game-thumbs.swvn.io/nhl/thumb)](https://game-thumbs.swvn.io/nhl/thumb) | `/nhl/thumb` |
| **NBA** | [![NBA Thumb](https://game-thumbs.swvn.io/nba/thumb)](https://game-thumbs.swvn.io/nba/thumb) | `/nba/thumb` |
| **MLB** | [![MLB Thumb](https://game-thumbs.swvn.io/mlb/thumb)](https://game-thumbs.swvn.io/mlb/thumb) | `/mlb/thumb` |
| **MLS (1:1)** | [![MLS Thumb](https://game-thumbs.swvn.io/mls/thumb?aspect=1-1)](https://game-thumbs.swvn.io/mls/thumb?aspect=1-1) | `/mls/thumb?aspect=1-1` |

### Team Thumbnails

Team color gradient background with centered team logo.

| Team | Preview | URL |
|------|---------|-----|
| **Leafs** | [![Leafs Thumb](https://game-thumbs.swvn.io/nhl/leafs/thumb)](https://game-thumbs.swvn.io/nhl/leafs/thumb) | `/nhl/leafs/thumb` |
| **Raptors** | [![Raptors Thumb](https://game-thumbs.swvn.io/nba/raptors/thumb)](https://game-thumbs.swvn.io/nba/raptors/thumb) | `/nba/raptors/thumb` |
| **Blue Jays** | [![Blue Jays Thumb](https://game-thumbs.swvn.io/mlb/bluejays/thumb)](https://game-thumbs.swvn.io/mlb/bluejays/thumb) | `/mlb/bluejays/thumb` |

### Matchup Thumbnails

**Basic:**
```
GET /nhl/leafs/canadiens/thumb
GET /nba/raptors/lakers/thumb?style=2
GET /mlb/bluejays/yankees/thumb?logo=false
GET /nhl/oilers/flames/thumb?style=99
GET /mls/toronto-fc/lafc/thumb?badge=4K
GET /nhl/canucks/bruins/thumb?badge=HD&style=3
GET /nhl/jets/blackhawks/thumb?style=5
GET /nhl/senators/rangers/thumb?style=6
```

### Fallback Behavior

When `fallback=true` is set, the API gracefully handles missing data instead of returning errors.

#### Unsupported League Fallback

If a league is not configured but exists in ESPN's API, automatically uses ESPN provider.

| Request | Behavior |
|---------|----------|
| `/eng.w.1/team1/team2/thumb?fallback=true` | Detects unconfigured league → creates temporary config → resolves teams normally |

{: .note }
> This enables support for 100+ ESPN leagues (e.g., WSL, Brazilian Serie A, J-League, Liga MX lower divisions) without manual configuration.

#### Single Team Fallback

If a team is not found, returns the league thumbnail instead.

| Request | Preview | Behavior |
|---------|---------|----------|
| `/nba/invalidteam/thumb?fallback=true` | [![Single Team Fallback](https://game-thumbs.swvn.io/nba/invalidteam/thumb?fallback=true)](https://game-thumbs.swvn.io/nba/invalidteam/thumb?fallback=true) | Returns NBA league thumbnail |

#### Matchup Fallback

If one or both teams are not found, uses greyscale league logo for missing teams.

| Request | Preview | Behavior |
|---------|---------|----------|
| `/nhl/leafs/invalidteam/thumb?fallback=true&logo=true` | [![Matchup Fallback](https://game-thumbs.swvn.io/nhl/leafs/invalidteam/thumb?fallback=true&logo=true)](https://game-thumbs.swvn.io/nhl/leafs/invalidteam/thumb?fallback=true&logo=true) | Valid team + greyscale NHL logo |
| `/nba/invalidteam1/invalidteam2/thumb?fallback=true&logo=true` | [![Both Teams Fallback](https://game-thumbs.swvn.io/nba/invalidteam1/invalidteam2/thumb?fallback=true&logo=true)](https://game-thumbs.swvn.io/nba/invalidteam1/invalidteam2/thumb?fallback=true&logo=true) | Both sides use greyscale NBA logo |

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
