---
layout: default
title: Team Logo
parent: API Reference
nav_order: 5
---

# Team Logo

**Endpoint:** `/:league/:team/teamlogo[.png]`

Returns the raw team logo image directly from the provider (proxied through the server).

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team` - Team identifier (name, city, or abbreviation)

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | string | `light` | Logo variant: `light` or `dark` |

---

## Examples

```
GET /nba/lakers/teamlogo
GET /nfl/chiefs/teamlogo.png
GET /nhl/toronto/teamlogo?variant=dark
GET /ncaaf/alabama/teamlogo?variant=light
GET /mlb/yankees/teamlogo
```

---

## Output

PNG image (original resolution from provider)

---

## Notes

- Images are cached using the same 24-hour cache system
- If a dark variant is requested but not available, the light variant is returned
- The image is proxied through the server to ensure compatibility with all clients
