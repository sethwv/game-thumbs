---
layout: default
title: Technical Details
nav_order: 6
---

# Technical Details
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Architecture Overview

Game Thumbs is a Node.js Express application that dynamically generates sports matchup thumbnails and logos using team and athlete data from multiple providers (ESPN, TheSportsDB, HockeyTech).

### Key Components

- **Express Server**: HTTP server handling API requests
- **Provider System**: Modular data provider architecture with multiple providers
- **Team Matching**: Intelligent fuzzy matching with weighted scoring
- **Image Generation**: Canvas-based rendering with multiple visual styles
- **Caching System**: Multi-layer caching for performance optimization
- **Color Extraction**: Automatic dominant color detection from logos

---

## Data Providers

Game Thumbs uses a modular provider architecture to fetch team and athlete data from multiple sources.

### ESPN Provider

**Leagues**: NBA, NFL, MLB, NHL, NCAA, Soccer, and more  
**Type**: Team-based sports  
**Features**:
- Fetches team rosters, logos, and colors from ESPN's public APIs
- Supports 30+ professional and NCAA leagues
- 24-hour team data caching
- Automatic logo and color extraction

### ESPN Athlete Provider

**Leagues**: UFC, PFL, Bellator (combat sports)  
**Type**: Athlete-based sports  
**Features**:
- Treats individual fighters/athletes as "teams" for matchup generation
- Fetches complete athlete rosters from ESPN MMA APIs
- 72-hour athlete data caching with automatic background refresh
- Smart athlete matching by first name, last name, or full name
- Randomly assigned dark color palettes (avoids skin tone bias)
- Headshot images used as athlete "logos"
- Supports 600+ UFC fighters, 200+ PFL fighters, 300+ Bellator fighters

**Cache Auto-Refresh**: The ESPN Athlete provider automatically refreshes athlete rosters at 95% of cache duration (68.4 hours) to ensure data stays fresh without requiring manual intervention or server restarts.

### TheSportsDB Provider

**Leagues**: CFL, AHL, OHL, WHL, QMJHL, and international soccer  
**Type**: Team-based sports  
**Features**:
- Community-maintained sports database
- Good coverage for non-US leagues
- Team colors, logos, and basic information
- 24-hour team data caching

### HockeyTech Provider

**Leagues**: PWHL, CHL, OHL, WHL  
**Type**: Team-based sports (hockey)  
**Features**:
- Official provider for Canadian hockey leagues
- Real-time roster data
- High-quality team information
- 24-hour team data caching

### FlagCDN Provider

**Leagues**: Country, Olympics  
**Type**: International country-based matchups  
**Features**:
- High-resolution flag images (2560px) from flagcdn.com
- ISO 3166 alpha-2 and alpha-3 code support (USA, CAN, GBR, etc.)
- Olympic/sports team codes (ROC, OAR, AOR, RPC)
- UK home nations support (ENG, SCT, WAL, NIR)
- Custom color extraction without filtering white colors
- Desaturation (40%) and darkening (30%) for better thumbnail backgrounds
- White color replacement (uses non-white color for both if either is white)
- 7-day caching for country data and extracted colors
- Smart country matching with weighted scoring

**Country Resolution**: Matches country names, aliases, and ISO codes using intelligent scoring:
- ISO 3-letter codes: 1.0 weight (highest priority)
- Exact name matches: 0.9 weight
- Partial name matches: 0.5-0.8 weight based on similarity

---

## Provider System

### Automatic Provider Discovery

Game Thumbs automatically discovers and registers all providers from the `providers/` directory at startup. No manual registration required.

**How it works:**
1. Scans `providers/` directory for `*Provider.js` files
2. Excludes `BaseProvider.js` (abstract base class)
3. Automatically instantiates and registers each provider
4. Maps supported leagues to providers

**Adding New Providers:**
1. Create a new file in `providers/` following the naming convention: `YourNameProvider.js`
2. Extend `BaseProvider` and implement required methods:
   - `getProviderId()`: Return unique provider identifier
   - `resolveTeam()`: Implement team/athlete resolution logic
   - `getLeagueLogoUrl()`: Implement league logo fetching
3. Provider is automatically loaded on server restart

**Provider Inference:**
The system automatically infers which provider to use based on the configuration object keys:
- `{ espn: {...} }` → ESPN Provider
- `{ theSportsDB: {...} }` → TheSportsDB Provider
- `{ hockeytech: {...} }` → HockeyTech Provider
- `{ espnAthlete: {...} }` → ESPN Athlete Provider
- `{ flagcdn: {...} }` → FlagCDN Provider

No hardcoded provider lists to maintain!

---

## Image Generation

### Canvas Rendering

Images are generated using the Node.js `canvas` library, which provides a Cairo-backed implementation of the HTML5 Canvas API.

**Features:**
- Server-side image rendering
- Support for multiple image formats (PNG, JPEG)
- Text rendering with custom fonts
- Image compositing and transformations
- Gradient fills and patterns

### Visual Styles

#### Thumbnail & Cover Styles

