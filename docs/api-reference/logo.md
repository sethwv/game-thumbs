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
  - **Athlete Sports (Tennis, MMA):** Use athlete names (e.g., `djokovic`, `serena-williams`)
  - **Doubles/Teams:** Use `+` to combine multiple athletes (e.g., `djokovic+federer`)

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

{: .note }
> Styles 3-6 include `logo=true` to display the league logo. Styles 1-2 have transparent backgrounds.

| Style | Description | Preview |
|-------|-------------|--------|
| **1: Compact Diagonal Split** | Thumbnail style 1 compressed into logo footprint with transparent background. | [![Style 1](https://game-thumbs.swvn.io/nhl/leafs/canadiens/logo?style=1)](https://game-thumbs.swvn.io/nhl/leafs/canadiens/logo?style=1) |
| **2: Side by Side** | Team logos placed side by side with transparent background. | [![Style 2](https://game-thumbs.swvn.io/nba/raptors/bucks/logo?style=2)](https://game-thumbs.swvn.io/nba/raptors/bucks/logo?style=2) |
| **3: Circle Badges** | Circular badges with team colors, league logo overlays bottom. | [![Style 3](https://game-thumbs.swvn.io/mlb/bluejays/yankees/logo?style=3&logo=true)](https://game-thumbs.swvn.io/mlb/bluejays/yankees/logo?style=3&logo=true) |
| **4: Square Badges** | Square badges with team colors, league logo overlays bottom. | [![Style 4](https://game-thumbs.swvn.io/nhl/oilers/flames/logo?style=4&logo=true)](https://game-thumbs.swvn.io/nhl/oilers/flames/logo?style=4&logo=true) |
| **5: Circle with League Logo Left** | Circular badges with league logo on left side (white background, requires league logo). | [![Style 5](https://game-thumbs.swvn.io/nhl/canucks/jets/logo?style=5&logo=true)](https://game-thumbs.swvn.io/nhl/canucks/jets/logo?style=5&logo=true) |
| **6: Square with League Logo Left** | Square badges with league logo on left side (white background, requires league logo). | [![Style 6](https://game-thumbs.swvn.io/mls/toronto-fc/montreal/logo?style=6&logo=true)](https://game-thumbs.swvn.io/mls/toronto-fc/montreal/logo?style=6&logo=true) |

---

## Examples

### League Logos

Raw league logo from provider.

| League | Preview | URL |
|--------|---------|-----|
| **NHL** | [![NHL Logo](https://game-thumbs.swvn.io/nhl/logo)](https://game-thumbs.swvn.io/nhl/logo) | `/nhl/logo` |
| **NBA** | [![NBA Logo](https://game-thumbs.swvn.io/nba/logo)](https://game-thumbs.swvn.io/nba/logo) | `/nba/logo` |
| **MLB (Dark)** | [![MLB Logo](https://game-thumbs.swvn.io/mlb/logo?variant=dark)](https://game-thumbs.swvn.io/mlb/logo?variant=dark) | `/mlb/logo?variant=dark` |

### Team Logos

Raw team logo from provider.

| Team | Preview | URL |
|------|---------|-----|
| **Leafs** | [![Leafs Logo](https://game-thumbs.swvn.io/nhl/leafs/logo)](https://game-thumbs.swvn.io/nhl/leafs/logo) | `/nhl/leafs/logo` |
| **Raptors** | [![Raptors Logo](https://game-thumbs.swvn.io/nba/raptors/logo)](https://game-thumbs.swvn.io/nba/raptors/logo) | `/nba/raptors/logo` |
| **Blue Jays** | [![Blue Jays Logo](https://game-thumbs.swvn.io/mlb/bluejays/logo)](https://game-thumbs.swvn.io/mlb/bluejays/logo) | `/mlb/bluejays/logo` |

### Matchup Logos

**Basic:**
```
GET /nhl/leafs/canadiens/logo
GET /nba/raptors/lakers/logo?style=3
GET /mlb/bluejays/redsox/logo?size=2048
GET /nhl/oilers/flames/logo?badge=4K
GET /mls/toronto-fc/montreal/logo?badge=ALT&style=2
```

### Fallback Behavior

When `fallback=true` is set, the API gracefully handles missing data instead of returning errors.

#### Unsupported League Fallback

If a league is not configured but exists in ESPN's API, automatically uses ESPN provider.

| Request | Behavior |
|---------|----------|
| `/eng.w.1/team1/team2/logo?fallback=true` | Detects unconfigured league → creates temporary config → resolves teams normally |

{: .note }
> This enables support for 100+ ESPN leagues (e.g., WSL, Brazilian Serie A, J-League, Liga MX lower divisions) without manual configuration.

#### Single Team Fallback

If a team is not found, returns the league logo instead.

| Request | Preview | Behavior |
|---------|---------|----------|
| `/nba/invalidteam/logo?fallback=true` | [![Single Team Fallback](https://game-thumbs.swvn.io/nba/invalidteam/logo?fallback=true)](https://game-thumbs.swvn.io/nba/invalidteam/logo?fallback=true) | Returns NBA league logo |

#### Matchup Fallback

If one or both teams are not found, uses greyscale league logo for missing teams.

| Request | Preview | Behavior |
|---------|---------|----------|
| `/nhl/leafs/invalidteam/logo?fallback=true&style=2` | [![Matchup Fallback](https://game-thumbs.swvn.io/nhl/leafs/invalidteam/logo?fallback=true&style=2)](https://game-thumbs.swvn.io/nhl/leafs/invalidteam/logo?fallback=true&style=2) | Valid team + greyscale NHL logo |
| `/mlb/invalidteam1/invalidteam2/logo?fallback=true&style=3` | [![Both Teams Fallback](https://game-thumbs.swvn.io/mlb/invalidteam1/invalidteam2/logo?fallback=true&style=3)](https://game-thumbs.swvn.io/mlb/invalidteam1/invalidteam2/logo?fallback=true&style=3) | Both sides use greyscale MLB logo |

### Athlete Sports
```
GET /tennis/djokovic/federer/logo
GET /tennis/djokovic+federer/nadal+murray/logo?style=2
GET /ufc/jon-jones/stipe-miocic/logo?style=3
```

---

## Output

- **League/Team:** PNG image (original resolution from provider)
- **Matchup:** PNG image (1024x1024 by default, transparent background)

---

## Deprecated Endpoints

- `/:league/leaguelogo` → Use `/:league/logo`
- `/:league/:team/teamlogo` → Use `/:league/:team/logo`
