---
layout: default
title: League Cover
parent: API Reference
nav_order: 8
---

# League Cover

**Endpoint:** `/:league/leaguecover[.png]`

Generates a portrait cover featuring the league logo centered on a moody dark gradient background with subtle hints of the league's brand colors.

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))

---

## Examples

```
GET /nba/leaguecover
GET /nfl/leaguecover.png
GET /ncaaf/leaguecover
GET /mls/leaguecover
```

---

## Output

1080x1440 PNG image (3:4 aspect ratio)

---

## Notes

- Identical to league thumbnail but in portrait orientation
- Uses the same moody dark gradient with brand color hints
- Perfect for vertical/portrait displays and mobile screens
