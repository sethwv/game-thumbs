---
layout: default
title: Docker Setup
nav_order: 2
---

# Docker Setup
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation

### Pull the Image

```bash
# Latest stable version (recommended for production)
docker pull ghcr.io/sethwv/game-thumbs:latest

# Development version (latest features, may be unstable)
docker pull ghcr.io/sethwv/game-thumbs:dev
```

### Basic Usage

Run the server on port 3000:

```bash
docker run -p 3000:3000 ghcr.io/sethwv/game-thumbs:latest
```

The API will be available at `http://localhost:3000`.

### Redirect Root to Documentation

Optionally redirect the root path (`/`) to your documentation site:

```bash
docker run -p 3000:3000 \
  -e ROOT_REDIRECT_URL=https://game-thumbs-docs.swvn.io/ \
  ghcr.io/sethwv/game-thumbs:latest
```

When enabled, visitors to `http://localhost:3000/` will be permanently redirected (301) to the specified URL.

### Build from Source

If you need a custom build or want to run the development version locally:

```bash
git clone https://github.com/sethwv/game-thumbs.git
cd game-thumbs
docker build -t game-thumbs .
docker run -p 3000:3000 game-thumbs
```

Or without Docker:

```bash
npm install
node src/index.js
```

Node.js 18+ is required. Canvas native dependencies must be installed first — see the [Contributing Guide](https://github.com/sethwv/game-thumbs/blob/main/CONTRIBUTING.md) for platform-specific setup.

---

## Environment Variables

Configure the server behavior using environment variables:

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`). In development, error stack traces are included in responses. | `production` |
| `SERVER_TIMEOUT` | Timeout for HTTP connections (in milliseconds). | `30000` |
| `REQUEST_TIMEOUT` | Timeout for external API calls and image downloads (in milliseconds). | `10000` |
| `ROOT_REDIRECT_URL` | Optional URL to redirect from root path (`/`) with a 301 permanent redirect. Useful for directing users to documentation. | Not set (disabled) |
| `ALLOW_CUSTOM_BADGES` | Allow custom badge parameter entries on matchup generation endpoints. | `false` |
| `ALLOW_EVENT_OVERLAYS` | Enable the league event overlay feature on `/:league/thumb` and `/:league/cover`. When `true`, the `title`, `subtitle`, and `iconurl` query parameters are honored, default fonts are loaded at startup, and per-league custom fonts are registered. When disabled, those query parameters are ignored. | `false` |
| `ALLOW_INSECURE_OVERLAY_URLS` | Controls whether `iconurl` may reference private/loopback/local addresses. `false` (default): only public DNS targets allowed. `true`: validation skipped entirely. Comma-separated list (e.g. `192.168.1.5,printer.local`): only those hostnames bypass validation, everything else is still checked. | `false` |

### Caching

| Variable | Description | Default |
|----------|-------------|---------|
| `IMAGE_CACHE_HOURS` | How long to cache generated images (in hours). Set to `0` to disable caching. | `24` |

**Note:** When `IMAGE_CACHE_HOURS=0`, every request generates a new image. Useful for testing but not recommended for production.

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_PER_MINUTE` | Maximum image generation requests per minute per IP. Set to `0` to disable rate limiting. | `30` |
| `TRUST_PROXY` | Number of proxy hops to trust for rate limiting (0 for local dev, 1+ for production behind proxies). | `2` |

**Notes:**
- Rate limiting only applies to uncached requests; cached images are served without limits
- General API endpoints (like `/raw`) have 3x the image generation rate limit
- Set `TRUST_PROXY` to the number of proxies between the internet and your app for accurate IP detection
- When `RATE_LIMIT_PER_MINUTE=0`, there are no request limits (use with caution if exposed to the internet)

### Logging

| Variable | Description | Default |
|----------|-------------|---------|
| `SHOW_TIMESTAMP` | Whether to show timestamps in logs. Set to `false` to hide timestamps. | `true` |
| `FORCE_COLOR` | Force colored output in logs (useful for Docker/CI environments). Set to `1` or `true` to enable. | `false` |
| `LOG_TO_FILE` | Enable file logging. Set to `true` or `1` to enable. | `false` |
| `MAX_LOG_FILES` | Maximum number of log files to keep (oldest are deleted). | `10` |

**Notes:**
- When `LOG_TO_FILE=true`, logs are written to `LOG_DIR` (default: `./logs`) with automatic rotation at `LOG_ROTATION_SIZE` bytes (~100KB)
- Log files are named `app-YYYY-MM-DD-NNN.log` and old files are automatically cleaned up
- File logs always include full timestamps and stack traces (regardless of console settings)
- See [Advanced: Logging](#advanced-logging) below to customize the log directory and rotation threshold

### CORS

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed CORS origin(s). Set to `*` for all origins, or a specific domain like `https://example.com`. | `*` |
| `CORS_MAX_AGE` | How long (in seconds) browsers should cache CORS preflight requests. | `86400` (24 hours) |

### League Feature Flags

Optional leagues can be enabled/disabled using environment variables. When disabled, these leagues will not initialize caches and will not be available via the API.

| Variable | Description | Default |
|----------|-------------|---------|
| `LEAGUES_ENABLE_TENNIS` | Enable tennis leagues (ATP, WTA). When enabled, initializes athlete cache (~33,800 athletes). | `false` |
| `LEAGUES_ENABLE_MMA` | Enable MMA/combat sports leagues (UFC, PFL, Bellator). When enabled, initializes athlete caches. | `false` |

**Example - Enable tennis:**
```bash
docker run -p 3000:3000 \
  -e LEAGUES_ENABLE_TENNIS=true \
  ghcr.io/sethwv/game-thumbs:latest
```

**Example - Enable both tennis and MMA:**
```bash
docker run -p 3000:3000 \
  -e LEAGUES_ENABLE_TENNIS=true \
  -e LEAGUES_ENABLE_MMA=true \
  ghcr.io/sethwv/game-thumbs:latest
```

{: .warning }
> **Athlete cache time:** Enabling `LEAGUES_ENABLE_TENNIS` or `LEAGUES_ENABLE_MMA` triggers a one-time cache build on first startup. Tennis (33,800+ athletes) takes **5-30 minutes**; MMA rosters are smaller but still benefit from persistence. Mount a `.cache` volume (see [Volume Mounts](#provider-cache-directory)) so subsequent restarts are instant.

**Notes:**
- These leagues are disabled by default to reduce startup time and memory usage
- When disabled, API requests to these leagues return a "league not found" error
- Athlete caches are not created when the league is disabled

### ESPN Athlete Provider Rate Limiting

Control the rate of requests to ESPN's athlete API to avoid rate limiting during cache initialization.

| Variable | Description | Default |
|----------|-------------|---------|
| `ESPN_ATHLETE_REQUEST_DELAY` | Minimum delay between ESPN athlete API requests (in milliseconds). | `250` |
| `ESPN_ATHLETE_MAX_CONCURRENT` | Maximum concurrent requests to ESPN athlete API. | `3` |

**Example - Faster cache initialization (may hit rate limits):**
```bash
docker run -p 3000:3000 \
  -e LEAGUES_ENABLE_TENNIS=true \
  -e ESPN_ATHLETE_REQUEST_DELAY=100 \
  -e ESPN_ATHLETE_MAX_CONCURRENT=5 \
  ghcr.io/sethwv/game-thumbs:latest
```

**Example - Conservative rate limiting (slower but safer):**
```bash
docker run -p 3000:3000 \
  -e LEAGUES_ENABLE_TENNIS=true \
  -e ESPN_ATHLETE_REQUEST_DELAY=500 \
  -e ESPN_ATHLETE_MAX_CONCURRENT=2 \
  ghcr.io/sethwv/game-thumbs:latest
```

**Notes:**
- Default settings (250ms delay, 3 concurrent) balance speed and reliability
- ESPN doesn't publish rate limits, but testing shows ~200-300 requests/min is safe
- If you encounter 403/429 errors, increase delay or decrease concurrency
- Request queue automatically handles pacing - no need for manual delays

### Advanced: Provider API Keys
{: #advanced-provider-api-keys }

Most upstream sports APIs (ESPN, MLB Stats, TheSportsDB, HockeyTech, FlagCDN, NCAA) are accessed
through Bullpen, an internal proxy that injects upstream credentials server-side — game-thumbs no
longer holds those keys itself. Bullpen access is required, not optional:

| Variable | Description | Default |
|----------|-------------|---------|
| `BULLPEN_BASE_URL` | Base URL of the Bullpen proxy (e.g. `https://bullpen.example.com`). | Required, no default |
| `BULLPEN_API_KEY` | Consumer API key for Bullpen, sent as `X-Bullpen-Key` on every proxied request. | Required, no default |
| `CBL_SUPABASE_API_KEY` | API key for the Supabase-backed CBL athlete provider (not yet proxied by Bullpen). When not set, this provider is inactive. | Not set (disabled) |

### Advanced: Logging
{: #advanced-logging }

Fine-tune where logs are stored and when files rotate:

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_DIR` | Directory where log files are written (absolute or relative path). | `./logs` |
| `LOG_ROTATION_SIZE` | Maximum size of a single log file in bytes before rotating to a new file. | `102400` (100 KB) |

**Example - Custom log directory:**
```bash
docker run -p 3000:3000 \
  -e LOG_TO_FILE=true \
  -e LOG_DIR=/var/log/game-thumbs \
  -e LOG_ROTATION_SIZE=524288 \
  -v /var/log/game-thumbs:/var/log/game-thumbs \
  ghcr.io/sethwv/game-thumbs:latest
```

### Advanced: Network and Proxy
{: #advanced-network-proxy }

Configure proxy routing and the scraper user-agent for deployments behind restricted networks:

| Variable | Description | Default |
|----------|-------------|---------|
| `SOCKS_PROXY` | SOCKS5 proxy URL (e.g. `socks5://user:pass@host:1080`). When set, eligible provider requests are routed through the proxy. Falls back to direct if the proxy is unreachable. | Not set (direct) |
| `SCRAPER_USER_AGENT` | User-agent string sent with browser-like scraping requests (e.g. for ESPN image scraping). | Chrome 124 on macOS |
| `HOCKEYTECH_PROXY_EXTRACT` | Route HockeyTech extract-endpoint requests through `SOCKS_PROXY`. Set to `true`, `1`, or `yes` to enable. | `false` |
| `HOCKEYTECH_PROXY_FEED` | Route HockeyTech feed-endpoint requests through `SOCKS_PROXY`. Set to `true`, `1`, or `yes` to enable. | `false` |

**Note:** `HOCKEYTECH_PROXY_EXTRACT` and `HOCKEYTECH_PROXY_FEED` are independent toggles so you can proxy only the endpoints that need it.

---

## Volume Mounts

### Custom Team and League Overrides

Game Thumbs supports **additive configuration** - your custom files merge with built-in data rather than replacing it. You only need to specify what you want to customize.

#### Directory-Based Configuration

Mount directories containing your custom JSON files. All `.json` files in each directory will be loaded and merged:

```bash
docker run -p 3000:3000 \
  -v /path/to/custom-teams:/app/json/teams:ro \
  -v /path/to/custom-leagues:/app/json/leagues:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

**Benefits:**
- Organize configurations into multiple files (e.g., `my-teams.json`, `ncaa-teams.json`)
- Easy to add/remove specific configuration sets
- Files are loaded in alphabetical order and merged together

**Example directory structure:**
```
custom-teams/
  ├── premier-league.json
  ├── ncaa-football.json
  └── my-favorites.json

custom-leagues/
  └── custom-leagues.json
```

**Example `teams.json` file:**
```json
{
  "epl": {
    "man-utd": {
      "aliases": ["man utd", "man u", "mufc"],
      "override": {
        "abbreviation": "MUN"
      }
    }
  }
}
```

**How merging works:**
- Your custom teams/leagues are merged with the built-in data
- For teams that exist in both, aliases are combined (duplicates removed)
- Your override values take precedence over built-in values
- You only need to include what you want to customize

See the [Team Matching](team-matching.html) and [Customization](customization.html) documentation for complete details.

### Persistent Logs

Mount a volume to persist log files:

```bash
docker run -p 3000:3000 \
  -e LOG_TO_FILE=true \
  -v /path/to/logs:/app/logs \
  ghcr.io/sethwv/game-thumbs:latest
```

### Provider Cache Directory

{: .important }
> **Recommended for Tennis and MMA:** Mount the `.cache` directory to persist athlete data across container restarts. Tennis has 33,800+ athletes and takes 5-30 minutes to cache initially; MMA rosters are smaller but also benefit. Persisting the cache makes restarts instant.

```bash
docker run -p 3000:3000 \
  -v /path/to/cache:/app/.cache \
  ghcr.io/sethwv/game-thumbs:latest
```

**Benefits:**
- Instant restarts - no need to re-fetch 33,800+ tennis athletes or MMA fighter rosters
- Preserves athlete data across container updates and restarts
- Reduces load on ESPN APIs
- Container updates don't lose cached data

---

## Example Configurations

### Production Setup with Custom Teams

```bash
docker run -d \
  --name game-thumbs \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e RATE_LIMIT_PER_MINUTE=60 \
  -e TRUST_PROXY=1 \
  -e CORS_ORIGIN=https://yourdomain.com \
  -e LOG_TO_FILE=true \
  -v /path/to/custom-teams:/app/json/teams:ro \
  -v /path/to/logs:/app/logs \
  -v /path/to/cache:/app/.cache \
  ghcr.io/sethwv/game-thumbs:latest
```

### Development Setup

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  -e RATE_LIMIT_PER_MINUTE=0 \
  -e IMAGE_CACHE_HOURS=0 \
  -e SHOW_TIMESTAMP=true \
  -e FORCE_COLOR=true \
  ghcr.io/sethwv/game-thumbs:dev
```

### Docker Compose

```yaml
version: '3.8'

services:
  game-thumbs:
    image: ghcr.io/sethwv/game-thumbs:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - RATE_LIMIT_PER_MINUTE=60
      - TRUST_PROXY=1
      - LOG_TO_FILE=true
    volumes:
      # Custom config directories (recommended — supports multiple files per type)
      - ./custom-teams:/app/json/teams:ro
      - ./custom-leagues:/app/json/leagues:ro
      # Alternative: mount single files instead
      # - ./teams.json:/app/teams.json:ro
      # - ./leagues.json:/app/leagues.json:ro
      - ./logs:/app/logs
      - ./cache:/app/.cache   # persist athlete cache (recommended for Tennis and MMA)
    restart: unless-stopped
```

---

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, map to a different host port:

```bash
docker run -p 8080:3000 ghcr.io/sethwv/game-thumbs:latest
```

The API will be available at `http://localhost:8080`.

### Rate Limit Issues

If you're hitting rate limits during development or testing:

```bash
docker run -p 3000:3000 \
  -e RATE_LIMIT_PER_MINUTE=0 \
  ghcr.io/sethwv/game-thumbs:latest
```

**Warning:** Disabling rate limits in production is not recommended.

### Timeout Issues

If you're experiencing timeouts with slow network connections:

```bash
docker run -p 3000:3000 \
  -e REQUEST_TIMEOUT=30000 \
  -e SERVER_TIMEOUT=60000 \
  ghcr.io/sethwv/game-thumbs:latest
```

### Custom Configuration Not Loading

Ensure your configuration files:
- Are valid JSON
- Use the correct file path in the volume mount
- Have the correct league keys (lowercase)
- Use proper team slugs (check via `/raw` endpoint)

Check container logs for merge confirmation messages:
```bash
docker logs <container-id>
```

**You should see:**
```
✓ Loaded base teams.json
✓ Loading 2 custom file(s) from json/teams/
  ✓ Merged my-teams.json
  ✓ Merged ncaa-teams.json
      {
        "espn": {
          "espnSlug": "custom",
          "espnSport": "football"
        }
      }
    ]
  }
}
```
