### **Note:** This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.

# Game Thumbs

A simple API that generates and serves various sports matchup thumbnails and logos dynamically.

## Features

- 🏀 **Multi-Sport Support**: NBA, WNBA, NFL, UFL, MLB, NHL, EPL, MLS, UEFA Champions League, NCAA Football, NCAA Men's Basketball, NCAA Women's Basketball, NCAA Ice Hockey (Men's & Women's), NCAA Soccer (Men's & Women's)
- 🎨 **Dynamic Generation**: Creates thumbnails and logos on-the-fly with team colors and branding
- 🖼️ **Multiple Styles**: Choose from different visual styles for logos and thumbnails
- 💾 **Smart Caching**: Automatically caches generated images for 24 hours
- 🎯 **Flexible Team Matching**: Supports team names, cities, abbreviations, and partial matches

## Docker

### Pull the Image

```bash
# Latest stable version
docker pull ghcr.io/sethwv/game-thumbs:latest

# Development version
docker pull ghcr.io/sethwv/game-thumbs:dev
```

### Run the Container

```bash
# Run on default port 3000
docker run -p 3000:3000 ghcr.io/sethwv/game-thumbs:latest

# Run on custom port
docker run -p 8080:3000 ghcr.io/sethwv/game-thumbs:latest
```

## API Routes

### Overview

The API provides three types of image generation for sports matchups:

| Type | Endpoint | Dimensions | Aspect Ratio |
|------|----------|------------|--------------|
| **Thumbnail** | `/:league/:team1/:team2/thumb` | 1440x1080 | 4:3 |
| **Cover** | `/:league/:team1/:team2/cover` | 1080x1440 | 3:4 |
| **Logo** | `/:league/:team1/:team2/logo` | 1024x1024 | 1:1 |

**Supported Leagues:**

