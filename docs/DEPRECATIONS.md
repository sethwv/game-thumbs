---
layout: default
title: Deprecations
nav_order: 10
---

# Deprecation Notices

This page lists deprecated features that still work but MAY be removed in a future major version.

---

## Deprecated Endpoints

### Legacy League-Specific Endpoints

The following endpoints have been consolidated into simplified, unified endpoints:

| Deprecated Endpoint | Replacement | Status |
|---------------------|-------------|--------|
| `/:league/leaguelogo[.png]` | `/:league/logo[.png]` | **Deprecated** |
| `/:league/leaguethumb[.png]` | `/:league/thumb[.png]` | **Deprecated** |
| `/:league/leaguecover[.png]` | `/:league/cover[.png]` | **Deprecated** |
| `/:league/:team/teamlogo[.png]` | `/:league/:team/logo[.png]` | **Deprecated** |

### Migration Guide

The new unified endpoints are simpler and more intuitive:

#### Before (Deprecated):
```
GET /nba/leaguelogo           # League logo
GET /nba/lakers/teamlogo      # Team logo  
GET /nba/leaguethumb          # League thumbnail
GET /nba/lakers/warriors/logo # Matchup logo
```

#### After (Recommended):
```
GET /nba/logo                 # League logo
GET /nba/lakers/logo          # Team logo
GET /nba/thumb                # League thumbnail
GET /nba/lakers/warriors/logo # Matchup logo (unchanged)
```

**Note:** For single team endpoints, `team1` can be used interchangeably in the URL path (e.g., `/nba/lakers/logo`).

### Benefits of New Endpoints

- **Simpler**: Fewer endpoint names to remember
- **Consistent**: Same pattern for league, team, and matchup images
- **Intuitive**: Path structure matches the content (league → team → matchup)

---

## NCAA Shorthand

The NCAA shorthand route continues to work with all endpoint types:

```
GET /ncaa/football/alabama/logo        # Team logo
GET /ncaa/basketball/thumb             # League thumbnail
GET /ncaa/football/ohio-state/thumb   # Team thumbnail
```

---

## Questions?

If you have questions about these changes, please [open an issue](https://github.com/sethwv/game-thumbs/issues) on GitHub.
