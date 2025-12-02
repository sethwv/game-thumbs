---
layout: default
title: Customization
nav_order: 7
---

# Customization
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

Game Thumbs supports customization through two configuration files:

- **`teams.json`** - Custom team aliases and data overrides
- **`leagues.json`** - Custom league configurations and new leagues

Both files can be mounted as Docker volumes to customize the API without modifying the source code.

**Important:** These files are **additive** - they merge with the built-in data rather than replacing it. You only need to specify the teams or leagues you want to customize. All built-in data remains available.

---

## Custom Team Overrides

### teams.json

Add custom team aliases or override ESPN's team data. Your files are **additive** - they merge with built-in teams, so you only need to include the teams you want to customize.

#### Docker Mount (Recommended: Directory)

Mount a directory containing one or more JSON files:

```bash
docker run -p 3000:3000 \
  -v /path/to/custom-teams:/app/json/teams:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

All `.json` files in the directory will be loaded and merged in alphabetical order.

#### Docker Mount (Alternative: Single File)

For backward compatibility, you can still mount a single file:

```bash
docker run -p 3000:3000 \
  -v /path/to/your/teams.json:/app/teams.json:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

#### How Merging Works

- Built-in teams remain available
- Custom teams are added or merged with existing teams
- Aliases from all sources are combined (duplicates removed)
- Your override values take precedence over built-in values
- Files in `json/teams/` directory are processed in alphabetical order

#### File Structure

```json
{
  "leagueKey": {
    "team-slug": {
      "aliases": ["nickname1", "nickname2"],
      "override": {
        "property": "value"
      }
    }
  }
}
```

#### Example

```json
{
  "epl": {
    "man-utd": {
      "aliases": ["man utd", "man u", "mufc", "manchester united"],
      "override": {
        "abbreviation": "MUN"
      }
    }
  },
  "mls": {
    "lafc": {
      "aliases": ["losangelesfc", "los angeles fc"],
      "override": {
        "color": "#000000",
        "alternateColor": "#c7a36f"
      }
    }
  }
}
```

#### Common Overrides

| Property | Type | Example |
|----------|------|---------|
| `abbreviation` | string | `"MUN"` |
| `color` | string | `"#000000"` |
| `alternateColor` | string | `"#ffffff"` |
| `logo` | string | `"https://..."` |
| `logoAlt` | string | `"https://..."` |
| `city` | string | `"Manchester"` |
| `name` | string | `"Red Devils"` |
| `fullName` | string | `"Manchester United"` |

See the [Team Matching](team-matching.html) documentation for complete details.

---

## Custom League Configuration

### leagues.json

Add new leagues or modify existing league configurations. Like teams, your files are **additive** - they merge with built-in leagues.

#### Docker Mount (Recommended: Directory)

Mount a directory containing one or more JSON files:

```bash
docker run -p 3000:3000 \
  -v /path/to/custom-leagues:/app/json/leagues:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

All `.json` files in the directory will be loaded and merged in alphabetical order.

#### Docker Mount (Alternative: Single File)

For backward compatibility, you can still mount a single file:

```bash
docker run -p 3000:3000 \
  -v /path/to/your/leagues.json:/app/leagues.json:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

#### How Merging Works

- Built-in leagues remain available
- Custom leagues are added or merged with existing leagues
- Aliases from all sources are combined (duplicates removed)
- Your values take precedence over built-in values
- Files in `json/leagues/` directory are processed in alphabetical order

#### File Structure

