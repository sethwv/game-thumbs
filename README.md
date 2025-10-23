### **Note:** This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.

# Game Thumbs

A simple API that generates and serves various sports matchup thumbnails and logos dynamically.

## Features

- 🏀 **Multi-Sport Support**: NBA, NFL, MLB, NHL, NCAA Football, NCAA Basketball
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

All endpoints support:
- Six major sports leagues: NBA, NFL, MLB, NHL, NCAA Football, NCAA Basketball
- Flexible team matching (names, cities, abbreviations)
- Optional league logo display
- Multiple style variations

---

### Thumbnail Generation

**Endpoint:** `/:league/:team1/:team2/thumb[.png]`

Generates a horizontal matchup thumbnail with vertical diagonal split.

*Note: The `.png` extension is optional*

**Parameters:**
- `league` - Sport league (nba, nfl, mlb, nhl, ncaaf, ncaab)
- `team1` - First team (name, city, or abbreviation)
- `team2` - Second team (name, city, or abbreviation)

**Query Parameters:**
- `style` - Style number (default: 1)
  - `1` - Diagonal split with team colors
- `logo` - Show league logo in center (true/false)

**Examples:**
```
GET /nba/lakers/celtics/thumb
GET /nhl/toronto/montreal/thumb?logo=true
GET /nfl/chiefs/49ers/thumb
GET /ncaaf/alabama/georgia/thumb?logo=true
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
- `logo` - Show league logo in center (true/false)

**Examples:**
```
GET /nba/lakers/celtics/cover
GET /nhl/toronto/montreal/cover?logo=true
GET /nfl/chiefs/49ers/cover
GET /mlb/yankees/redsox/cover?logo=true
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
- `size` - Output size in pixels (256, 512, 1024, 2048) - generates square image
- `logo` - Show league logo badge (true/false)

**Examples:**
```
GET /nba/lakers/celtics/logo
GET /nhl/toronto/montreal/logo?style=2
GET /nfl/chiefs/49ers/logo?style=1&logo=true
GET /mlb/yankees/redsox/logo?style=2&logo=true&size=2048
```

**Output:** 800x800 PNG image (transparent background)

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
- NCAA Basketball: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams`

### League Logos
- ESPN CDN: `https://a.espncdn.com/i/teamlogos/leagues/500/{league}.png`

### Caching
- Team data is cached for 24 hours to minimize API calls
- Generated images are cached for 24 hours based on content hash
- Expired cache entries are automatically cleaned up