- **Style 1**: Diagonal/horizontal split with team colors
- **Style 2**: Gradient blend between team colors
- **Style 3**: Minimalist badge with team circles (light background)
- **Style 4**: Minimalist badge with team circles (dark background)

#### Logo Styles

- **Style 1**: Diagonal split with dividing line
- **Style 2**: Side by side arrangement
- **Style 3**: Circle badges with team colors (league logo overlay)
- **Style 4**: Square badges with team colors (league logo overlay)
- **Style 5**: Circle badges with league logo on left (white background)
- **Style 6**: Square badges with league logo on left (white background)

### Logo Selection

The system automatically selects the best logo variant for each context:

- **Dark backgrounds**: Uses light/default logos
- **Light backgrounds**: Uses dark variant logos when available
- **Team color backgrounds**: Selects variant with best contrast

### Aspect Ratio Preservation

All league and team logos maintain their aspect ratio:
- Logos are scaled to fit within designated areas
- Transparent backgrounds are preserved
- No distortion or stretching occurs

---

## Color Extraction

When ESPN doesn't provide team colors, the system automatically extracts them from team logos.

### Process

1. **Download Logo**: Fetches the team logo image
2. **Analyze Pixels**: Processes pixel data to find dominant colors
3. **Filter Colors**: Removes neutral/grayscale colors
4. **Ensure Distinctness**: Verifies selected colors are visually distinct
5. **Cache Results**: Stores extracted colors for 24 hours

### Algorithm

- Uses k-means clustering to identify dominant colors
- Filters out colors with low saturation (grayscale)
- Ensures minimum color distance between primary and alternate colors
- Prioritizes vibrant, saturated colors

### Fallback

If color extraction fails or no vibrant colors are found:
- **Primary Color**: `#000000` (black)
- **Alternate Color**: `#ffffff` (white)

---

## Caching Strategy

The application implements multi-layer caching to optimize performance and reduce API calls.

### Team Data Cache

- **Duration**: 24 hours (configurable via `IMAGE_CACHE_HOURS`)
- **Scope**: Per league
- **Storage**: In-memory cache
- **Key Format**: `{league}_teams`

### Color Cache

- **Duration**: 24 hours
- **Scope**: Per team
- **Storage**: In-memory cache with size limits
- **Key Format**: `colors_{teamId}`
- **Max Size**: 1000 entries (oldest entries removed when exceeded)

### Image Cache

- **Duration**: 24 hours (configurable via `IMAGE_CACHE_HOURS`)
- **Scope**: Per unique image request
- **Storage**: In-memory buffer cache
- **Key Format**: Content-based hash of parameters

### Cache Invalidation

- Automatic cleanup of expired entries
- Manual cache clearing available via provider methods
- Restart server to clear all caches

---

## Team Matching System

### Normalization

Text is normalized for matching using two approaches:

1. **Standard Normalization**:
   - Remove accents and diacritical marks (e.g., "Montréal" → "Montreal")
   - Convert to lowercase
   - Replace non-alphanumeric characters with spaces
   - Collapse multiple spaces
   - Trim whitespace

2. **Compact Normalization**:
   - Remove accents and diacritical marks
   - Convert to lowercase
   - Remove all non-alphanumeric characters
   - No spaces (e.g., "Los Angeles" → "losangeles")

**Accent Handling**: The system uses Unicode NFD normalization to strip diacritical marks, allowing teams like "Atlético Madrid", "São Paulo", or "Montréal" to match with or without accents.

### Location Abbreviations

The system recognizes common location abbreviations:

| Abbreviation | Expansions |
|--------------|------------|
| `la` | Los Angeles, LA |
| `ny`, `nyc` | New York, NYC |
| `sf` | San Francisco, SF |
| `dc` | Washington, DC |
| `chi` | Chicago, Chi |
| `atl` | Atlanta, Atl |

And many more. See `teamUtils.js` for the complete list.

### Matching Scores

Teams are scored based on how well they match the input:

| Match Type | Score |
|------------|-------|
| Custom alias (exact) | 1000 |
| Abbreviation (exact) | 1000 |
| Team name (exact) | 900 |
| Short display name (exact) | 850 |
| Full name (exact) | 800 |
| City (exact) | 700 |
| Location+Team concatenation | 950 |
| Team name (partial contains) | 400 |
| City (partial) | 100 |

The team with the highest score is selected. Teams with zero score are rejected.

### Special Cases

- **Location prefixes**: "losangelesfc" matches "LAFC" (LA + FC)
- **Flexible spacing**: "Man Utd" matches "manutd"
- **Case insensitive**: "LAKERS" matches "lakers"
- **Accent insensitive**: "Atlético" matches "Atletico", "Montréal" matches "Montreal"
- **Unicode normalization**: All diacritical marks are stripped during matching

---

## Route Loading System

### Priority-Based Loading

Routes are loaded in a specific order to prevent conflicts between similar patterns:

1. **Priority Routes**: Routes with an explicit `priority` field are loaded first (lower numbers = higher priority)
2. **Alphabetical Routes**: Routes without a priority field are loaded alphabetically

