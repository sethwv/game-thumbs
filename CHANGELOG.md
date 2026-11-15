# Changelog

All notable changes to this project are documented in this file.

## [v2.5.0](https://github.com/sethwv/game-thumbs/releases/tag/v2.5.0) - 2026-11-15

### Added

- (Experimental) Discover cricket series and their current teams from ESPN's daily scores, including team abbreviation and logo support.

### Fixed

- Restore TheSportsDB team and athlete lookups using the current public test key.
- Render team initials when both team lookups fail and the fallback league logo is unavailable.
- Use a bundled AHL logo instead of an external logo URL.

## [v2.4.1](https://github.com/sethwv/game-thumbs/releases/tag/v2.4.1) - 2026-11-05

### Security
- Updated the Docker image to a Node.js release patched against Node2Shell (CVE-2026-111497).
- Removed unused request body parsing to reduce exposure to malformed compressed input.

## [v2.4.0](https://github.com/sethwv/game-thumbs/releases/tag/v2.4.0) - 2026-10-01

### Added

- Allow a league's short code, ESPN slug, or full name to be rendered as a team in raw data, thumbnail, and matchup logo endpoints.
- Support up to four badge overlays per image, including ranking badges and corner placement controls. (#161 by @lpukatch)

### Fixed

- Use a contrasting charcoal background when the WNBA is rendered as a league team.
- Correct the bottom-right corner of badge pills. (#161 by @lpukatch)

## [v2.3.0](https://github.com/sethwv/game-thumbs/releases/tag/v2.3.0) - 2026-09-03

### Added
- Stadium-background matchup styles 10 through 13, with venue details and optional team records (#144 by @dexdeadly).
- Eredivisie, Eerste Divisie, and Greater Ontario Hockey League support.
- NASCAR Cup and NASCAR Cup Series league aliases.
- Opt-in Prometheus metrics at `/metrics` when `METRICS_ENABLED=true`.
- Built-in Teamarr league overlays, including configured light and dark league artwork.

### Changed
- Updated UEFA Europa Conference League resolution to use ESPN's current slug and added `UECL` aliases (#151 by @DatGuy1).

### Fixed
- Removed detected white backgrounds from team and league logos across image endpoints. Set `DISABLE_LOGO_BACKGROUND_REMOVAL=true` to disable this processing.
- Resolved AFL club names that include a trailing `Football Club` suffix.

## [v2.2.0](https://github.com/sethwv/game-thumbs/releases/tag/v2.2.0) - 2026-08-12

### Added
- New `llb` (Little League Baseball) league.
- `mode` leagues.json field (and matching `?mode=` query param): set to `"name"` to render each team's name as text instead of its logo, on matchup and single-team thumb/cover/logo endpoints.
- `teamColors` leagues.json field: an optional hex color palette that deterministically assigns each team a stable color/alternate color, for leagues where every team otherwise shares the same provider color.

### Changed
- ATP and WTA league logos now use bundled local assets instead of remote thesportsdb URLs.

### Fixed
- Fixed requests failing with 403 errors on public/VPS-hosted instances due to ESPN's Akamai WAF blocking browser-style User-Agent strings from datacenter IPs (#149).
- Fixed MLB All-Star team resolution failing due to stale cached team data after a data shape change.
- Fixed ESPN all-star pseudo-team resolution for MLS and Liga MX.
- Fixed a crash ("JavaScript heap out of memory") that could occur under concurrent requests to tennis/athlete-based logo routes, caused by repeatedly re-parsing the full ESPN roster cache from disk on every request (#141).

## [v2.1.0](https://github.com/sethwv/game-thumbs/releases/tag/v2.1.0) - 2026-07-14

### Added

- Pseudo-team resolution via ESPN's All-Star group discovery, enabling leagues with permanent conference/All-Star teams (e.g. MLB's AL/NL, NFL's AFC/NFC Pro Bowl) to resolve those teams without per-league configuration

### Fixed

- Team color cache is now scoped per league, preventing a cached color from one league's team from being applied to a different league's team that happens to share the same ESPN team ID

## [v2.0.0](https://github.com/sethwv/game-thumbs/releases/tag/v2.0.0) - 2026-06-26

(Changelog since v1.0.0)

### Added

- Badge overlays via `badge=` parameter (ALT, 4K, HD, FHD, UHD) on `/logo`, `/thumb`, and `/cover` for matchup, league, and single-team routes
- Athlete support via ESPN Athlete provider for tennis and MMA; doubles and team composites use the `+` separator (e.g. `sinner+medvedev`)
- Adaptive request queue to rate-limit and pace external API calls during startup
- NCAA sports provider
- Image styles 5 and 6 (grid layout) for thumbnails, covers, and logos
- Style 98 (3D embossed) for thumbnails, covers, and logos
- Custom team support via `teams.json`: define teams not in any provider, bypassing provider lookups entirely
- `winner=` parameter on `/logo`, `/thumb`, and `/cover`: highlights the winning team in color and renders the losing team in greyscale
- Generic event overlay parameters `title=`, `subtitle=`, and `iconurl=` for generating non-matchup league images (requires `ALLOW_EVENT_OVERLAYS=true`)
- Custom font registry; Saira Stencil bundled as the default title/subtitle font
- Filesystem-backed image caching with configurable path (replaces in-memory cache)
- `ROOT_REDIRECT_URL` environment variable to redirect the root path to a documentation site
- Boxing support via TheSportsDB athlete provider (`box` key)
- SVG league logo support, fixing leagues such as MiLB where logos are SVG-only
- Opt-in SOCKS5 proxy for HockeyTech requests via `SOCKS_PROXY`, `HOCKEYTECH_PROXY_EXTRACT`, and `HOCKEYTECH_PROXY_FEED` environment variables
- New leagues and sports:
  - IIHF
  - Unrivaled Basketball (UBL)
  - Scottish Premiership and domestic cup competitions; additional EFL Cup variants
  - Junior hockey expansions
  - US Open Cup, USL Championship
  - KBO (Korean Baseball Organization)
  - MiLB (Triple-A, Double-A, High-A, Single-A), Winter Leagues, and Independent Leagues via MLBStats provider
  - Canadian Baseball League (CBL) via Supabase provider
  - 10 rugby leagues: NRL, Top 14, Super Rugby Pacific (#131 by @lpukatch), The Rugby Championship, European Rugby Champions Cup, Currie Cup, National Provincial Championship, URBA Primera A, International Test Match, British & Irish Lions Tour
  - Boxing
- ESPN added as an additional data source for 7 existing rugby leagues: Six Nations, English Premiership, United Rugby Championship, European Rugby Challenge Cup, Rugby World Cup, Women's Rugby World Cup, Major League Rugby
- League logos for NRL, The Rugby Championship, Super Rugby Pacific, Top 14, European Rugby Champions Cup, Currie Cup, National Provincial Championship, URBA Primera A, British & Irish Lions, World Rugby/ITM, and Canadian Baseball League are now bundled as static assets

### Changed

- English Premiership league key renamed from `epr` to `prem`
- European Rugby Challenge Cup league key renamed from `ercc` to `epcr`
- AHL switched to HockeyTech as its data source
- Missing team fallback in matchup images now shows a greyscale league logo placeholder instead of the full league image
- Style 1 logo redesigned with a compact thumbnail layout

### Fixed

- WHL, OHL, and QMJHL team resolution now uses pinned HockeyTech client codes instead of scraping chl.ca
- Regular-weight custom league fonts now apply correctly in event overlays
- Single team logo contrast corrected for style 1
- Consecutive slash URL paths now collapse correctly
- HockeyTech provider now skips playoff bracket seasons with TBD teams when resolving roster data
- Country flag matching improved to prevent false positives on short or generic country names
- Various rugby and CBL league logos bundled locally, eliminating intermittent Wikimedia 429 errors

### Removed

- `/xcproxy` route removed

## [v1.9.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.9.0) - 2026-06-14

### Added

- Canadian Baseball League (CBL) support via a new Supabase provider that auto-discovers API credentials from the league website's JS bundle
- 10 new rugby leagues: NRL, Top 14, Super Rugby Pacific (#131 by @lpukatch), The Rugby Championship, European Rugby Champions Cup, Currie Cup, National Provincial Championship, URBA Primera A, International Test Match, British and Irish Lions Tour
- ESPN as an additional data source for seven existing rugby leagues: Six Nations, English Premiership, United Rugby Championship, European Rugby Challenge Cup, Rugby World Cup, Women's Rugby World Cup, Major League Rugby

### Changed

- English Premiership Rugby league key renamed from `epr` to `prem`
- European Rugby Challenge Cup league key renamed from `ercc` to `epcr`

### Fixed

- Requests with consecutive slashes in the URL path (e.g. `nfl//logo`) now return a 444 error instead of matching unknown routes
- Team cover logos using SVG URLs now render correctly
- Logo map lookups now use the correct ALL_CAPS key structure, improving reliability across leagues

## [v1.8.1](https://github.com/sethwv/game-thumbs/releases/tag/v1.8.1) - 2026-05-02

### Added

- AHL now uses HockeyTech as its data source

### Changed

- HockeyTech provider now skips playoff bracket seasons with TBD teams, selecting the first season with a complete roster instead
- Fixed league thumb and cover layouts to prevent overlapping and clipping when combining logo, title/subtitle, and icon elements (#121 by @brheinfelder)

## [v1.8.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.8.0) - 2026-04-27

### Added
- Generic league event cover and thumbnail support with optional `title`, `subtitle`, and `iconurl` query parameters for non-matchup events (e.g. motorsports races) - #116 by @brheinfelder
- Custom font support with a font registry system and bundled Saira Stencil fonts (OFL v1.1)
- Docker mount support for custom fonts
- US Open Cup (`usa.open`) and USL Championship (`usa.usl.1`) leagues - #118 by @trevorswanson
- `ALLOW_EVENT_OVERLAYS` environment flag to gate event overlay rendering
- Filesystem-backed image caching replacing in-memory caches

### Fixed
- Critical fix for HockeyTech API key extraction - older versions of game-thumbs may fail to retrieve data without this update
- Improved error handling and logging for team-not-found cases

### Security
- canvas updated to 3.2.3 (integer overflow fix in image data operations)
- axios updated to 1.15.0 (proxy handling and header injection vulnerabilities)

## [v1.7.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.7.0) - 2026-03-28

### Added

- **MLBStats provider** - integrates the free MLB StatsAPI (no API key required), enabling support for MiLB, KBO, and other baseball leagues tracked by MLB without needing a third-party API key
- **Minor League Baseball** (`milb`, `milb-aaa`, `milb-aa`, `milb-high-a`, `milb-a`, `milb-winter`, `milb-independent`) - all four MiLB levels plus winter and independent leagues, powered by the new MLBStats provider; `milb` automatically searches all sub-levels via feeder leagues
- **Korean Baseball Organization** (`kbo`) via the new MLBStats provider
- **Formula 1** (`F1`), **NASCAR** (`NASCAR`), and **IndyCar** (`INDY`) - placeholder leagues that return a mood-colored background with the league logo for any matchup request (no team logos or team data required)
- `skipLogos` league config property - when set on a league, all matchup requests automatically use fallback/league-logo mode regardless of team parameters; custom leagues can use this flag to opt in
- Pinnable Docker image tags for dev branch pushes - in addition to the branch name tag, each push now also produces a `branch-sha` tag (e.g., `dev-a1b2c3d4`) for fully reproducible deployments

### Changed

- Container healthcheck command simplified to use `curl` in both the Dockerfile and `docker-compose.yml`, and now correctly respects the `$PORT` environment variable
- 2026 Winter Olympics leagues now use `skipLogos` mode
- Provider team and color caches migrated from in-memory Maps to the filesystem (`.cache/` subdirectories), reducing memory footprint and persisting cache data across server restarts

### Fixed

- Image cache TTL is now enforced on every cache hit by checking file modification time - previously, cached images could persist indefinitely across server restarts even after the configured TTL had elapsed
- Team matching: slug prefix matches in the ESPN provider no longer produce a perfect score, reducing incorrect matches for inputs that are ambiguous prefixes of multiple team slugs
- `TeamNotFoundError` construction and available-team name extraction is now consistent across all providers, fixing cases where the error message omitted available teams depending on which provider handled the request

## [v1.6.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.6.0) - 2026-02-26

### Added
- Added `winner` query parameter for matchup endpoints (`/thumb`, `/cover`, `/logo`) to visually highlight the winner by rendering the losing team in greyscale (35% opacity + greyed colors).
- Added style **98**: “3D embossed with league logo” (style 99 remains “3D embossed” without league logo).
- Added optional root route behavior via `ROOT_REDIRECT_URL`:
  - When set, `GET /` returns a 301 redirect to the configured docs URL.
  - When not set, `GET /` returns a 444 with a docs suggestion (same overall “not found” semantics).
- Added/expanded league definitions in `leagues.json`:
  - Soccer: Euros + qualifying, UEFA Nations League, CONCACAF Nations League, AFCON + qualifying, English National League (+ north/south), FA Community Shield, FA Trophy, Scottish League Cup, English Women’s Super League
  - Hockey: EIHL
  - Cricket: The Hundred (men/women), IPL, BBL, CPL, BPL, PSL, MLC, NZ Super Smash, SA20, Nepal Premier League, T20 Blast
  - Rugby: Six Nations (men/women), URC, Premiership Rugby, EPCR Challenge Cup, Rugby World Cup (men/women), Rugby League World Cup, Super League, MLR
  - International baseball: World Baseball Classic (with light/dark logo assets)
  - Added generic `ncaa` league definition with NCAA logo and `fallbackLeague`

### Changed
- Improved team matching priority in `teamUtils`:
  - Reduced exact city match score (700 → 500)
  - Increased partial name/shortDisplayName match scores (400/300 → 700/650) so team-name matches beat city-only matches.
- NCAA route behavior: if the `:sport` segment isn’t a recognized NCAA shorthand, the route now calls `next()` so the generic `ncaa` league routes can handle it instead of returning a 400.
- Docker compose now maps `${PORT}` to `${PORT}` (instead of host `${PORT}` → container `3000`), aligning container port with the configured app `PORT`.

## [v1.5.2](https://github.com/sethwv/game-thumbs/releases/tag/v1.5.2) - 2026-02-07

### Fixed
- Hardened FlagCDN country/team resolution to reduce incorrect matches by:
  - Rejecting empty/whitespace-only inputs as not-found
  - Rejecting very short normalized inputs (< 2 characters)
  - Enforcing a minimum match score (≥ 700) before accepting a country match

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.5.0...v1.5.2

## [v1.5.1](https://github.com/sethwv/game-thumbs/releases/tag/v1.5.1) - 2026-02-05

### Fixed
- Improved FlagCDN country/team matching to better handle inputs without spaces (e.g., `unitedstates` → `united states`) by:
  - Scoring exact “no-spaces” matches highly
  - Adding “no-spaces starts-with” matching for partial inputs

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.5.0...v1.5.1

## [v1.5.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.5.0) - 2026-02-04

### Added
- Added **Custom Teams** support via `teams.json` (`custom: true`) for teams not present in any provider data (e.g., conference teams, all-star teams, special events). Custom teams:
  - Bypass provider lookups entirely
  - Can auto-extract colors from the provided logo when colors are omitted
  - Support aliases and resolve with highest priority
- Added Olympics league aliases (e.g., `olymh`, `olywh`, “winter olympics”, etc.).
- Added initial custom team entries:
  - NFL: **NFC** and **AFC** (custom teams with official ESPN logo URLs)
  - Olympics: **GB** alias expansion (Great Britain / UK variations)

### Changed
- Improved rendering controls for fallback/placeholder scenarios with a `skipLogos` flag so generators can intentionally render **no team logos** (used for Olympics missing-team fallback behavior).
- Updated thumbnail and logo split styles to hide the white divider line (set to transparent), while keeping the underlying geometry intact (easy to re-enable later).
- Improved badge handling:
  - Rejects empty/whitespace-only badge values
  - Normalizes badge text (trim + collapse multiple spaces)
- Standardized FlagCDN provider “not found” errors to `TeamNotFoundError` (instead of a country-specific error), aligning with the app’s fallback chain.
- Dev script now enables `ALLOW_CUSTOM_BADGES=true` by default.
- Dependency bumps: axios, canvas, cors.

### Fixed
- Prevented custom teams from being mis-logged as provider-resolved teams by ensuring “custom” resolution is identified consistently in fallback logging.

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.4.0...v1.5.0

## [v1.4.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.4.0) - 2026-01-25

### Added
- Added two new matchup image styles for thumbnails and covers:
  - Style 5: dark grid background
  - Style 6: grid background tinted with team colors
- Added automatic support for many ESPN leagues that aren’t configured in `leagues.json` by detecting them and generating a temporary league configuration on the fly.
- Added an NCAA provider to improve NCAA team logo coverage by fetching official NCAA SVG logos and converting them to PNG.
- Added team aliases for Missouri State across NCAA men’s basketball and NCAA men’s volleyball.
- Added `ncaa` as an additional provider option for several NCAA leagues, and changed many NCAA sports to fall back to NCAA men’s basketball for broader team coverage.
- Added new matchup logo default behavior: styles 1, 5, and 6 include the league logo by default (unless `logo=false`).
### Changed
- Improved team matching robustness, including better handling of “State”/“St” variations and making aliases usable across fallback/related leagues.
- Darkened extracted dominant colors slightly to improve contrast in generated images.
- Unified and strengthened `fallback=true` behavior across endpoints, including a last-resort text placeholder if league logo processing fails.
### Removed
- Removed the ESPN Direct Lookup API routes and documentation (direct `/espn/:sport/:league/...` endpoints).
### Fixed
- Improved fallback performance and reliability by resolving matchup teams in parallel, searching feeder leagues in parallel, and reusing a single processed league-logo placeholder when both teams are missing.
- (#86) Removed unsupported image types from accept header in imgUtils. This was preventing some NCAA logos from downloading and rendering correctly

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.3.0...v1.4.0

## [v1.3.1](https://github.com/sethwv/game-thumbs/releases/tag/v1.3.1) - 2026-01-19

### Fixed
- Improved image download/processing reliability by validating downloaded image content and rejecting unsupported formats (including SVG or HTML error pages) instead of failing later during rendering.
- Hardened fallback-team generation so invalid/empty league logo downloads are detected and handled cleanly.
- Improved matchup fallback behavior by resolving teams in parallel and reusing a single processed league-logo placeholder when both teams need fallback.

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.3.0...v1.3.1

## [v1.3.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.3.0) - 2026-01-18

### Added
- Added tennis support (ATP/WTA) for matchup thumbnails/logos/covers, including doubles teams via `+` (e.g., `djokovic+federer` vs `nadal+murray`).
- Added optional league feature flags to enable/disable high-cost athlete leagues (e.g., Tennis, MMA) via environment variables.
- Added new supported leagues:
  - USHL (HockeyTech)
  - English FA Cup, EFL Cup, Copa del Rey
  - Scottish leagues and cups (Premiership, Cup, Championship, League One, League Two)
- Added PWHL dark-mode league logo asset support.

### Changed
- Improved badge handling by allowing custom badge values when explicitly enabled via `ALLOW_CUSTOM_BADGES`.
- Improved team logo fallback by allowing leagues to pull missing logos from configured feeder leagues.
- Updated ESPN athlete provider behavior for athlete-based sports:
  - Uses sport-specific styling (e.g., tennis palettes) and better fallbacks (e.g., country flags when headshots are missing).
  - Improves cache behavior and startup performance by persisting provider cache to disk and refreshing in the background.
  - Adds rate limiting controls for ESPN athlete fetching to reduce the chance of provider throttling.

### Fixed
- Fixed split-style thumbnail generation so one missing/broken team logo no longer prevents the other team logo from rendering.
- Reduced failures/noise when athlete headshots are missing by treating expected ESPN headshot 404s as normal and falling back when possible.

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.2.0...v1.3.0

## [v1.2.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.2.0) - 2026-01-12

## Added
- Badge overlay support for images:
  - New `badge` query parameter supported across logo, thumb, and cover endpoints (for example `?badge=4K` or `?badge=ALT`).
  - Implemented server-side badge compositor: `helpers/imageUtils.addBadgeOverlay`.
  - Valid badge keywords list and validation helper `isValidBadge`.
- New hockey and junior-league assets:
  - Added assets: `assets/CSSHL.png`, `assets/ECHL.png`.
- New and expanded leagues in `leagues.json`:
  - Added: `ushl`, `ubl`, `engfa` (FA Cup), `bchl`, `sjhl`, `ajhl`, `mjhl`, `mhl`, `echl`, `ojhl`, `csshl`.
  - Expanded CHL/AHL providers and added logos / provider info for several junior leagues.
- HockeyTech tooling:
  - `providers/HockeyTechProvider` improvements to extract clientCode and apiKey, including external JS extraction.
  - New debug helper: `HockeyTechProvider.displayAllCredentials()`.
  - New npm script: `extract:hockeytech` to run the credential display utility.

## Changed
- Style 1 logo generation changed (breaking change):
  - The diagonal split logo (style 1) was reworked to a compact thumbnail-style footprint for logos, with updated logo selection, trimming, shadowing, and rendering behavior.
  - Note: We understand this is technically breaking, but we believe it is a positive change because feedback showed a majority of users disliked the original style.
- Routes updated to support badges and base-image caching:
  - `routes/{thumb,cover,logo,espn}.js` accept `badge` parameter and will reuse a cached base image (without badge) when possible, then add badge on top.
  - Cache writes updated to use shared `addToCache` and `getCachedImage` helpers.
- Image helper improvements:
  - `helpers/imageUtils.js` now includes the badge overlay compositor and badge cache.
  - Improved download, select, and trim logic, with better validation and logging.
  - `resolveTeamsWithFallback` now tries alternate providers in parallel when a team has no logo.
- Leagues JSON restructuring:
  - Reordered and cleaned section markers and added providers for several leagues.
- Tests:
  - `test/server-behavior.test.js` cache speedup expectation relaxed (from requiring greater than 30 percent to greater than 20 percent).
- package.json:
  - Added `extract:hockeytech` script.

## Fixed
- Various robustness fixes around image downloads, trimming, and logo fallback handling; improved logging on selection failures and provider fallbacks.

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.1.0...v1.2.0

## [v1.1.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.1.0) - 2026-01-05

### Added
- Added International Ice Hockey Federation (IIHF) league support for World Juniors competitions

### Changed
- Enhanced `fallback` parameter behavior for matchups:  missing teams now use a greyscale league logo (35% opacity) with light grey colors instead of returning an error or league image
- Improved team name matching to prevent short generic words (e.g., "Ohio") from incorrectly matching longer team names (e.g., "Ohio Wesleyan Battling Bishops")

### Fixed
- Fixed NCAA Women's Basketball (`ncaaw`) fallback league (now uses Football instead of Men's Basketball)

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.0.1...v1.1.0

## [v1.0.1](https://github.com/sethwv/game-thumbs/releases/tag/v1.0.1) - 2025-12-22

## Added
- International ice hockey support:
  - Add IIHF (International Ice Hockey Federation / World Juniors) league entry to leagues.json.
  - Add assets/IIHF.png used as the league logo.

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v1.0.0...v1.0.1

## [v1.0.0](https://github.com/sethwv/game-thumbs/releases/tag/v1.0.0) - 2025-12-11

## Notice
- Docker image tagging policy:
  - Starting with this release, each MAJOR version (for example, v2.0.0) will additionally be published with the latest-major tag. If you wish to receive only major-version updates, pin your Docker image to latest-major. The latest tag will continue to reference the most recently released version, and development builds are published automatically from the dev branch.

## Added
- ESPN Direct Lookup endpoints:
  - New direct endpoints that bypass leagues.json normalization: /espn/:sport/:league/(logo|thumb|cover), /espn/:sport/:league/:team/(...), and /espn/:sport/:league/:team1/:team2/(...).
  - Use case: query ESPN sport/league slugs directly for league/team/matchup images (teams still use normal matching).
- Athlete-based combat-sports support (ESPN Athlete provider):
  - Add UFC, PFL, and Bellator as athlete-based leagues where individual fighters are treated like "teams" for matchup generation.
  - Roster caching for athletes (72 hours) and use of headshots/stance images as fighter logos.
  - Automatic cache refresh scheduling for athlete rosters.
- FlagCDN provider and international coverage:
  - Add support for country flags and Olympic assets via a FlagCDN provider and new leagues (`country`, `olympics`) with high-resolution flags and ISO-code matching.
  - Automatic color extraction for flag thumbnails and 7-day caching for country/color data.
- HockeyTech provider and automatic config extraction:
  - Add HockeyTech provider plus automatic extraction/caching of HockeyTech clientCode/apiKey from configured league websites (auto-refreshing cache, 7-day default).
  - Add PWHL league (Professional Women's Hockey League) and HockeyTech site configuration entries for CHL/OHL/WHL/QMJHL.
- New deployment convenience:
  - Add docker-compose.yml for a recommended compose-based quick start.
  - Add Unraid deployment helper script and deployment webhook support for reporting container updates to GitHub (deployment integration).
- New assets and packaging:
  - Add assets/2026_OLYMPICS.png and assets/PWHL.png.
  - Add a LICENSE (MIT).
- leagues.json updates (integrated):
  - Added new leagues: `pwhl`, `ufc`, `pfl`, `bellator`, `olympics`, `country`, `nbag`, `uefa.wchampions` and related provider entries.

## Changed
- Provider system and discovery:
  - Provider manager now auto-discovers and loads provider implementations from the providers/ directory (no manual registration required).
  - Base provider and provider implementations include improved HTTP and rate-limit error handling with clearer error messages.
- Startup and caching:
  - Server startup preloads ESPN Athlete and HockeyTech provider caches asynchronously to reduce first-request latency for affected leagues.
  - ESPN Athlete and HockeyTech providers include scheduled cache refreshes (auto-refresh before expiry).
- Team resolution and error messages:
  - "Team not found" errors now surface available team lists gathered from searched/related leagues to make debugging and recovery easier.
  - ProviderManager resolves across feeder/fallback leagues more robustly and surfaces helpful available-team lists when appropriate.
- Image/route behavior and logos:
  - Thumbnail/cover/logo routes now omit league/logo metadata when no league logo is available (prevents empty placeholders); fallback behavior for ESPN Direct endpoints is consistent.
- Docker image and packaging:
  - Dockerfile updated for improved multi-arch build and OCI metadata (labels); image build workflow updated to support multi-platform buildx, caching, and automatic tagging rules.
- Configuration loading:
  - JSON merging behavior improved for additive directory-based configuration (json/teams, json/leagues) and better handling of custom overrides and aliases.

## [v0.6.3](https://github.com/sethwv/game-thumbs/releases/tag/v0.6.3) - 2025-12-06

### Added
- Add Canadian Hockey League (chl) assets and entries (assets/CHL.png, assets/CHL_50.png) and register CHL + feeder leagues (ohl, whl, qmjhl) in leagues.json and docs.
- Add 1:1 (square) aspect support to API docs and route handlers for covers and thumbs (docs and routes).
- Add new "Style 99" (3D embossed) image style and implementation (thumbnail/generator: 3D embossed generation).
- Add trimmed-logo caching + helper: loadTrimmedLogo and trimmed-logo cache in helpers/generators image utilities.
- Add axios dependency and switch network requests to axios (package.json + yarn.lock updates).
- Docs: new examples and API reference updates for aspect/style support and examples.

### Changed
- Move image generation modules from helpers/ to generators/ (genericImageGenerator.js, logoGenerator.js, thumbnailGenerator.js) and update all route imports.
- Refactor image utility code:
  - Replace colorExtractor.js (deleted) and fold color extraction into colorUtils.js (extractDominantColors moved/merged).
  - imageUtils rewritten to use axios, add trimmed-logo caching, add loadTrimmedLogo(), improve downloadImage(), and preserve logo aspect ratios when drawing.
  - drawLogoWithShadow now preserves aspect ratio and centers logos.
  - trimImage now supports optional caching and uses hashed cache keys.
- Thumbnail/generator changes:
  - Improve logo sizing and aspect-ratio handling across split/gradient/minimalist and other styles.
  - Add style 99 handling to thumbnail generator and the style list/validation.
- Provider refactors:
  - ESPNProvider and TheSportsDBProvider switched to axios, improved request/error handling, and now use getTeamMatchScoreWithOverrides for better abbreviation overrides.
  - Providers now use colorUtils.extractDominantColors instead of the removed colorExtractor module.
- teamMatchingUtils: add getTeamMatchScoreWithOverrides to prefer overridden abbreviations and fall back to original abbreviation.
- ProviderManager: tighten circular-feeder-league protection and prefer local logo URLs when selecting league logos.
- leagues.json and supported-leagues.md updated: add CFL, CHL, WHL, QMJHL entries and other league metadata changes.
- routes: update imports to new generator locations and add 1:1 aspect handling for cover/thumb routes.
- helpers/imageCache: more careful cache clearing and logging of cleared count.
- Various small data/formatting edits in README and JSON files (teams.json formatting/overrides tweaks).

### Removed
- helpers/colorExtractor.js (functionality merged into colorUtils).

### Fixed
- Preserve logo aspect ratio across generators (prevent stretched logos).
- Trim logos before loading where appropriate to avoid layout/overflow problems.
- Avoid uncaught/network parsing errors by switching API calls to axios and adding timeouts/explicit error handling in providers.
- Prevent infinite/circular feeder-league resolution loops by improving ProviderManager visited-league checks.
- Improve cache clearing logic to only remove files and report the actual cleared count.

## [v0.6.2](https://github.com/sethwv/game-thumbs/releases/tag/v0.6.2) - 2025-12-02

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v0.6.1...v0.6.2

## [v0.6.1](https://github.com/sethwv/game-thumbs/releases/tag/v0.6.1) - 2025-12-02

## v0.6.1

### New Features

#### Unified Endpoints
- Replaced many legacy, league-specific endpoints with unified endpoints:
  - Thumbnail: `/:league/thumb`, `/:league/:team/thumb`, `/:league/:team1/:team2/thumb`
  - Cover: `/:league/cover`, `/:league/:team/cover`, `/:league/:team1/:team2/cover`
  - Logo: `/:league/logo`, `/:league/:team/logo`, `/:league/:team1/:team2/logo`
- Legacy endpoints (e.g. `/:league/leaguelogo`, `/:league/:team/teamlogo`, `/:league/leaguethumb`, `/:league/leaguecover`) are marked deprecated — they still work but will be removed in a future major release. (See docs/DEPRECATIONS.md)

#### Improved Image Generation
- Added a consolidated/generic image generator for league and team images:
  - Better gradient blending using extracted colors
  - Contrast checking to pick alternate logo variants when available
  - Team-specific image generation (thumb/cover) that uses team colors for moody gradients

#### Feeder Leagues
- `feederLeagues` can be configured in league definitions to list related leagues to search when a team isn't found in the primary league (e.g., EPL → Championship → League One → League Two).
- ProviderManager now attempts feeder leagues (in order) before falling back to legacy `fallbackLeague` logic.

#### Enhanced Matching & Normalization
- Team and league matching now strips diacritics (Unicode NFD + removal of combining marks) and is accent-insensitive (e.g., "Atlético" → "Atletico", "Montréal" → "Montreal").
- Compact normalization updated to remove diacritics and non-alphanumeric chars for more reliable fuzzy matches.

#### Better "Team Not Found" Feedback
- When team resolution fails, the error message is enhanced to include available teams collected from the primary league, feeder leagues and fallback league (if configured), helping users pick the correct team identifier.

---

## Documentation

- 📚 New docs/DEPRECATIONS.md listing deprecated endpoints and migration guidance.
- Updated API reference and documentation pages reflecting unified endpoints and usage examples.
- Customization docs extended to document `feederLeagues` configuration and examples (how promotion/relegation or development/feeder systems are searched).
- Team-matching and technical docs updated for accent-insensitive matching and route loading behavior.

---

## Configuration Changes

- leagues.json: new `feederLeagues` property added for many leagues (and many league entries updated/expanded).
- teams.json: new sample team aliases added (including some NCAA entries).
- Route files now include unified route paths for thumb/cover/logo and pages updated to use the new generic image generator.

---

## Bug Fixes

- Fixed various matching edge-cases by normalizing league lookup and alias comparisons (now removes diacritics and non-alphanumeric chars before matching).
- Resolved route registration ordering issues by introducing route priority and deterministic registration order.
- Improved team slug normalization and alias lookup reliability.

---

## Migration Notes

- Existing endpoints continue to work; however:
  - Prefer the unified endpoints listed above going forward.
  - Update any tooling that references deprecated endpoints to use unified paths; see docs/DEPRECATIONS.md for mapping.

---

## Full Diff
https://github.com/sethwv/game-thumbs/compare/v0.6.0...v0.6.1

## [v0.6.0](https://github.com/sethwv/game-thumbs/releases/tag/v0.6.0) - 2025-11-26

## Version 0.6.0 Released!

### New Features

#### Multi-Provider System
- Leagues can now have multiple data providers with priority ordering
- New **TheSportsDB Provider** for OHL, AHL, and enhanced EPL support
- Automatic provider type inference from config structure
- 72-hour caching for TheSportsDB (free tier friendly)

#### New Leagues
- `ohl` - Ontario Hockey League
- `ahl` - American Hockey League

#### League-Only Images
- `/:league/leaguethumb[. png]` - League thumbnail with moody gradient (1440x1080)
- `/:league/leaguecover[.png]` - League cover with moody gradient (1080x1440)
- Auto-selects logo variant based on contrast

#### Team Customization (`teams.json`)
- Define custom team aliases (e.g., "man utd" → Manchester United)
- Override team data (colors, logos, abbreviations, etc.)
- Volume mount for easy Docker customization
- Highest priority in team matching

#### Flexible Aspect Ratios
- Thumbnails: `? aspect=4-3` (default) or `?aspect=16-9`
- Covers: `?aspect=3-4` (default) or `?aspect=9-16`

#### Fallback Mode
- Add `?fallback=true` to thumb/cover/logo endpoints
- Returns league image instead of error when teams not found

#### XC API Proxy
- Proxies Xtream Codes IPTV API: `/xc/:upstream/:endpoint`
- Replaces logos in M3U playlists and JSON with EPG data
- 3-tier matching: tvg-id → channel number → channel name
- See documentation for configuration and security considerations

### Enhancements

- **Improved team matching**: Better location concatenation (e.g., "losangelesfc" → "LAFC")
- **Logo sizing fixes**: Proper aspect ratio maintenance, reduced circle logo size (95% → 80%)
- **CORS configuration**: `CORS_ORIGIN` and `CORS_MAX_AGE` env vars
- **Cleaner logs**: Browser icon requests handled with 204, obfuscated credentials in XC proxy logs

### Documentation

- **New docs site**: Complete Jekyll documentation at game-thumbs-docs.swvn.io
- **Simplified README**: Now focuses on quick start, points to full docs
- Comprehensive guides for API, team matching, customization, and contributing

### Configuration Changes

**New Files:**
- `teams. json` - Team customization config
- `docs/` - Documentation site

**Updated:**
- `leagues.json` - Now uses `providers` arrays instead of single `providerId`
- `package.json` - New `npm run xcproxy` script

**New ENV Vars:**
- `APP_MODE` - Set to `xcproxy` for proxy-only mode
- `XC_PROXY` - Enable XC proxy (see docs for defaults)
- `XC_PROXY_UPSTREAM` - Configure upstream servers (`id=http://server:port`)
- `CORS_ORIGIN` - Set allowed CORS origins (default: `*`)
- `CORS_MAX_AGE` - CORS preflight cache duration (default: 86400)
- `THESPORTSDB_API_KEY` - Premium API key for TheSportsDB (optional)

### Bug Fixes

- Fixed provider detection with new config structure
- Team overrides now properly applied after resolution
- Fallback leagues work correctly with multi-provider system
- Team slug normalization (remove prefixes, fix underscores)

---

## Migration Notes

**No action required** - all existing functionality works unchanged.

**To use new features:**
- Custom aliases: Mount `teams.json` volume
- XC Proxy: See documentation for configuration
- New leagues: Use `ohl` or `ahl` codes
- Aspect ratios: Add `?aspect=16-9` or `?aspect=9-16`

---

**Full Diff:** https://github.com/sethwv/game-thumbs/compare/v0.5.2...v0.6.0

## [v0.5.2](https://github.com/sethwv/game-thumbs/releases/tag/v0.5.2) - 2025-11-08

## What's Changed
* Add soccer leagues by @ferteque in https://github.com/sethwv/game-thumbs/pull/13

## New Contributors
* @ferteque made their first contribution in https://github.com/sethwv/game-thumbs/pull/13

**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v0.5.1...v0.5.2

## [v0.5.1](https://github.com/sethwv/game-thumbs/releases/tag/v0.5.1) - 2025-11-05

## What's Changed
* League Logos & Logging Fixes by @sethwv in https://github.com/sethwv/game-thumbs/pull/12


**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v0.5.0...v0.5.1

## [v0.5.0](https://github.com/sethwv/game-thumbs/releases/tag/v0.5.0) - 2025-11-04

## [v0.4.0](https://github.com/sethwv/game-thumbs/releases/tag/v0.4.0) - 2025-10-29

## What's Changed
* include cover in cache checking by @sethwv in https://github.com/sethwv/game-thumbs/pull/6
* Big Refactor Time by @sethwv in https://github.com/sethwv/game-thumbs/pull/7
* Dev by @sethwv in https://github.com/sethwv/game-thumbs/pull/8
* Logo Cropping by @sethwv in https://github.com/sethwv/game-thumbs/pull/9


**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v0.3.2...v0.4.0

## [v0.3.2](https://github.com/sethwv/game-thumbs/releases/tag/v0.3.2) - 2025-10-24

## [v0.3.1](https://github.com/sethwv/game-thumbs/releases/tag/v0.3.1) - 2025-10-23

## [v0.3.0](https://github.com/sethwv/game-thumbs/releases/tag/v0.3.0) - 2025-10-23

## What's Changed
* Attempt to add strokes to team logos that match too much at the expense of some speed by @sethwv in https://github.com/sethwv/game-thumbs/pull/2


**Full Changelog**: https://github.com/sethwv/game-thumbs/compare/v0.2.0...v0.3.0

## [v0.2.0](https://github.com/sethwv/game-thumbs/releases/tag/v0.2.0) - 2025-10-23

## [v0.1.0](https://github.com/sethwv/game-thumbs/releases/tag/v0.1.0) - 2025-10-23
