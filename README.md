### **Note:** This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.

# Game Thumbs

A simple API that generates and serves various sports matchup thumbnails and logos dynamically.

## Features

- 🏀 **Multi-Sport Support**: Supports 30+ leagues including NBA, WNBA, NFL, UFL, MLB, NHL, EPL, MLS, UEFA Champions League, and 21 NCAA sports (Football, Basketball, Hockey, Soccer, Baseball, Softball, Lacrosse, Volleyball, Water Polo, and Field Hockey)
- 🎨 **Dynamic Generation**: Creates thumbnails and logos on-the-fly with team colors and branding
- 🖼️ **Multiple Styles**: Choose from 4 different visual styles for logos and thumbnails
- 💾 **Smart Caching**: Automatically caches generated images and team data for 24 hours
- 🎯 **Flexible Team Matching**: Supports team names, cities, abbreviations, and partial matches
- 🎨 **Color Extraction**: Automatically extracts dominant colors from team logos when ESPN doesn't provide them
- 🔄 **NCAA Fallback**: Women's NCAA sports automatically fall back to men's teams when team not found

## Docker

### Pull the Image

```bash
# Latest stable version
# (This is usually fairly behind)
docker pull ghcr.io/sethwv/game-thumbs:latest

# Development version
docker pull ghcr.io/sethwv/game-thumbs:dev
```

### Environment Variables

You can configure the server behavior using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`). In development, error stack traces are included in responses. | `production` |
| `IMAGE_CACHE_HOURS` | How long to cache generated images (in hours). Set to `0` to disable caching. | `24` |
| `RATE_LIMIT_PER_MINUTE` | Maximum image generation requests per minute per IP. Set to `0` to disable rate limiting. | `30` |
| `TRUST_PROXY` | Number of proxy hops to trust for rate limiting (0 for local dev, 1+ for production behind proxies). | `2` |
| `REQUEST_TIMEOUT` | Timeout for external API calls and image downloads (in milliseconds). | `10000` |
| `SERVER_TIMEOUT` | Timeout for HTTP connections (in milliseconds). | `30000` |
| `SHOW_TIMESTAMP` | Whether to show timestamps in logs. Set to `false` to hide timestamps. | `true` |
| `FORCE_COLOR` | Force colored output in logs (useful for Docker/CI environments). Set to `1` or `true` to enable. | `false` |
| `LOG_TO_FILE` | Enable file logging. Set to `true` or `1` to enable. | `false` |
| `MAX_LOG_FILES` | Maximum number of log files to keep (oldest are deleted). | `10` |
| `CORS_ORIGIN` | Allowed CORS origin(s). Set to `*` for all origins, or a specific domain like `https://example.com`. | `*` |
| `CORS_MAX_AGE` | How long (in seconds) browsers should cache CORS preflight requests. | `86400` (24 hours) |

**Notes:**
- When `IMAGE_CACHE_HOURS=0`, every request generates a new image (useful for testing)
- When `RATE_LIMIT_PER_MINUTE=0`, there are no request limits (use with caution)
- Set `TRUST_PROXY` to the number of proxies between the internet and your app for accurate IP detection
- Rate limiting only applies to uncached requests; cached images are served without limits
- General API endpoints (like `/raw`) have 3x the image generation rate limit
- `REQUEST_TIMEOUT` prevents hanging on slow/unresponsive external services
- `SERVER_TIMEOUT` prevents zombie connections from accumulating
- Use `NODE_ENV=development` for detailed error messages and stack traces in API responses
- When `LOG_TO_FILE=true`, logs are written to files in `./logs` directory with automatic rotation (~100KB per file)
- Log files are named `app-YYYY-MM-DD-NNN.log` and old files are automatically cleaned up
- File logs always include full timestamps and stack traces (regardless of console settings)

## API Endpoints

### Overview

The API provides endpoints for sports matchups and logos:

