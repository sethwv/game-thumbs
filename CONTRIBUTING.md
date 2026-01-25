# Contributing to Game Thumbs

Thanks for your interest in contributing! We welcome all kinds of contributions.

## Reporting Issues

Before writing code, consider opening an issue:

- **[🐛 Report a Bug](https://github.com/sethwv/game-thumbs/issues/new?template=bug_report.yml)** - API errors, incorrect images, server issues
- **[💡 Request a Feature](https://github.com/sethwv/game-thumbs/issues/new?template=feature_request.yml)** - New leagues, team corrections, enhancements

## Quick Contributions

### Adding Team Aliases

If a team isn't being recognized, add aliases to `teams.json`:

**Quick start:**
```bash
# Find the team slug using /raw endpoint
curl http://localhost:3000/laliga/celta/raw
# Look for "slug": "esp.celta_vigo" → Use "celta-vigo"
```

```json
{
  "laliga": {
    "celta-vigo": {
      "aliases": ["celtadevigo", "celta de vigo", "celtavigo"]
    }
  },
  "nfl": {
    "patriots": {
      "aliases": ["pats", "new england", "ne patriots"]
    }
  }
}
```

**Notes:**
- Aliases are case-insensitive and accent-insensitive
- See **[Team Matching docs](https://game-thumbs-docs.swvn.io/team-matching.html#team-slugs)** for detailed slug format by provider

### Fixing Team Data

Correct incorrect colors, logos, or abbreviations in `teams.json`:

```json
{
  "nba": {
    "lakers": {
      "override": {
        "color": "#552583",
        "alternateColor": "#FDB927"
      }
    }
  }
}
```

### Adding New Leagues

Add league support in `leagues.json` in the project root:

```json
{
  "liga-mx": {
    "name": "Liga MX",
    "shortName": "LigaMX",
    "providerId": "espn",
    "providers": [{
      "espn": {
        "espnSport": "soccer",
        "espnSlug": "mex.1"
      }
    }]
  }
}
```

Find ESPN league slugs at `espn.com/[sport]/league/_/name/[slug]`

## Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR-USERNAME/game-thumbs.git
cd game-thumbs

# Install dependencies
npm install

# Run locally
npm start

# Test your changes
curl http://localhost:3000/nfl/patriots/chiefs/thumb
```

## Pull Request Process

1. **Create a branch**: `git checkout -b my-feature`
2. **Make your changes**: Edit JSON files or code
3. **Test locally**: Verify endpoints work
4. **Commit**: `git commit -m "Add team aliases for EPL teams"`
5. **Push**: `git push origin my-feature`
6. **Open PR**: Use the pull request template

### PR Guidelines

- ✅ Test your changes locally
- ✅ Validate JSON syntax
- ✅ Include test examples in PR description
- ✅ Follow existing code style
- ✅ Keep changes focused

## Code Style

- Follow existing patterns
- Add comments for complex logic
- Keep functions small and focused

## Questions?

- 📚 [Documentation](https://game-thumbs-docs.swvn.io/)
- 🔍 [Search Issues](https://github.com/sethwv/game-thumbs/issues)
- 💬 [Start a Discussion](https://github.com/sethwv/game-thumbs/discussions)

## License

By contributing, you agree your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
