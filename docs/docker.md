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
- When `RATE_LIMIT_PER_MINUTE=0`, there are no request limits (use with caution in production)

### Logging

| Variable | Description | Default |
|----------|-------------|---------|
| `SHOW_TIMESTAMP` | Whether to show timestamps in logs. Set to `false` to hide timestamps. | `true` |
| `FORCE_COLOR` | Force colored output in logs (useful for Docker/CI environments). Set to `1` or `true` to enable. | `false` |
| `LOG_TO_FILE` | Enable file logging. Set to `true` or `1` to enable. | `false` |
| `MAX_LOG_FILES` | Maximum number of log files to keep (oldest are deleted). | `10` |

**Notes:**
- When `LOG_TO_FILE=true`, logs are written to files in `./logs` directory with automatic rotation (~100KB per file)
- Log files are named `app-YYYY-MM-DD-NNN.log` and old files are automatically cleaned up
- File logs always include full timestamps and stack traces (regardless of console settings)

### CORS

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed CORS origin(s). Set to `*` for all origins, or a specific domain like `https://example.com`. | `*` |
| `CORS_MAX_AGE` | How long (in seconds) browsers should cache CORS preflight requests. | `86400` (24 hours) |

---

## Volume Mounts

### Custom Team Overrides

Mount a custom `teams.json` file to add team aliases and override team data:

```bash
docker run -p 3000:3000 \
  -v /path/to/your/teams.json:/app/teams.json:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

Replace `/path/to/your/teams.json` with the absolute path to your custom `teams.json` file. The `:ro` flag makes it read-only.

**Example `teams.json`:**
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

See the [Team Matching](team-matching.html) documentation for complete details on the file structure and all available options.

### Persistent Logs

Mount a volume to persist log files:

```bash
docker run -p 3000:3000 \
  -e LOG_TO_FILE=true \
  -v /path/to/logs:/app/logs \
  ghcr.io/sethwv/game-thumbs:latest
```

---

## Example Configurations

### Production Setup

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
  -v /path/to/teams.json:/app/teams.json:ro \
  -v /path/to/logs:/app/logs \
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
      - ./teams.json:/app/teams.json:ro
      - ./logs:/app/logs
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

### Team Override Not Loading

Ensure your `teams.json` file:
- Is valid JSON
- Uses the correct file path in the volume mount
- Has the correct league keys (lowercase)
- Uses proper team slugs (check via `/raw` endpoint)

Check container logs for errors:
```bash
docker logs <container-id>
```
