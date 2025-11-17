# Changelog

All notable changes to this project will be documented in this file.

> **Note on Breaking Changes**: For this API service, breaking changes are those that affect how you use the API - such as changed endpoint URLs, modified query parameters, altered response formats, or removed features. Internal code refactoring that doesn't change the API behavior is not considered breaking.

## 🚧 Unreleased (dev branch)

Changes in development that are not yet in the latest release:

- **Improved Team Matching**: Revamped team matching algorithm with better weighted scoring and more flexible pattern matching

---

## Version History

### v0.5.2 - 2025-11-08

**New Features:**
- Added soccer league support: EPL (English Premier League), MLS (Major League Soccer), and UEFA Champions League

**Contributors:**
- @ferteque made their first contribution

---

### v0.5.1 - 2025-11-05

**Improvements:**
- Added league logo endpoints
- Fixed logging issues

---

### v0.5.0 - 2025-11-04

**New Features:**
- Added 21 NCAA sports leagues (Hockey, Soccer, Baseball, Softball, Lacrosse, Volleyball, Water Polo, Field Hockey)
- Added NCAA shorthand route (`/ncaa/:sport/:team1/:team2/:type`)
- Added automatic color extraction from team logos when ESPN doesn't provide colors
- Added NCAA women's sports fallback to men's teams when not found
- Added environment variable configuration (rate limiting, caching, logging, timeouts)
- Added `/info` endpoint for server version and git information
- Added structured logging system with file logging support

**Improvements:**
- Enhanced team matching with weighted scoring system
- Improved error handling with detailed stack traces in development mode
- Added rate limiting (30 requests/min by default, configurable)
- Added request/server timeout configuration
- Refactored provider system for better maintainability

---

### v0.4.0 - 2025-10-29

**New Features:**
- Added logo cropping capabilities
- Improved cover image cache checking

**Improvements:**
- Major internal code refactoring and organization (no API changes)

---

### v0.3.2 - 2025-10-24

**Improvements:**
- Minor fixes and enhancements

---

### v0.3.1 - 2025-10-23

**Improvements:**
- Minor fixes and enhancements

---

### v0.3.0 - 2025-10-23

**New Features:**
- Added automatic stroke outlines to team logos for better contrast when colors are too similar

**Notes:**
- May have slight performance impact due to additional processing

---

### v0.2.0 - 2025-10-23

**Initial Features:**
- Core functionality for generating matchup thumbnails

---

### v0.1.0 - 2025-10-23

**First Release:**
- Initial release of game-thumbs API
