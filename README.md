### **Note:** This service uses publicly available APIs and logos. All team names, logos, and trademarks are property of their respective owners.
---
### [![Deployment](https://img.shields.io/badge/dynamic/json?url=https://api.github.com/repos/sethwv/game-thumbs/deployments?environment=Hosted-Instance&query=$[0].payload.display_ref&label=hosted%20instance&logo=github&color=blue)](https://github.com/sethwv/game-thumbs/deployments/Hosted-Instance) ![Last Deployed](https://img.shields.io/badge/dynamic/json?url=https://api.github.com/repos/sethwv/game-thumbs/deployments?environment=Hosted-Instance&query=$[0].created_at&label=&logo=clock&color=lightgrey) ![Commit](https://img.shields.io/badge/dynamic/json?url=https://api.github.com/repos/sethwv/game-thumbs/deployments?environment=Hosted-Instance&query=$[0].sha&label=&color=lightgrey)
### [![Pages](https://img.shields.io/github/deployments/sethwv/game-thumbs/github-pages?label=documentation&logo=github&color=green)](https://sethwv.github.io/game-thumbs/) ![Last Deployed](https://img.shields.io/badge/dynamic/json?url=https://api.github.com/repos/sethwv/game-thumbs/deployments?environment=github-pages&query=$[0].created_at&label=&logo=clock&color=lightgrey) ![Commit](https://img.shields.io/badge/dynamic/json?url=https://api.github.com/repos/sethwv/game-thumbs/deployments?environment=github-pages&query=$[0].sha&label=&color=lightgrey)
# Game Thumbs

A sports matchup thumbnail and logo generation API supporting 30+ professional and NCAA leagues.

## Quick Start

### Docker Compose (Recommended)

```bash
docker compose up -d
```

### Docker Run

```bash
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

**Supports:** NBA, WNBA, NFL, MLB, NHL, UFC, PFL, Bellator, EPL, MLS, UEFA, International/Olympics, 21+ NCAA sports, and more

## Documentation

📚 **[View Full Documentation](https://game-thumbs-docs.swvn.io/)**

- [Docker Setup](https://game-thumbs-docs.swvn.io/docker.html) - Configuration and environment variables
- [API Reference](https://game-thumbs-docs.swvn.io/api-reference/) - All endpoints with examples  
- [Supported Leagues](https://game-thumbs-docs.swvn.io/supported-leagues.html) - League codes and sports
- [Customization](https://game-thumbs-docs.swvn.io/customization.html) - Custom leagues and team overrides
- [Contributing](https://game-thumbs-docs.swvn.io/contributing.html) - How to contribute improvements

## Contributing

🐛 **[Report a Bug](https://github.com/sethwv/game-thumbs/issues/new?template=bug_report.yml)** • 💡 **[Request a Feature](https://github.com/sethwv/game-thumbs/issues/new?template=feature_request.yml)**

Contributions are welcome! See the [Contributing Guide](https://game-thumbs-docs.swvn.io/contributing.html) for details.

## License

MIT

## Attribution

This service uses publicly available ESPN APIs and logos. All team names, logos, and trademarks are property of their respective owners.