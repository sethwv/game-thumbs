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

Game Thumbs is a Node.js Express application that dynamically generates sports matchup thumbnails and logos using team data from ESPN's public APIs.

### Key Components

- **Express Server**: HTTP server handling API requests
- **Provider System**: Modular data provider architecture (currently ESPN only)
- **Team Matching**: Intelligent fuzzy matching with weighted scoring
- **Image Generation**: Canvas-based rendering with multiple visual styles
- **Caching System**: Multi-layer caching for performance optimization
- **Color Extraction**: Automatic dominant color detection from logos

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

And many more. See `teamMatchingUtils.js` for the complete list.

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

### ESPN APIs

All team data is fetched from ESPN's public APIs:

**Professional Leagues:**
```
https://site.api.espn.com/apis/site/v2/sports/{sport}/{slug}/teams
```

**Examples:**
- NBA: `/sports/basketball/nba/teams`
- NFL: `/sports/football/nfl/teams`
- EPL: `/sports/soccer/eng.1/teams`
- MLS: `/sports/soccer/usa.1/teams`

**NCAA Leagues:**
```
https://site.api.espn.com/apis/site/v2/sports/{sport}/{slug}/teams
```

**Examples:**
- NCAAF: `/sports/football/college-football/teams`
- NCAAM: `/sports/basketball/mens-college-basketball/teams`
- NCAAW: `/sports/basketball/womens-college-basketball/teams`

### Team Data Structure

ESPN provides:
- Team ID and slug
- Display names (full, short, nickname)
- Location/city information
- Official abbreviations
- Team logos (multiple variants)
- Team colors (primary and alternate)
- Conference and division data

### League Logos

**Professional Leagues:**
- Fetched from ESPN API or ESPN CDN
- Format: `https://a.espncdn.com/i/teamlogos/leagues/500/{league}.png`

**NCAA Sports:**
- Hosted on NCAA.com
- Format: `https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/{sport}.png`

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

Set `fallback=true` query parameter to return league thumbnail/cover/logo instead of an error:

```
GET /nba/invalidteam/fake team/thumb?fallback=true
```

Returns the NBA league thumbnail instead of an error.

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

- Additional data providers (beyond ESPN)
- More visual styles and customization options
- Image format options (JPEG, WebP, SVG)
- Persistent cache storage (Redis, filesystem)
- Advanced team matching with ML/AI
- Historical data and archive support
- Real-time game score integration
- Custom font and typography options
