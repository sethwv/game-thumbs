---
layout: default
title: Raw Team Data
parent: API Reference
nav_order: 9
---

# Raw Team Data

**Endpoint:** `/:league/:team/raw`

Returns raw JSON data for a team from the provider.

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))
- `team` - Team identifier (name, city, or abbreviation)

---

## Examples

```
GET /nba/lakers/raw
GET /nfl/chiefs/raw
GET /ncaaf/alabama/raw
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
