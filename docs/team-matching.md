---
layout: default
title: Team Matching
nav_order: 5
---

# Team Matching
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## How Team Matching Works

The API uses intelligent team matching with weighted scoring to find teams flexibly. You can use team names, cities, abbreviations, or partial matches.

### Matching Priority

The system checks for matches in this order (highest to lowest priority):

1. **Custom Aliases** - User-defined nicknames from `teams.json` (highest priority)
2. **Abbreviation** - Official team abbreviation (e.g., `LAL`, `BOS`, `NYY`)
3. **Team Nickname** - Team name only (e.g., `Lakers`, `Celtics`, `Yankees`)
4. **Short Display Name** - Abbreviated form (e.g., `LA Lakers`, `Boston`)
5. **Full Display Name** - Complete name (e.g., `Los Angeles Lakers`)
6. **Location/City** - City or location (e.g., `Los Angeles`, `Boston`, `New York`)
7. **Partial Matches** - Fuzzy matching for convenience

### Examples

```
/nba/lakers/celtics/thumb          ✓ Team nicknames
/nba/los%20angeles/boston/thumb    ✓ Cities (URL encoded spaces)
/nba/LAL/BOS/thumb                 ✓ Official abbreviations
/nfl/chiefs/49ers/thumb            ✓ Mixed formats
/ncaaf/alabama/georgia/thumb       ✓ Works with NCAA too
/mls/losangelesfc/lafc/thumb       ✓ Expanded location variations
/liga/atletico%20madrid/real/thumb ✓ Accents optional (Atlético works too)
/ligue1/psg/monaco/thumb           ✓ Montréal or Montreal both work
```

### League Hierarchies with Feeder Leagues

Many leagues are configured with feeder leagues that are automatically searched when a team isn't found in the primary league. This is especially useful for:

**Promotion/Relegation Systems (Soccer):**
- **English Premier League** → EFL Championship → EFL League One → EFL League Two
- **La Liga** → Segunda División
- **Bundesliga** → 2. Bundesliga
- **Serie A** → Serie B
- **Ligue 1** → Ligue 2

**International Competitions:**
- **FIFA World Cup** → All World Cup Qualifiers (UEFA, CONMEBOL, CONCACAF, AFC, CAF, OFC)

When you request a team that exists in a feeder league (e.g., a Championship team), the API will automatically find it even when using the top-tier league code. This works seamlessly for promoted/relegated teams.

**Example:**
```
GET /epl/leeds/burnley/thumb
```
Even if Leeds United is currently in the Championship, the API will find it by searching through EPL's feeder leagues.

### NCAA Women's Sports Fallback

Women's NCAA sports automatically fall back to men's teams when a team is not found:

- Women's Basketball → Men's Basketball
- Women's Hockey → Men's Hockey
- Women's Soccer → Men's Soccer
- Women's Lacrosse, Volleyball, Water Polo, Softball, Field Hockey → Football

This ensures maximum compatibility when teams don't have dedicated women's programs in ESPN's data.

---

## Custom Team Overrides

For cases where ESPN's API doesn't match common team nicknames or has incorrect data, you can define custom aliases and data overrides in a `teams.json` file.

**Important:** Your custom `teams.json` file is **additive** - it merges with the built-in team data rather than replacing it. You only need to include the specific teams you want to customize. All built-in teams and their aliases remain available.

### File Structure

The `teams.json` file is organized by league, with each team having optional aliases and overrides:

```json
{
  "leagueKey": {
    "team-slug": {
      "aliases": ["nickname1", "nickname2", "..."],
      "override": {
        "property": "value"
      }
    }
  }
}
```

### Configuration Fields

#### League Keys

- Use lowercase league codes (e.g., `epl`, `nba`, `nfl`, `mls`, `ncaaf`)
- Must match the league identifiers used in API endpoints
- See [Supported Leagues](supported-leagues.html) for the full list

#### Team Slugs

Team slugs vary by provider. To find the correct slug for a team:

**Method 1: Use the `/raw` endpoint (Recommended)**
```bash
curl http://localhost:3000/laliga/celta/raw
```