```json
{
  "leagueKey": {
    "name": "Full League Name",
    "shortName": "CODE",
    "aliases": ["alias1", "alias2"],
    "providerId": "espn",
    "logoUrl": "https://...",
    "feederLeagues": ["league1", "league2"],
    "fallbackLeague": "otherleague",
    "espnConfig": {
      "espnSport": "sport",
      "espnSlug": "slug"
    }
  }
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full league name (e.g., "National Basketball Association") |
| `shortName` | string | Display name/abbreviation (e.g., "NBA") |
| `providerId` | string | Data provider (currently only "espn" supported) |
| `espnConfig.espnSport` | string | ESPN sport category (e.g., "basketball", "football", "soccer") |
| `espnConfig.espnSlug` | string | ESPN league identifier (e.g., "nba", "nfl", "eng.1") |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `aliases` | array | Alternative names for league matching |
| `logoUrl` | string | Custom league logo URL (overrides ESPN) |
| `feederLeagues` | array | Array of league keys to try when team not found (in order) |
| `fallbackLeague` | string | Legacy fallback league (prefer `feederLeagues` for new configurations) |

#### Example: Adding a New League

```json
{
  "cfl": {
    "name": "Canadian Football League",
    "shortName": "CFL",
    "aliases": ["canadian football"],
    "providerId": "espn",
    "espnConfig": {
      "espnSport": "football",
      "espnSlug": "cfl"
    }
  }
}
```

#### Example: Overriding an Existing League

```json
{
  "nba": {
    "name": "National Basketball Association",
    "shortName": "NBA",
    "providerId": "espn",
    "logoUrl": "https://example.com/custom-nba-logo.png",
    "espnConfig": {
      "espnSport": "basketball",
      "espnSlug": "nba"
    }
  }
}
```

#### Example: League Hierarchy with Feeder Leagues

```json
{
  "epl": {
    "name": "English Premier League",
    "shortName": "EPL",
    "aliases": ["premier league", "premier"],
    "providerId": "espn",
    "feederLeagues": ["championship", "league-one", "league-two"],
    "espnConfig": {
      "espnSport": "soccer",
      "espnSlug": "eng.1"
    }
  },
  "championship": {
    "name": "EFL Championship",
    "shortName": "Championship",
    "aliases": ["efl championship"],
    "providerId": "espn",
    "espnConfig": {
      "espnSport": "soccer",
      "espnSlug": "eng.2"
    }
  },
  "league-one": {
    "name": "EFL League One",
    "shortName": "League One",
    "providerId": "espn",
    "espnConfig": {
      "espnSport": "soccer",
      "espnSlug": "eng.3"
    }
  },
  "league-two": {
    "name": "EFL League Two",
    "shortName": "League Two",
    "providerId": "espn",
    "espnConfig": {
      "espnSport": "soccer",
      "espnSlug": "eng.4"
    }
  }
}
```

**How Feeder Leagues Work:**

When a team is not found in the main league (e.g., EPL), the system automatically searches through the feeder leagues in order:
1. First tries `championship` (EFL Championship)
2. If not found, tries `league-one` (EFL League One)
3. If not found, tries `league-two` (EFL League Two)

This is useful for:
- **Promotion/Relegation Systems** (soccer leagues)
- **Minor League Systems** (baseball farm systems)
- **Development Leagues** (G League for NBA, AHL for NHL)

**Note:** Feeder leagues must reference existing league keys defined elsewhere in the configuration.

#### Finding ESPN Slugs

To find the correct ESPN slug for a league:

1. Visit ESPN's website for that sport/league
2. Look at the URL structure: `espn.com/[sport]/[league]`
3. For soccer leagues, check the league page URL (e.g., `/soccer/league/_/name/eng.1` → slug is `eng.1`)

**Common ESPN Slugs:**

| League | Sport | Slug |
|--------|-------|------|
| NBA | basketball | `nba` |
| NFL | football | `nfl` |
| MLB | baseball | `mlb` |
| NHL | hockey | `nhl` |
| EPL | soccer | `eng.1` |
| La Liga | soccer | `esp.1` |
| Bundesliga | soccer | `ger.1` |
| Serie A | soccer | `ita.1` |
| Ligue 1 | soccer | `fra.1` |
| MLS | soccer | `usa.1` |
| UEFA Champions | soccer | `uefa.champions` |
| UEFA Europa | soccer | `uefa.europa` |

---

## Mount Both Files

You can mount both `teams.json` and `leagues.json` simultaneously:

```bash
docker run -p 3000:3000 \
  -v /path/to/your/teams.json:/app/teams.json:ro \
  -v /path/to/your/leagues.json:/app/leagues.json:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

---

## Development Setup

For local development, simply edit the files directly in the repository:

```bash
# Edit configuration files
nano teams.json
nano leagues.json

# Restart the server to reload
npm start
```

---

## Validation

### teams.json Validation

- Must be valid JSON
- League keys must be lowercase (e.g., `epl`, not `EPL`)
- Team slugs should match ESPN's team identifiers (check via `/raw` endpoint)
- Aliases are case-insensitive and flexible with spacing

### leagues.json Validation

- Must be valid JSON
- League keys must be lowercase and URL-safe (alphanumeric, hyphens)
- `providerId` must be `"espn"` (only supported provider currently)
- ESPN slugs must match ESPN's API identifiers

### Check for Errors

View container logs to check for configuration errors:

```bash
docker logs <container-id>
```

Look for warnings like:
- `Failed to load teams.json`
- `Failed to load leagues.json`

---

## Sharing Your Configurations

If you've added useful team aliases or new leagues, consider contributing them back to the project!

See the [Contributing Guide](contributing.html) for how to submit your configurations via pull request.

---

## Troubleshooting

### Configuration Not Loading

**Check file is mounted correctly:**
```bash
docker exec <container-id> cat /app/teams.json
docker exec <container-id> cat /app/leagues.json
```

**Verify JSON syntax:**
Use a JSON validator or:
```bash
cat teams.json | python -m json.tool
cat leagues.json | python -m json.tool
```

### Changes Not Applied

The configuration files are loaded on server startup. Restart the container:
```bash
docker restart <container-id>
```

### Team Override Not Working

- Confirm league key is lowercase
- Verify team slug is correct (use `/raw` endpoint)
- Check that the file is valid JSON
- Review container logs for errors

### New League Not Available

- Verify ESPN slug is correct
- Check that ESPN has data for that league
- Confirm the league key is lowercase and URL-safe
- Test with a known team from that league
