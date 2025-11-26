---
layout: default
title: Contributing
nav_order: 8
---

# Contributing
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Welcome Contributors!

Thank you for considering contributing to Game Thumbs! We welcome contributions of all kinds, especially:

- 🏀 **New team aliases** - Common nicknames ESPN doesn't recognize
- 🌍 **New leagues** - Expand support to more sports and regions
- 🎨 **Team data corrections** - Fix incorrect colors, abbreviations, or logos
- 🐛 **Bug fixes** - Report or fix issues
- 📚 **Documentation improvements** - Help others understand the project

---

## How to Contribute

### 1. Adding Team Aliases or Overrides

If you've found teams that aren't matching correctly or have incorrect data, you can contribute fixes to `teams.json`.

#### Step 1: Fork the Repository

Click the "Fork" button on [GitHub](https://github.com/sethwv/game-thumbs).

#### Step 2: Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/game-thumbs.git
cd game-thumbs
git checkout -b add-team-aliases
```

#### Step 3: Edit teams.json

Add your team aliases or overrides:

```json
{
  "epl": {
    "man-utd": {
      "aliases": ["man utd", "man u", "mufc", "manchester united"],
      "override": {
        "abbreviation": "MUN"
      }
    },
    "newcastle": {
      "aliases": ["newcastle united", "nufc", "toon", "magpies"],
      "override": {}
    }
  }
}
```

**Guidelines:**
- Use lowercase league keys (e.g., `epl`, `nba`, `mls`)
- Find the correct team slug using the `/raw` endpoint
- Add all common nicknames to aliases
- Only override properties that are incorrect in ESPN's data

#### Step 4: Test Your Changes

```bash
# Install dependencies
npm install

# Run the server
npm start

# Test your team aliases
curl http://localhost:3000/epl/nufc/raw
curl http://localhost:3000/epl/toon/chelsea/thumb
```

#### Step 5: Commit and Push

```bash
git add teams.json
git commit -m "Add team aliases for EPL teams"
git push origin add-team-aliases
```

#### Step 6: Create Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request"
3. Describe what teams you added and why
4. Submit the PR!

---

### 2. Adding New Leagues

To add support for a new league, contribute to `leagues.json`.

#### Step 1: Find ESPN League Information

Visit ESPN's website to find the league:

1. Navigate to the sport page (e.g., espn.com/soccer)
2. Find the league you want to add
3. Note the URL structure: `espn.com/[sport]/league/_/name/[slug]`
4. The slug is what you'll need

**Example:** English Premier League
- URL: `espn.com/soccer/league/_/name/eng.1`
- Sport: `soccer`
- Slug: `eng.1`

#### Step 2: Fork and Clone

```bash
git clone https://github.com/YOUR-USERNAME/game-thumbs.git
cd game-thumbs
git checkout -b add-new-league
```

#### Step 3: Edit leagues.json

Add your league configuration:

```json
{
  "liga-mx": {
    "name": "Liga MX",
    "shortName": "LigaMX",
    "aliases": ["liga mx", "mexican league", "mex.1"],
    "providerId": "espn",
    "espnConfig": {
      "espnSport": "soccer",
      "espnSlug": "mex.1"
    }
  }
}
```

**Required fields:**
- `name` - Full league name
- `shortName` - Display abbreviation
- `providerId` - Must be `"espn"`
- `espnConfig.espnSport` - ESPN sport category
- `espnConfig.espnSlug` - ESPN league slug

**Optional fields:**
- `aliases` - Alternative names
- `logoUrl` - Custom league logo URL
- `fallbackLeague` - League to use when team not found

#### Step 4: Test Your League

```bash
npm start

# Test with a known team from the league
curl http://localhost:3000/liga-mx/america/cruz-azul/thumb
curl http://localhost:3000/liga-mx/TEAM_NAME/raw
```

#### Step 5: Commit and Submit PR

```bash
git add leagues.json
git commit -m "Add Liga MX support"
git push origin add-new-league
```

Create a pull request with:
- League name and ESPN slug
- Test results showing it works
- Example teams to test with

---

### 3. Fixing Team Data Issues

If ESPN's data has incorrect colors, abbreviations, or other issues:

#### Step 1: Identify the Issue

```bash
# Get raw team data
curl http://localhost:3000/nba/lakers/raw

# Check what's incorrect (e.g., wrong colors)
```

#### Step 2: Add Override in teams.json

```json
{
  "nba": {
    "lakers": {
      "aliases": [],
      "override": {
        "color": "#552583",
        "alternateColor": "#FDB927"
      }
    }
  }
}
```

#### Step 3: Submit PR

Include:
- What was incorrect
- What you corrected it to
- Source/reference for the correct data (e.g., official team website)

---

## Pull Request Guidelines

### Before Submitting

- ✅ Test your changes locally
- ✅ Ensure JSON files are valid
- ✅ Use lowercase keys for leagues and proper team slugs
- ✅ Include test examples in PR description
- ✅ Follow existing formatting and style

### PR Description Template

```markdown
## Type of Change
- [ ] Team aliases
- [ ] Team data overrides
- [ ] New league
- [ ] Bug fix
- [ ] Documentation

## Description
Brief description of what you're adding/fixing.

## Testing
How did you test this?

### Test Examples
- `GET /league/team1/team2/thumb` - Description of what this tests
- `GET /league/team/raw` - Expected output

## Additional Context
Any other information about the changes.
```

### Review Process

1. Automated checks will validate JSON syntax
2. Maintainers will review your changes
3. You may be asked to make adjustments
4. Once approved, your changes will be merged!

---

## Code Contributions

For code changes (new features, bug fixes, refactoring):

### Development Setup

```bash
# Clone and install
git clone https://github.com/sethwv/game-thumbs.git
cd game-thumbs
npm install

# Run in development mode
npm run dev

# Run tests (if available)
npm test
```

### Code Style

- Use ES6+ JavaScript features
- Follow existing code patterns
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages

Use clear, descriptive commit messages:

```
Add team aliases for Premier League teams
Fix color extraction for teams without logos
Add support for Serie A league
```

---

## Bug Reports

Found a bug? Please create an issue on [GitHub](https://github.com/sethwv/game-thumbs/issues) with:

- **Description** - What's wrong?
- **Steps to Reproduce** - How can we see the bug?
- **Expected Behavior** - What should happen?
- **Actual Behavior** - What actually happens?
- **Environment** - Docker version, OS, etc.
- **Logs** - Any error messages or relevant logs

---

## Feature Requests

Have an idea? Create an issue with:

- **Use Case** - What problem does this solve?
- **Proposed Solution** - How should it work?
- **Alternatives** - Other ways to solve it?
- **Additional Context** - Mockups, examples, references

---

## Questions?

- **Documentation**: Check the [full docs](https://sethwv.github.io/game-thumbs/)
- **Issues**: [Search existing issues](https://github.com/sethwv/game-thumbs/issues)
- **Discussions**: Start a [GitHub Discussion](https://github.com/sethwv/game-thumbs/discussions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Thank You!

Every contribution, no matter how small, helps make Game Thumbs better for everyone. Thank you for being part of the community! 🎉