Look at the `slug` field in the response. Remove the country prefix and convert underscores to hyphens:
- ESPN format: `esp.celta_vigo` → Use `celta-vigo`
- TheSportsDB: Uses kebab-case team name (e.g., `manchester-united`)
- HockeyTech: Uses kebab-case team name (e.g., `belleville-senators`)

**Method 2: Common patterns by provider**

| Provider | Format | Example Input | Slug to Use |
|----------|--------|---------------|-------------|
| ESPN (Soccer) | Remove country prefix + underscores→hyphens | `esp.celta_vigo` | `celta-vigo` |
| ESPN (US Sports) | Lowercase with hyphens | `golden-state-warriors` | `golden-state-warriors` |
| TheSportsDB | Kebab-case team name | `Manchester United` | `manchester-united` |
| HockeyTech | Kebab-case team name | `Belleville Senators` | `belleville-senators` |

**Processing rules:**
1. Team slug from provider is extracted (e.g., `esp.celta_vigo`)
2. Country prefix after the dot is removed (e.g., `celta_vigo`)
3. Underscores are converted to hyphens (e.g., `celta-vigo`)
4. This final value must match your JSON key

#### Aliases Array

- List of alternative names/nicknames that should match this team
- Checked **first** before normal matching (highest priority)
- **Case-insensitive** and **accent-insensitive** matching
- Special characters (spaces, hyphens, etc.) are normalized during matching
- `"atlético"` will match `"atletico"`, `"Atletico Madrid"`, `"atleticomadrid"`, etc.
- Examples: `["man utd", "man u", "mufc"]`, `["celtadevigo", "celta de vigo"]`

#### Override Object

- Properties to merge into/replace the team data from ESPN
- Can be empty `{}` if only using aliases
- Supports all team data fields returned by the API

**Common override properties:**

| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `abbreviation` | string | `"MUN"` | Team abbreviation |
| `color` | string | `"#000000"` | Primary team color (hex) |
| `alternateColor` | string | `"#ffffff"` | Secondary team color (hex) |
| `logo` | string | `"https://..."` | Primary logo URL |
| `logoAlt` | string | `"https://..."` | Alternate/dark logo URL |
| `city` | string | `"Manchester"` | Team city/location |
| `name` | string | `"Red Devils"` | Team nickname |
| `fullName` | string | `"Manchester United"` | Full team display name |

---

## Examples

### Basic Aliases with Abbreviation Override

```json
{
  "epl": {
    "man-utd": {
      "aliases": ["man utd", "man u", "manutd", "mufc", "manchester united"],
      "override": {
        "abbreviation": "MUN"
      }
    }
  }
}
```

**Usage:**
```
GET /epl/man utd/chelsea/thumb     ✓ Matches via alias
GET /epl/mufc/chelsea/thumb        ✓ Matches via alias
GET /epl/manchester united/chelsea/thumb  ✓ Matches via alias
```

### Aliases Only (No Overrides)

```json
{
  "epl": {
    "nottm-forest": {
      "aliases": ["notts forest", "forest", "nffc", "nottingham forest"],
      "override": {}
    }
  }
}
```

### Complete Color Override

```json
{
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

### Logo Override

```json
{
  "nba": {
    "lakers": {
      "aliases": ["la lakers"],
      "override": {
        "logo": "https://example.com/custom-lakers-logo.png",
        "logoAlt": "https://example.com/custom-lakers-logo-dark.png"
      }
    }
  }
}
```

### Multiple Leagues

```json
{
  "epl": {
    "man-utd": {
      "aliases": ["man utd", "man u", "mufc"],
      "override": {
        "abbreviation": "MUN"
      }
    },
    "tottenham": {
      "aliases": ["spurs", "thfc", "tottenham hotspur"],
      "override": {}
    }
  },
  "nba": {
    "lakers": {
      "aliases": ["la lakers", "lake show"],
      "override": {}
    }
  }
}
```

---

## How It Works

1. **Alias Matching** (highest priority): When resolving a team, the system first checks if the input matches any custom alias in `teams.json`
2. **ESPN Matching**: If no alias matches, the system uses ESPN's team data with intelligent fuzzy matching
3. **Override Application**: After finding a match, any properties in the `override` object are merged into the final team data

---

## Finding Team Slugs

To determine the correct slug for a team:

1. Use the raw data endpoint: `GET /:league/:team/raw`
2. Look for the `slug` field in the response
3. Remove the league prefix if present (e.g., `eng.man_united` → `man-united`, `usa.lafc` → `lafc`)
4. Replace underscores with hyphens

### Example

```bash
curl http://localhost:3000/mls/lafc/raw
```

**Response:**
```json
{
  "id": "18966",
  "slug": "usa.lafc",
  "city": "LAFC",
  "name": "LAFC",
  ...
}
```

**Use in teams.json:** `"lafc"` (remove `usa.` prefix)

---

## Docker Volume Mount

To use a custom `teams.json` file with Docker:

```bash
docker run -p 3000:3000 \
  -v /path/to/your/teams.json:/app/teams.json:ro \
  ghcr.io/sethwv/game-thumbs:latest