| Type | Endpoint | Dimensions | Description |
|------|----------|------------|-------------|
| **Thumbnail** | `/:league/:team1/:team2/thumb[.png]` | 1440x1080 (4:3) | Landscape matchup thumbnail |
| **Cover** | `/:league/:team1/:team2/cover[.png]` | 1080x1440 (3:4) | Portrait matchup cover |
| **Logo** | `/:league/:team1/:team2/logo[.png]` | 800x800 (1:1) | Matchup logo with transparent background |
| **League Thumbnail** | `/:league/leaguethumb[.png]` | 1440x1080 (4:3) | League logo with gradient background |
| **League Cover** | `/:league/leaguecover[.png]` | 1080x1440 (3:4) | League logo cover with gradient background |
| **Team Logo** | `/:league/:team/teamlogo[.png]` | Original | Raw team logo image |
| **League Logo** | `/:league/leaguelogo[.png]` | Original | Raw league logo image |
| **Raw Data** | `/:league/:team/raw` | JSON | Raw team data from provider |
| **Server Info** | `/info` | JSON | Version and git information |

**NCAA Shorthand Endpoints:**

| Type | Endpoint | Dimensions | Description |
|------|----------|------------|-------------|
| **Thumbnail** | `/ncaa/:sport/:team1/:team2/thumb[.png]` | 1440x1080 (4:3) | NCAA matchup thumbnail |
| **Cover** | `/ncaa/:sport/:team1/:team2/cover[.png]` | 1080x1440 (3:4) | NCAA matchup cover |
| **Logo** | `/ncaa/:sport/:team1/:team2/logo[.png]` | 800x800 (1:1) | NCAA matchup logo |
| **League Thumbnail** | `/ncaa/:sport/leaguethumb[.png]` | 1440x1080 (4:3) | NCAA sport logo with gradient |
| **League Cover** | `/ncaa/:sport/leaguecover[.png]` | 1080x1440 (3:4) | NCAA sport cover with gradient |
| **Team Logo** | `/ncaa/:sport/:team/teamlogo[.png]` | Original | NCAA team logo |
| **League Logo** | `/ncaa/:sport/leaguelogo[.png]` | Original | NCAA sport logo |

*Note: The `.png` extension is optional for all image endpoints*

---

### Supported Leagues

**Professional Leagues:**

| League Name                                  | Code          |
|----------------------------------------------|---------------|
| National Basketball Association              | `nba`         |
| Women's National Basketball Association      | `wnba`        |
| National Football League                     | `nfl`         |
| United Football League                       | `ufl`         |
| Major League Baseball                        | `mlb`         |
| National Hockey League                       | `nhl`         |
| National Lacrosse League                     | `nll`         |
| English Premier League                       | `epl`         |
| La Liga                                      | `laliga`      |
| Bundesliga                                   | `bundesliga`  |
| Serie A                                      | `seriea`      |
| Ligue 1                                      | `ligue1`      |
| Major League Soccer                          | `mls`         |
| UEFA Champions League                        | `uefa`        |
| UEFA Europa League                           | `europa`      |
| UEFA Europa Conference League                | `conference`  |
| FIFA World Cup                               | `worldcup`    |

**NCAA Men's Sports:**

