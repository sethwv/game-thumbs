---
layout: default
title: Home
nav_order: 1
description: "Game Thumbs API - Sports matchup thumbnail and logo generation"
permalink: /
---

# Game Thumbs API Documentation
{: .fs-9 }

A sports matchup thumbnail and logo generation API supporting 100+ professional and NCAA leagues.
{: .fs-6 .fw-300 }

[Get Started](#quick-start){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[View on GitHub](https://github.com/sethwv/game-thumbs){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Features

- 🏀 **Multi-Sport Support**: 100+ leagues including NBA, NFL, MLB, NHL, UFC, PFL, Bellator, EPL, MLS, UEFA, and 21+ NCAA sports
- 🥊 **Combat Sports**: Individual fighter matchups for UFC, PFL, and Bellator
- 🎨 **Dynamic Generation**: Creates thumbnails and logos on-the-fly with team colors
- 🖼️ **Multiple Styles**: Choose from 6 different visual styles
- 💾 **Smart Caching**: Automatically caches images and team data (24h teams, 72h athletes)
- 🎯 **Flexible Matching**: Supports team/athlete names, cities, abbreviations, and partial matches
- 🔧 **Customizable**: Override team data, logos, and aliases

---

## Quick Start

**1. Run the container:**

```bash
docker run -p 3000:3000 ghcr.io/sethwv/game-thumbs:latest
```

**2. Verify it's up:**

```bash
curl http://localhost:3000/health
# {"status":"ok","uptime":...}
```

**3. Request your first image:**

```bash
# Open in a browser or paste into Slack/Discord
http://localhost:3000/nba/lakers/celtics/thumb
http://localhost:3000/nfl/chiefs/49ers/logo?style=3
http://localhost:3000/ncaa/football/alabama/georgia/thumb
```

That's it. See [Docker Setup](docker.html) for environment variables, volume mounts, and Docker Compose examples.

---

## Documentation

### Getting Started
- [Docker Setup](docker.html) - Installation, environment variables, and configuration
- [API Reference](api-reference.html) - Complete endpoint documentation with examples
- [Supported Leagues](supported-leagues.html) - Full list of supported leagues and sports

### Advanced
- [Team Matching](team-matching.html) - Team matching system, custom aliases, and overrides
- [Technical Details](technical-details.html) - Implementation details, caching, and color extraction

---

## API Endpoints

| Type | Endpoint | Dimensions |
|------|----------|------------|
| **Unified Endpoints** | | |
| Thumbnail | `/:league/thumb` | 1440x1080 |
| | `/:league/:team1/thumb` | 1440x1080 |
| | `/:league/:team1/:team2/thumb` | 1440x1080 |
| Cover | `/:league/cover` | 1080x1440 |
| | `/:league/:team1/cover` | 1080x1440 |
| | `/:league/:team1/:team2/cover` | 1080x1440 |
| Logo | `/:league/logo` | Original |
| | `/:league/:team1/logo` | Original |
| | `/:league/:team1/:team2/logo` | 1024x1024 |
| **Other** | | |
| Raw Data | `/:league/:team/raw` | JSON |
| NCAA Shorthand | `/ncaa/:sport/:type` | Varies |
| Health Check | `/health` | JSON |

See the [API Reference](api-reference.html) for complete documentation.

---

## Supported Leagues

**Professional:** NBA, WNBA, NFL, UFL, MLB, NHL, NLL, PWHL, EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, UEFA Champions League, UEFA Europa League, UEFA Conference League, FIFA World Cup, CFL, CHL, OHL, WHL, QMJHL, AHL, KBO

**Minor Leagues:** MiLB (Triple-A, Double-A, High-A, Single-A), Winter Leagues, Independent Leagues

**Combat Sports:** UFC (600+ fighters), PFL (200+ fighters), Bellator (300+ fighters)

**NCAA (Men's):** Football, Basketball, Ice Hockey, Soccer, Baseball, Lacrosse, Volleyball, Water Polo

**NCAA (Women's):** Basketball, Ice Hockey, Soccer, Softball, Lacrosse, Volleyball, Water Polo, Field Hockey

See the [full league list](supported-leagues.html) for league codes and details.

---

## Attribution

This service uses publicly available ESPN APIs, MLB StatsAPI, and logos. All team names, logos, and trademarks are property of their respective owners.

## License

[MIT License](https://github.com/sethwv/game-thumbs/blob/main/LICENSE)
