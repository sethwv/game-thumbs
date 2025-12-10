---
layout: default
title: Home
nav_order: 1
description: "Game Thumbs API - Sports matchup thumbnail and logo generation"
permalink: /
---

# Game Thumbs API Documentation
{: .fs-9 }

A sports matchup thumbnail and logo generation API supporting 30+ professional and NCAA leagues.
{: .fs-6 .fw-300 }

[Get Started](#quick-start){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[View on GitHub](https://github.com/sethwv/game-thumbs){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Features

- 🏀 **Multi-Sport Support**: 40+ leagues including NBA, NFL, MLB, NHL, UFC, PFL, Bellator, EPL, MLS, UEFA, and 21+ NCAA sports
- 🥊 **Combat Sports**: Individual fighter matchups for UFC, PFL, and Bellator
- 🎨 **Dynamic Generation**: Creates thumbnails and logos on-the-fly with team colors
- 🖼️ **Multiple Styles**: Choose from 4+ different visual styles
- 💾 **Smart Caching**: Automatically caches images and team data (24h teams, 72h athletes)
- 🎯 **Flexible Matching**: Supports team/athlete names, cities, abbreviations, and partial matches
- 🔧 **Customizable**: Override team data, logos, and aliases

---

## Quick Start

### Docker

Pull and run the latest image:

```bash
docker pull ghcr.io/sethwv/game-thumbs:latest
docker run -p 3000:3000 ghcr.io/sethwv/game-thumbs:latest
```

The API will be available at `http://localhost:3000`.

### Basic Examples

Generate a matchup thumbnail:
```
GET http://localhost:3000/nba/lakers/celtics/thumb
```

Generate a matchup logo:
```
GET http://localhost:3000/nfl/chiefs/49ers/logo?style=3
```

Get raw team data:
```
GET http://localhost:3000/mls/lafc/raw
```

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

See the [API Reference](api-reference.html) for complete documentation.

---

## Supported Leagues

**Professional:** NBA, WNBA, NFL, UFL, MLB, NHL, NLL, PWHL, EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, UEFA Champions League, UEFA Europa League, UEFA Conference League, FIFA World Cup, CFL, CHL, OHL, WHL, QMJHL, AHL

**Combat Sports:** UFC (600+ fighters), PFL (200+ fighters), Bellator (300+ fighters)

**NCAA (Men's):** Football, Basketball, Ice Hockey, Soccer, Baseball, Lacrosse, Volleyball, Water Polo

**NCAA (Women's):** Basketball, Ice Hockey, Soccer, Softball, Lacrosse, Volleyball, Water Polo, Field Hockey

See the [full league list](supported-leagues.html) for league codes and details.

---

## Attribution

This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.

## License

[MIT License](https://github.com/sethwv/game-thumbs/blob/main/LICENSE)
