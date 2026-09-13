---
layout: default
title: Raw Team Data
parent: API Reference
nav_order: 9
---

# Raw Team Data

**Endpoint:** `/:league/:team/raw`

Returns raw JSON data for a team or a synthetic league team.

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team` - Team identifier (name, city, or abbreviation). A league's own short code, ESPN slug, or full name also resolves to a synthetic league team using that league's logo and colors.

---

## Examples

```bash
curl http://localhost:3000/nba/lakers/raw
curl http://localhost:3000/nfl/chiefs/raw
curl http://localhost:3000/ncaaf/alabama/raw
curl http://localhost:3000/nhl/nhl/raw
```

---

## Output

JSON object containing:

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
