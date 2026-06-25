---
layout: default
title: Health Check
parent: API Reference
nav_order: 11
---

# Health Check

**Endpoint:** `GET /health`

Returns server health status. Use this endpoint for uptime monitoring, load balancer health checks, and container orchestration readiness probes.

This endpoint is exempt from rate limiting and is always available, even when other endpoints are temporarily unavailable.

---

## Response

**Status:** `200 OK`

```json
{
  "status": "ok",
  "uptime": 3612.54,
  "memory": {
    "rss": 89456640,
    "heapTotal": 52428800,
    "heapUsed": 38291456,
    "external": 3145728,
    "arrayBuffers": 131072
  },
  "timestamp": "2024-05-01T12:34:56.789Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` when the server is running |
| `uptime` | number | Server uptime in seconds |
| `memory.rss` | number | Resident set size in bytes |
| `memory.heapTotal` | number | Total V8 heap allocated in bytes |
| `memory.heapUsed` | number | V8 heap currently in use in bytes |
| `memory.external` | number | Memory used by C++ objects bound to V8 objects |
| `memory.arrayBuffers` | number | Memory allocated for ArrayBuffers |
| `timestamp` | string | ISO 8601 timestamp of the response |

---

## Example

```bash
curl http://localhost:3000/health
```

### Docker healthcheck

The Docker image includes a built-in healthcheck using this endpoint:

```bash
docker inspect --format='{{json .State.Health}}' <container-name>
```

### Docker Compose readiness probe

```yaml
services:
  game-thumbs:
    image: ghcr.io/sethwv/game-thumbs:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```