```

Replace `/path/to/your/teams.json` with the absolute path to your custom file. The `:ro` flag makes it read-only.

**Additive Merging:** Your custom file is merged with the built-in team data at runtime:
- Built-in teams remain available
- Your custom teams are added to the system
- For teams that exist in both files, aliases are combined (duplicates removed)
- Your override values take precedence
- No need to maintain a complete copy of all teams

The file is loaded on server startup. Restart the container to reload changes. Check logs for merge confirmation messages.

---

## Use Cases

### Add Common Nicknames

ESPN doesn't recognize all common team nicknames:

```json
{
  "epl": {
    "man-utd": {
      "aliases": ["man utd", "man u", "mufc"],
      "override": {}
    },
    "tottenham": {
      "aliases": ["spurs", "thfc"],
      "override": {}
    }
  }
}
```

### Fix Incorrect Abbreviations

Some teams have inconsistent abbreviations in ESPN's data:

```json
{
  "epl": {
    "man-utd": {
      "aliases": [],
      "override": {
        "abbreviation": "MUN"
      }
    }
  }
}
```

### Override Team Colors

ESPN's color data is sometimes missing or incorrect:

```json
{
  "nba": {
    "heat": {
      "aliases": [],
      "override": {
        "color": "#98002E",
        "alternateColor": "#F9A01B"
      }
    }
  }
}
```

### Replace Team Logos

Use custom or higher quality logos:

```json
{
  "nba": {
    "lakers": {
      "aliases": [],
      "override": {
        "logo": "https://cdn.example.com/lakers-logo-4k.png",
        "logoAlt": "https://cdn.example.com/lakers-logo-dark-4k.png"
      }
    }
  }
}
```

### Support Alternative Spellings

Handle variations in team names:

```json
{
  "mls": {
    "lafc": {
      "aliases": ["losangelesfc", "los angeles fc", "la fc"],
      "override": {}
    }
  }
}
```

---

## Troubleshooting

### Override Not Working

**Check your file:**
- Ensure it's valid JSON (use a JSON validator)
- Verify league keys are lowercase (`epl`, not `EPL`)
- Confirm team slugs are correct (use `/raw` endpoint)
- Check that underscores are replaced with hyphens

**Verify volume mount:**
```bash
docker exec <container-id> cat /app/teams.json
```

**Check logs for errors:**
```bash
docker logs <container-id>
```

### Alias Not Matching

- Aliases are case-insensitive but must be exact matches (after normalization)
- Spaces are flexible (e.g., "man utd" matches "manutd")
- Special characters are ignored during matching
- Check the alias is in the correct team's entry

### Changes Not Applied

- The `teams.json` file is loaded on server startup
- Restart the container to reload changes:
  ```bash
  docker restart <container-id>
  ```

### Understanding "Team Not Found" Errors

When a team isn't found, the error message includes **all available teams** from:
- The primary league
- All configured feeder leagues (if any)
- The fallback league (if configured)

**Example for EPL:**
```json
{
  "error": "Team not found: 'invalid-team' in EPL. Available teams: Arsenal, Aston Villa, ..., [Championship teams], [League One teams], [League Two teams]"
}
```

This comprehensive list helps you identify:
- The correct team name to use
- Whether the team exists in a feeder league
- All teams that can be matched for that league endpoint

**For leagues with feeder leagues** (EPL, La Liga, Bundesliga, etc.), the list includes teams from lower divisions, making it easier to find promoted/relegated teams.
