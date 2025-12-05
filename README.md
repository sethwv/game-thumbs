### **Note:** This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.

# Game Thumbs

A sports matchup thumbnail and logo generation API supporting 30+ professional and NCAA leagues.

## Quick Start

```bash
# Pull and run
docker pull ghcr.io/sethwv/game-thumbs:latest
docker run -p 3000:3000 ghcr.io/sethwv/game-thumbs:latest
```

**Examples:**
```
GET http://localhost:3000/nba/lakers/celtics/thumb
GET http://localhost:3000/nfl/chiefs/49ers/logo?style=3
GET http://localhost:3000/ncaa/football/alabama/georgia/thumb
```

## Features

🏀 Multi-Sport • 🎨 Dynamic Generation • 🖼️ Multiple Styles • 💾 Smart Caching • 🎯 Flexible Matching • 🔧 Customizable

**Supports:** NBA, WNBA, NFL, MLB, NHL, EPL, MLS, UEFA, 21+ NCAA sports, and more

## Documentation

📚 **[View Full Documentation](https://game-thumbs-docs.swvn.io/)**

- [Docker Setup](https://game-thumbs-docs.swvn.io/docker.html) - Configuration and environment variables
- [API Reference](https://game-thumbs-docs.swvn.io/api-reference/) - All endpoints with examples  
- [Supported Leagues](https://game-thumbs-docs.swvn.io/supported-leagues.html) - League codes and sports
- [Customization](https://game-thumbs-docs.swvn.io/customization.html) - Custom leagues and team overrides
- [Contributing](https://game-thumbs-docs.swvn.io/contributing.html) - How to contribute improvements

## License

MIT

## Attribution

This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.

## TEST CHANGE