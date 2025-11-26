---
layout: default
title: League Thumbnail
parent: API Reference
nav_order: 7
---

# League Thumbnail

**Endpoint:** `/:league/leaguethumb[.png]`

Generates a landscape thumbnail featuring the league logo centered on a moody dark gradient background with subtle hints of the league's brand colors.

---

## Parameters

- `league` - Sport league code (see [Supported Leagues](supported-leagues.html))

---

## Examples

```
GET /nba/leaguethumb
GET /nfl/leaguethumb.png
GET /ncaaf/leaguethumb
GET /mls/leaguethumb
```

---

## Output

1440x1080 PNG image (4:3 aspect ratio)

---

## Notes

- Uses a moody dark gradient background with subtle hints of the league's brand colors
- The logo is displayed large and centered (60% of the smaller dimension)
- A subtle drop shadow is applied to the logo for depth
- Automatically selects the best logo variant (light/dark) based on contrast