| Long Name                        | API League Parameter |
|----------------------------------|----------------------|
| National Basketball Association  | nba                  |
| Women's National Basketball Association | wnba         |
| National Football League         | nfl                  |
| United Football League           | ufl                  |
| Major League Baseball            | mlb                  |
| National Hockey League           | nhl                  |
| English Premier League           | epl                  |
| Major League Soccer              | mls                  |
| UEFA Champions League            | uefa                 |
| NCAA Football                    | ncaaf                |
| NCAA Men's Basketball            | ncaam                |
| NCAA Women's Basketball          | ncaaw                |
| NCAA Ice Hockey (Men's)          | ncaah                |
| NCAA Ice Hockey (Women's)        | ncaawh               |
| NCAA Soccer (Men's)              | ncaas                |
| NCAA Soccer (Women's)            | ncaaws               |

---

### NCAA Shorthand Route

**Endpoint:** `/ncaa/:sport/:team1/:team2/:type`

A convenience endpoint for NCAA sports that uses sport names instead of league codes.

**Parameters:**
- `sport` - NCAA sport identifier (see table below)
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)
- `type` - Image type: `thumb`, `cover`, or `logo` (`.png` extension optional)

**Supported NCAA Sports:**

| Sport Parameter | Aliases | Maps to League |
|----------------|---------|----------------|
| `ncaaf` | `football`, `footballm` | ncaaf |
| `ncaah` | `hockey`, `ice-hockey`, `hockeym`, `ice-hockeym` | ncaah |
| `ncaab` | `basketball`, `basketballm`, `march-madness` | ncaam |
| `ncaas` | `soccer`, `soccerm` | ncaas |
| `ncaawh` | `womens-hockey`, `hockeyw`, `womens-college-hockey` | ncaawh |
| `ncaaw` | `womens-basketball`, `basketballw`, `womens-college-basketball` | ncaaw |
| `ncaaws` | `womens-soccer`, `soccerw`, `womens-college-soccer` | ncaaws |

**Examples:**
```
GET /ncaa/football/alabama/georgia/thumb
GET /ncaa/basketball/duke/unc/cover
GET /ncaa/hockey/minnesota/wisconsin/logo
GET /ncaa/womens-basketball/uconn/south-carolina/thumb?style=2
GET /ncaa/womens-hockey/wisconsin/minnesota/cover
GET /ncaa/soccer/indiana/maryland/thumb
GET /ncaa/womens-soccer/stanford/ucla/logo
```

**Note:** This endpoint forwards to the standard league endpoints, so all query parameters (`style`, `logo`, `size`, etc.) work the same way.

---

### Thumbnail Generation

**Endpoint:** `/:league/:team1/:team2/thumb[.png]`

Generates a landscape matchup thumbnail with diagonal split layout.

*Note: The `.png` extension is optional*

**Parameters:**
- `league` - Sport league (nba, nfl, mlb, nhl, ncaaf, ncaab)
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

**Query Parameters:**
- `style` - Style number (default: 1)
  - `1` - Diagonal split with team colors
  - `2` - Gradient blend between team colors
  - `3` - Minimalist badge with team circles and VS text (light background)
  - `4` - Minimalist badge with team circles and VS text (dark background)
- `logo` - Show league logo (default: true, set to false to hide)

**Examples:**
```
GET /nba/lakers/celtics/thumb
GET /nhl/toronto/montreal/thumb?logo=false
GET /nfl/chiefs/49ers/thumb?style=2
GET /ncaaf/alabama/georgia/thumb?style=3
GET /mlb/yankees/redsox/thumb?style=4&logo=false
```

**Output:** 1440x1080 PNG image (4:3 aspect ratio)

---

### Cover Generation

**Endpoint:** `/:league/:team1/:team2/cover[.png]`

Generates a vertical matchup cover with horizontal split.

*Note: The `.png` extension is optional*

**Parameters:**
- `league` - Sport league (nba, nfl, mlb, nhl, ncaaf, ncaab)
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

**Query Parameters:**
- `style` - Style number (default: 1)
  - `1` - Horizontal split with team colors
  - `2` - Gradient blend between team colors
  - `3` - Minimalist badge with team circles and VS text (light background)
  - `4` - Minimalist badge with team circles and VS text (dark background)
- `logo` - Show league logo (default: true, set to false to hide)

**Examples:**
```
GET /nba/lakers/celtics/cover
GET /nhl/toronto/montreal/cover?logo=false
GET /nfl/chiefs/49ers/cover?style=2
GET /mlb/yankees/redsox/cover?style=3
GET /ncaab/duke/unc/cover?style=4&logo=false
```

**Output:** 1080x1440 PNG image (3:4 aspect ratio, default)

---

### Logo Generation

**Endpoint:** `/:league/:team1/:team2/logo[.png]`

Generates a matchup logo with team logos on transparent background.

*Note: The `.png` extension is optional*

**Parameters:**
- `league` - Sport league (nba, nfl, mlb, nhl, ncaaf, ncaab)
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

**Query Parameters:**
- `style` - Style number (default: 1)
  - `1` - Diagonal split with dividing line
  - `2` - Side by side
  - `3` - Circle badges with team colors
  - `4` - Square badges with team colors
- `size` - Output size in pixels (256, 512, 1024, 2048) - generates square image
- `logo` - Show league logo badge (default: true, set to false to hide)
- `useLight` - Use primary (light) logos instead of dark variants (true/false, default: false)

**Examples:**
```
GET /nba/lakers/celtics/logo
GET /nhl/toronto/montreal/logo?style=2
GET /nfl/chiefs/49ers/logo?style=3
GET /mlb/yankees/redsox/logo?style=2&size=2048
GET /nba/lakers/celtics/logo?useLight=true&logo=false
```

**Output:** 800x800 PNG image (transparent background)

**Note:** For styles 3 and 4, the logo variant (regular or alternate) is automatically selected for best contrast against the background color of its badge (circle or square). The `useLight` parameter is ignored for these styles.

---

## Team Matching

The API uses intelligent team matching with weighted scoring:

### Priority Order:
1. **Abbreviation** (highest priority) - e.g., "LAL", "BOS"
2. **Team Nickname** - e.g., "Lakers", "Celtics"
3. **Short Display Name** - e.g., "LA Lakers"
4. **Full Display Name** - e.g., "Los Angeles Lakers"
5. **Location/City** - e.g., "Los Angeles", "Boston"
6. **Partial Matches** - Flexible matching for convenience

### Examples:
```
/nba/lakers/celtics/thumb          ✓ Team nicknames
/nba/los%20angeles/boston/thumb    ✓ Cities
/nba/LAL/BOS/thumb                 ✓ Abbreviations
/nfl/chiefs/49ers/thumb            ✓ Mixed formats
```

## Data Sources

All team data is fetched dynamically from **ESPN's public APIs**:

### Team Information
- Team names, cities, and abbreviations
- Conference and division information
- Official team logos (high resolution)
- Primary and alternate team colors (hex codes)

### API Endpoints Used
- NBA: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams`
- NFL: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
- MLB: `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams`
- NHL: `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams`
- NCAA Football: `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams`
- NCAA Men's Basketball: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams`
- NCAA Women's Basketball: `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/teams`
- NCAA Ice Hockey (Men's): `https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/teams`
- NCAA Ice Hockey (Women's): `https://site.api.espn.com/apis/site/v2/sports/hockey/womens-college-hockey/teams`
- NCAA Soccer (Men's): `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.m.1/teams`
- NCAA Soccer (Women's): `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.w.1/teams`

### League Logos
- ESPN CDN: `https://a.espncdn.com/i/teamlogos/leagues/500/{league}.png`

### Caching
- Team data is cached for 24 hours to minimize API calls
- Generated images are cached for 24 hours based on content hash
- Expired cache entries are automatically cleaned up
