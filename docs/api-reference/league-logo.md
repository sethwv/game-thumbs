---
layout: default
title: League Logo
parent: API Reference
nav_order: 6
---

# League Logo

**Endpoint:** `/:league/leaguelogo[.png]`

Returns the raw league logo image directly from the provider (proxied through the server).

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | string | `dark` | Logo variant: `light` or `dark` |

---

## Examples

```
GET /nba/leaguelogo
GET /nfl/leaguelogo.png
GET /epl/leaguelogo?variant=dark
GET /ncaaf/leaguelogo?variant=light
GET /mls/leaguelogo
```

---

## Output

PNG image (original resolution from provider)