**Example:**
```javascript
module.exports = {
    priority: 1,  // Load before other routes
    paths: ["/ncaa/:sport/:type"],
    method: "get",
    handler: async (req, res) => { ... }
}
```

### Why Priority Matters

The NCAA shorthand route (`/ncaa/:sport/:type`) needs to be registered before the unified routes (`/:league/:team1/:type`) to prevent the more generic pattern from matching NCAA requests first. The priority system ensures:

- NCAA routes are registered first (priority: 1)
- Other routes load alphabetically (no priority field = lowest priority)
- No route conflicts or unexpected matching

---

## Data Sources

Team and athlete data is fetched from multiple providers based on league configuration. See the **Data Providers** section above for details on each provider's API endpoints and data structure.

### League Logos

**ESPN Leagues:**
- Fetched from ESPN API or ESPN CDN
- Format: `https://a.espncdn.com/i/teamlogos/leagues/500/{league}.png`

**NCAA Sports:**
- Hosted on NCAA.com
- Format: `https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/{sport}.png`

**Custom Leagues:**
- Configured via `logoUrl` or `logoUrlDark` in league configuration

---

## Rate Limiting

### Configuration

- **Default**: 30 requests per minute per IP
- **Configurable**: Set `RATE_LIMIT_PER_MINUTE` environment variable
- **Disable**: Set `RATE_LIMIT_PER_MINUTE=0`

### Scope

- **Image Generation**: Rate limited at configured rate
- **Raw Data Endpoints**: 3x the image generation rate limit
- **Cached Requests**: Not rate limited (served from cache)

### Trust Proxy

Set `TRUST_PROXY` to the number of proxies between the internet and your app:
- **Local dev**: `0`
- **Behind one proxy**: `1`
- **Behind multiple proxies**: Number of proxy hops

This ensures accurate IP detection for rate limiting.

---

## Error Handling

### Team Not Found

When a team is not found, the API returns:

```json
{
  "error": "Team not found: '{input}' in {LEAGUE}. Available teams: {list}"
}
```

**Fallback Option:**

Set `fallback=true` query parameter to handle missing teams gracefully:

**Single Team Endpoints:**
```
GET /nba/invalidteam/thumb?fallback=true
```
Returns the NBA league thumbnail instead of an error.

**Matchup Endpoints:**
```
GET /nba/lakers/invalidteam/thumb?style=1&fallback=true
```
Generates the matchup using:
- Lakers logo and colors for team 1
- **Greyscale league logo (35% opacity) with light grey colors** (#d3d3d3) for the missing team
- The selected style and options are preserved

This allows matchup generation to continue even when one or both teams are not found, using a subtle placeholder that clearly indicates missing data while maintaining the overall design aesthetic.

### Timeout Handling

- **Request Timeout**: 10 seconds (configurable via `REQUEST_TIMEOUT`)
- **Server Timeout**: 30 seconds (configurable via `SERVER_TIMEOUT`)

Prevents hanging on slow/unresponsive external services.

### Development Mode

Set `NODE_ENV=development` for:
- Detailed error messages
- Full stack traces in responses
- Additional logging

---

## Performance Optimizations

### Image Caching

- Content-based cache keys (same parameters = same cached image)
- In-memory storage for fast retrieval
- Automatic cleanup of expired entries

### API Request Optimization

- Batch team data fetching (all teams per league in one request)
- 24-hour cache prevents repeated API calls
- Timeout handling prevents resource exhaustion

### Memory Management

- Color cache has size limits (max 1000 entries)
- Automatic cleanup of oldest entries when limit exceeded
- Efficient buffer management for images

---

## Logging

### Console Logging

- Colored output (configurable via `FORCE_COLOR`)
- Timestamps (configurable via `SHOW_TIMESTAMP`)
- Request logging with response times
- Error logging with stack traces (in development mode)

### File Logging

Enable with `LOG_TO_FILE=true`:

- **Location**: `./logs` directory
- **Format**: `app-YYYY-MM-DD-NNN.log`
- **Rotation**: ~100KB per file
- **Retention**: Configurable via `MAX_LOG_FILES` (default: 10)
- **Content**: Full timestamps and stack traces (always)

---

## CORS Configuration

- **Default**: Allow all origins (`*`)
- **Configurable**: Set `CORS_ORIGIN` to specific domain
- **Max Age**: 24 hours (configurable via `CORS_MAX_AGE`)

---

## Security Considerations

### Input Validation

- League codes validated against supported list
- Team identifiers sanitized before use
- Query parameters validated and typed

### Image Proxying

- Team and league logos are proxied through the server
- Prevents direct client access to external URLs
- Ensures consistent caching behavior

### Rate Limiting

- Prevents abuse and resource exhaustion
- IP-based limits with proxy support
- Separate limits for different endpoint types

---

## Future Enhancements

Potential areas for expansion:

- Additional combat sports (Boxing, Wrestling, etc.)
- More visual styles and customization options
- Image format options (JPEG, WebP, SVG)
- Persistent cache storage (Redis, filesystem)
- Advanced team matching with ML/AI
- Historical data and archive support
- Real-time game score integration
- Custom font and typography options
- Fighter statistics and rankings display