| Sport                     | Code      |
|---------------------------|-----------|
| NCAA Football             | `ncaaf`   |
| NCAA Men's Basketball     | `ncaam`   |
| NCAA Ice Hockey (Men's)   | `ncaah`   |
| NCAA Soccer (Men's)       | `ncaas`   |
| NCAA Baseball             | `ncaabb`  |
| NCAA Lacrosse (Men's)     | `ncaalax` |
| NCAA Volleyball (Men's)   | `ncaavb`  |
| NCAA Water Polo (Men's)   | `ncaawp`  |

**NCAA Women's Sports:**

| Sport                       | Code       |
|-----------------------------|------------|
| NCAA Women's Basketball     | `ncaaw`    |
| NCAA Ice Hockey (Women's)   | `ncaawh`   |
| NCAA Soccer (Women's)       | `ncaaws`   |
| NCAA Softball               | `ncaasbw`  |
| NCAA Lacrosse (Women's)     | `ncaawlax` |
| NCAA Volleyball (Women's)   | `ncaawvb`  |
| NCAA Water Polo (Women's)   | `ncaawwp`  |
| NCAA Field Hockey (Women's) | `ncaawfh`  |

---

### NCAA Shorthand Route

**Endpoint:** `/ncaa/:sport/:team1/:team2/:type`

A convenience endpoint for NCAA sports that uses sport names instead of league codes.

**Parameters:**
- `sport` - NCAA sport identifier (see table below)
- `team1` - First team (name, city, or abbreviation) *(optional for `leaguelogo`)*
- `team2` - Second team (name, city, or abbreviation) *(only required for matchup types)*
- `type` - Image type: `thumb`, `cover`, `logo`, `teamlogo`, or `leaguelogo` (`.png` extension optional)

**Supported NCAA Sports:**

| Primary Sport | Additional Aliases | Maps to League |
|---------------|-------------------|----------------|
| `football` | `footballm` | `ncaaf` |
| `basketball` | `basketballm`, `march-madness` | `ncaam` |
| `hockey` | `ice-hockey`, `hockeym`, `ice-hockeym` | `ncaah` |
| `soccer` | `soccerm` | `ncaas` |
| `baseball` | `baseballm` | `ncaabb` |
| `lacrosse` | `lacrossem`, `mens-lacrosse` | `ncaalax` |
| `volleyball` | `volleyballm`, `mens-volleyball` | `ncaavb` |
| `water-polo` | `waterpolo`, `waterpolom`, `mens-water-polo` | `ncaawp` |
| `womens-basketball` | `basketballw`, `womens-college-basketball` | `ncaaw` |
| `womens-hockey` | `hockeyw`, `womens-college-hockey` | `ncaawh` |
| `womens-soccer` | `soccerw`, `womens-college-soccer` | `ncaaws` |
| `softball` | `softballw`, `womens-softball` | `ncaasbw` |
| `womens-lacrosse` | `lacrossew`, `womens-college-lacrosse` | `ncaawlax` |
| `womens-volleyball` | `volleyballw`, `womens-college-volleyball` | `ncaawvb` |
| `womens-water-polo` | `waterpolow`, `womens-college-water-polo` | `ncaawwp` |
| `field-hockey` | `fieldhockey`, `womens-field-hockey`, `womens-college-field-hockey` | `ncaawfh` |

**Examples:**
```
GET /ncaa/football/alabama/georgia/thumb
GET /ncaa/basketball/duke/unc/cover
GET /ncaa/hockey/minnesota/wisconsin/logo
GET /ncaa/womens-basketball/uconn/south-carolina/thumb?style=2
GET /ncaa/baseball/vanderbilt/mississippi-state/thumb
GET /ncaa/softball/oklahoma/alabama/cover
GET /ncaa/lacrosse/duke/north-carolina/logo
GET /ncaa/womens-volleyball/stanford/nebraska/thumb
GET /ncaa/field-hockey/north-carolina/duke/cover
GET /ncaa/football/alabama/teamlogo
GET /ncaa/basketball/duke/teamlogo?variant=dark
GET /ncaa/football/leaguelogo
GET /ncaa/womens-basketball/leaguelogo.png
```

**Note:** This endpoint forwards to the standard league endpoints, so all query parameters work the same way.

---

### Thumbnail Generation

**Endpoint:** `/:league/:team1/:team2/thumb[.png]`

Generates a landscape matchup thumbnail with diagonal split layout.

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

**Query Parameters:**
- `style` - Style number (default: `1`)
  - `1` - Diagonal split with team colors
  - `2` - Gradient blend between team colors
  - `3` - Minimalist badge with team circles and VS text (light background)
  - `4` - Minimalist badge with team circles and VS text (dark background)
- `logo` - Show league logo (default: `true`, set to `false` to hide)
- `fallback` - Return league thumbnail if teams not found (default: `false`, set to `true` to enable)

**Examples:**
```
GET /nba/lakers/celtics/thumb
GET /nhl/toronto/montreal/thumb?logo=false
GET /nfl/chiefs/49ers/thumb?style=2
GET /ncaaf/alabama/georgia/thumb?style=3
GET /mlb/yankees/redsox/thumb?style=4&logo=false
GET /nba/invalidteam/anotherteam/thumb?fallback=true
```

**Output:** 1440x1080 PNG image (4:3 aspect ratio)

---

### Cover Generation

**Endpoint:** `/:league/:team1/:team2/cover[.png]`

Generates a vertical matchup cover with horizontal split.

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

**Query Parameters:**
- `style` - Style number (default: `1`)
  - `1` - Horizontal split with team colors
  - `2` - Gradient blend between team colors
  - `3` - Minimalist badge with team circles and VS text (light background)
  - `4` - Minimalist badge with team circles and VS text (dark background)
- `logo` - Show league logo (default: `true`, set to `false` to hide)
- `fallback` - Return league cover if teams not found (default: `false`, set to `true` to enable)

**Examples:**
```
GET /nba/lakers/celtics/cover
GET /nhl/toronto/montreal/cover?logo=false
GET /nfl/chiefs/49ers/cover?style=2
GET /mlb/yankees/redsox/cover?style=3
GET /ncaam/duke/unc/cover?style=4&logo=false
GET /nfl/badteam/faketeam/cover?fallback=true
```

**Output:** 1080x1440 PNG image (3:4 aspect ratio)

---

### Logo Generation

**Endpoint:** `/:league/:team1/:team2/logo[.png]`

Generates a matchup logo with team logos on transparent background.

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

**Query Parameters:**
- `style` - Style number (default: `1`)
  - `1` - Diagonal split with dividing line
  - `2` - Side by side
  - `3` - Circle badges with team colors (league logo overlays bottom)
  - `4` - Square badges with team colors (league logo overlays bottom)
  - `5` - Circle badges with league logo on left (white background, league logo required)
  - `6` - Square badges with league logo on left (white background, league logo required)
- `size` - Output size in pixels: `256`, `512`, `1024`, or `2048` (default: `800`)
- `logo` - Show league logo badge (default: `true`, set to `false` to hide; always `true` for styles 5-6)
- `useLight` - Use primary (light) logos instead of dark variants (default: `false`)
- `trim` - Trim transparent edges (default: `true`)
- `fallback` - Return raw league logo if teams not found (default: `false`, set to `true` to enable)

**Examples:**
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

**Output:** PNG image with transparent background (square, size based on `size` parameter)

**Notes:** 
- For styles 3 and 4, the logo variant (regular or alternate) is automatically selected for best contrast against the background color. The `useLight` parameter is ignored for these styles.
- Styles 5 and 6 require the league logo and will ignore the `logo` parameter (always treated as `true`). The league logo is placed on a white background on the left, with team logos following.
- Styles 5 and 6 automatically select the best league logo variant (default or dark) based on contrast against the white background.
- In style 5, circles overlap by up to 5% to maximize size while preventing edge clipping.

---

### Team Logo (Raw)

**Endpoint:** `/:league/:team/teamlogo[.png]`

Returns the raw team logo image directly from the provider (proxied through the server).

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))
- `team` - Team identifier (name, city, or abbreviation)

**Query Parameters:**
- `variant` - Logo variant (optional)
  - `light` - Primary/default logo (default)
  - `dark` - Dark variant logo (if available, otherwise falls back to light)

**Examples:**
```
GET /nba/lakers/teamlogo
GET /nfl/chiefs/teamlogo.png
GET /nhl/toronto/teamlogo?variant=dark
GET /ncaaf/alabama/teamlogo?variant=light
GET /mlb/yankees/teamlogo
```

**Output:** PNG image (original resolution from provider)

**Notes:**
- Images are cached using the same 24-hour cache system as other endpoints
- If a dark variant is requested but not available, the light variant is returned
- The image is proxied through the server to ensure compatibility with all clients

---

### League Logo (Raw)

**Endpoint:** `/:league/leaguelogo[.png]`

Returns the raw league logo image directly from the provider (proxied through the server).

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))

**Query Parameters:**
- `variant` - Logo variant (optional)
  - `light` - Primary/default logo (default)
  - `dark` - Dark variant logo (default for most leagues, if available)

**Examples:**
```
GET /nba/leaguelogo
GET /nfl/leaguelogo.png
GET /epl/leaguelogo?variant=dark
GET /ncaaf/leaguelogo?variant=light
GET /mls/leaguelogo
```

**Output:** PNG image (original resolution from provider)

---

### League Thumbnail

**Endpoint:** `/:league/leaguethumb[.png]`

Generates a landscape thumbnail featuring the league logo centered on a moody dark gradient background with subtle hints of the league's brand colors.

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))

**Examples:**
```
GET /nba/leaguethumb
GET /nfl/leaguethumb.png
GET /ncaaf/leaguethumb
GET /mls/leaguethumb
```

**Output:** 1440x1080 PNG image (4:3 aspect ratio)

**Notes:**
- Uses a moody dark gradient background with subtle hints of the league's brand colors (when vibrant colors are detected)
- The logo is displayed large and centered (60% of the smaller dimension)
- A subtle drop shadow is applied to the logo for depth
- Automatically selects the best logo variant (light/dark) based on contrast with the background

---

### League Cover

**Endpoint:** `/:league/leaguecover[.png]`

Generates a portrait cover featuring the league logo centered on a moody dark gradient background with subtle hints of the league's brand colors.

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))

**Examples:**
```
GET /nba/leaguecover
GET /nfl/leaguecover.png
GET /ncaaf/leaguecover
GET /mls/leaguecover
```

**Output:** 1080x1440 PNG image (3:4 aspect ratio)

**Notes:**
- Identical to league thumbnail but in portrait orientation
- Uses the same moody dark gradient with brand color hints
- Perfect for vertical/portrait displays and mobile screens

---

### Raw Team Data

**Endpoint:** `/:league/:team/raw`

Returns raw JSON data for a team from the provider.

**Parameters:**
- `league` - Sport league code (see [Supported Leagues](#supported-leagues))
- `team` - Team identifier (name, city, or abbreviation)

**Examples:**
```
GET /nba/lakers/raw
GET /nfl/chiefs/raw
GET /ncaaf/alabama/raw
```

**Output:** JSON object containing:
```json
{
  "id": "13",
  "city": "Los Angeles",
  "name": "Lakers",
  "fullName": "Los Angeles Lakers",
  "abbreviation": "LAL",
  "conference": "Western Conference",
  "division": "Pacific Division",
  "logo": "https://a.espncdn.com/i/teamlogos/nba/500/lal.png",
  "logoAlt": "https://a.espncdn.com/i/teamlogos/nba/500-dark/lal.png",
  "color": "#552583",
  "alternateColor": "#FDB927"
}
```

---

## Team Matching

The API uses intelligent team matching with weighted scoring to find teams flexibly.

### Matching Priority (Highest to Lowest):
1. **Abbreviation** - e.g., `LAL`, `BOS`, `NYY`
2. **Team Nickname** - e.g., `Lakers`, `Celtics`, `Yankees`
3. **Short Display Name** - e.g., `LA Lakers`, `Boston`
4. **Full Display Name** - e.g., `Los Angeles Lakers`
5. **Location/City** - e.g., `Los Angeles`, `Boston`, `New York`
6. **Partial Matches** - Fuzzy matching for convenience

### Examples:
```
/nba/lakers/celtics/thumb          ✓ Team nicknames
/nba/los%20angeles/boston/thumb    ✓ Cities (URL encoded)
/nba/LAL/BOS/thumb                 ✓ Abbreviations
/nfl/chiefs/49ers/thumb            ✓ Mixed formats
/ncaaf/alabama/georgia/thumb       ✓ Works with NCAA too
```

### NCAA Women's Sports Fallback

Women's NCAA sports automatically fall back to men's teams when a team is not found:
- Women's Basketball → Men's Basketball
- Women's Hockey → Men's Hockey
- Women's Soccer → Men's Soccer
- Women's Lacrosse, Volleyball, Water Polo, Softball, Field Hockey → Football

This ensures maximum compatibility when teams don't have dedicated women's programs.

---

## Data Sources

All team data is fetched dynamically from **ESPN's public APIs**.

### Team Information

The following data is retrieved for each team:
- Team names, cities, and abbreviations
- Conference and division information
- Official team logos (high resolution, with dark variants when available)
- Primary and alternate team colors (hex codes)
- Automatic color extraction from logos when ESPN doesn't provide colors

### ESPN API Endpoints

**Professional Leagues:**
- NBA: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams`
- WNBA: `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams`
- NFL: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
- UFL: `https://site.api.espn.com/apis/site/v2/sports/football/ufl/teams`
- MLB: `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams`
- NHL: `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams`
- EPL: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams`
- MLS: `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams`
- UEFA: `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/teams`

**NCAA Sports:**
- Football: `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams`
- Men's Basketball: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams`
- Women's Basketball: `https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/teams`
- Men's Ice Hockey: `https://site.api.espn.com/apis/site/v2/sports/hockey/mens-college-hockey/teams`
- Women's Ice Hockey: `https://site.api.espn.com/apis/site/v2/sports/hockey/womens-college-hockey/teams`
- Men's Soccer: `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.m.1/teams`
- Women's Soccer: `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.w.1/teams`
- Baseball: `https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/teams`
- Softball: `https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/teams`
- Men's Lacrosse: `https://site.api.espn.com/apis/site/v2/sports/lacrosse/mens-college-lacrosse/teams`
- Women's Lacrosse: `https://site.api.espn.com/apis/site/v2/sports/lacrosse/womens-college-lacrosse/teams`
- Men's Volleyball: `https://site.api.espn.com/apis/site/v2/sports/volleyball/mens-college-volleyball/teams`
- Women's Volleyball: `https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/teams`
- Men's Water Polo: `https://site.api.espn.com/apis/site/v2/sports/water-polo/mens-college-water-polo/teams`
- Women's Water Polo: `https://site.api.espn.com/apis/site/v2/sports/water-polo/womens-college-water-polo/teams`
- Women's Field Hockey: `https://site.api.espn.com/apis/site/v2/sports/field-hockey/womens-college-field-hockey/teams`

### League Logos

- Professional leagues: Fetched from ESPN API or ESPN CDN
- NCAA sports: Custom logos from `https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/`

### Caching Strategy

- **Team Data**: Cached for 24 hours to minimize API calls
- **Extracted Colors**: Cached for 24 hours per team (only extracted once when missing from ESPN)
- **Generated Images**: Cached for 24 hours based on content hash
- **Automatic Cleanup**: Expired cache entries are automatically removed

---

### Server Info

Get server version and git information:

```
GET /info
```

**Example Response:**

```json
{
  "name": "Game Thumbs API",
  "git": {
    "branch": "main",
    "commit": "a1b2c3d",
    "tag": "v0.0.1"
  }
}
```

If the working tree has uncommitted changes, `dirty: true` will be included in the git object. If not in a git repository, the `git` field will be `null`.

---

## Technical Details

### Color Extraction

When ESPN doesn't provide team colors, the service automatically:
1. Downloads the team's logo
2. Analyzes pixel data to find dominant colors
3. Filters out neutral/grayscale colors
4. Ensures selected colors are visually distinct
5. Caches the results for 24 hours

Default fallback: Primary = `#000000` (black), Alternate = `#ffffff` (white)

### Image Generation

- **Canvas-based rendering** using Node.js `canvas` library
- **Aspect ratio preservation** for all league logos
- **Multiple visual styles** with team colors and logos
- **Drop shadows and outlines** for better visibility
- **Smart logo selection** (dark variants on light backgrounds, light on dark)

---

## License

MIT

## Attribution

This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.