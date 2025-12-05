# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Processed commits: 2379012,3cf215c,591d468,60abcc4,619e355,702bcc6,73cbb9e,8232bf7,8f0282d,b316651,dc57ad3 -->

### Added

- Introduced a mechanism to track which commits belong to which version for better metadata management in the changelog.
- Added comments to clarify the purpose of new logic in `process_in_chunks` function.
- Implemented a check to handle cases where no commits exist for a version tag, ensuring the changelog remains informative.
- Added AI-powered changelog generation workflow in `.github/workflows/changelog.yml`.
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`.
- Added script for processing changelog in `.github/workflows/scripts/process-changelog-chunked.py`.
- Included script for formatting changelog in `.github/workflows/scripts/format-changelog.py`.
- Implemented scripts for generating prompts in `.github/workflows/scripts/generate-backfill-prompt.py` and `.github/workflows/scripts/generate-update-prompt.py`.
- Added Axios as a dependency in `package.json` for handling HTTP requests.
- Introduced `getTeamMatchScoreWithOverrides` function in `helpers/teamMatchingUtils.js` to consider overridden abbreviations in team matching.
- Introduced logic in `parse_and_merge_entries` to track commit hashes from batch metadata.
- Added functionality to embed processed commit hashes in the generated changelog for both unreleased and released entries.
- Added scripts for generating prompts for backfilling and updating changelogs.
- Implemented a Python script to process changelog data in chunks for large requests.
- Included a new script for formatting the generated changelog for consistent output.
- Introduced getTeamMatchScoreWithOverrides function in helpers/teamMatchingUtils.js to consider overridden team abbreviations during matching.
- Added support for team overrides in ESPNProvider and TheSportsDBProvider.

### Changed

- Modified `format_changelog` function to accept an additional parameter `version_commit_hashes` for mapping version tags to sets of commit hashes.
- Enhanced handling of versions without detailed changes extracted by embedding metadata in the changelog.
- Updated logic to append a note for versions with processed commits but no entries extracted.
- Refined the process of building a mapping of commits to versions for better tracking in the changelog.
- Updated regex in `process-changelog-chunked.py` to match multiple commit hashes in the format "v0.6.2: abc1234,def5678 | v0.6.1: ghi9012".
- Enhanced `parse_and_merge_entries` function to split and update commit hashes from matched groups.
- Modified `merge_changelog_entries` to embed processed commit hash metadata for both unreleased and version entries.
- Adjusted logic in `process_in_chunks` to retain entry blocks without stripping batch comments for processing.
- Updated the commit message format in `.github/workflows/changelog.yml` to use "Changelog Update #${{ github.run_number }}" instead of the previous format.
- Changed the branch naming convention for changelog updates to `changelog/${{ github.run_number }}` in `.github/workflows/changelog.yml`.
- Updated the changelog generation workflow to filter out already processed commits, improving efficiency.
- Implemented chunked processing for changelog generation to handle larger requests consistently.
- Enhanced error handling in the changelog generation process to provide clearer output on failures.
- Updated the GitHub Actions workflow for changelog generation to use `peter-evans/create-pull-request@v7` for creating pull requests.
- Moved `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from `helpers` to `generators` directory.
- Updated import paths in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to reflect the new directory structure.
- Consolidated color utility functions into `colorUtils.js`, adding functions for fetching images, converting RGB to hex, and calculating color brightness.
- Removed `colorExtractor.js` as its functionality has been integrated into `colorUtils.js`.
- Migrated web requests from https to Axios in helpers/colorExtractor.js for improved request handling.
- Refactored downloadImage function in helpers/imageUtils.js to use Axios for downloading images.
- Updated ESPNProvider to use Axios for fetching team data, replacing the previous https request handling.
- Modified TheSportsDBProvider to utilize getTeamMatchScoreWithOverrides for improved team matching.

### Removed

- Deleted backfill prompt template as it is no longer needed.
- Removed update prompt template since it is no longer required.
- Eliminated the script for formatting changelog entries due to changes in the workflow.
- Removed the manual git commands for creating branches and committing changes in the changelog workflow.
- Deleted `helpers/colorExtractor.js` which contained functions for extracting dominant colors from images.
- Eliminated the format changelog script, as its functionality has been integrated into the main workflow.
- Eliminated old promise-based request handling in ESPNProvider and TheSportsDBProvider in favor of async/await with Axios.

### Fixed

- Corrected the logic for handling cases where the AI response did not split entries by version headers, ensuring all entries are accounted for.
- Corrected logic in `merge_changelog_entries` to ensure that merged entries are appended correctly with associated commit hashes.
- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.
- Corrected logic to check for new commits to process, ensuring accurate changelog updates.
- Fixed handling of dirty working directory states to correctly append `-dirty` to the current version when applicable.
- Corrected the logic to ensure that the entry text is properly stripped of batch comments before processing in `process-changelog-chunked.py`.
- Resolved issues with detecting changes in the `CHANGELOG.md` file to ensure accurate updates.

### Cleaned Up

- Added a cleanup step to remove temporary files generated during the changelog processing.

## [v0.6.2] - 2025-12-02

### Added

- Added support for a new visual style (Style 99) for covers and thumbnails, featuring a 3D embossed design with textured backgrounds and reflections.
- Introduced a new API endpoint for covers with aspect ratio 1:1 (GET /nba/cover?aspect=1-1).
- Added a new function `loadTrimmedLogo` for loading team logos with automatic selection, downloading, and trimming.
- Introduced environment variables in `.github/workflows/rebase-dev.yml` to track conflict resolution status.
- Included summary of latest commits on the dev branch in the GitHub Actions workflow summary in `.github/workflows/rebase-dev.yml`.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Created new API reference documentation for cover endpoints in `docs/api-reference/cover.md`.
- Introduced internal JSON backups during Docker build in `Dockerfile`.
- Added paths-ignore for documentation in Docker build workflow to improve efficiency.
- Added Dependabot configuration in `.github/dependabot.yml` to automate dependency updates.
- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.

### Changed

- Updated the documentation for the cover API to include the new aspect ratio option and Style 99.
- Enhanced the image cache management in `helpers/imageCache.js` to report the number of cleared cached images.
- Improved the `drawLogoWithShadow` function to maintain the aspect ratio when drawing logos.
- Refactored the `trimImage` function to support caching based on the hash of the original image buffer.
- Updated the GitHub Actions workflow in `.github/workflows/rebase-dev.yml` to include a step for force pushing the rebased dev branch and improved conflict resolution messaging.
- Configured Git settings for automatic conflict resolution and rerere (reuse recorded resolution) in `.github/workflows/rebase-dev.yml`.
- Updated `.dockerignore` to include internal JSON backups and custom JSON configuration directories.
- Modified `.gitignore` to exclude output directory and keep `.gitkeep`.
- Adjusted Dockerfile to create directories for additional JSON configuration files.
- Enhanced rebase-dev workflow to include detailed logging and conflict resolution steps.
- Updated build-docker workflow to prevent actions from dependabot and GitHub actions bots.
- Updated `express` dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Updated API reference documentation to reflect unified endpoints structure in `docs/api-reference/index.md`.
- Updated NCAA route documentation to include new `raw` image type in `docs/api-reference/ncaa-route.md`.
- Enhanced customization documentation to include `feederLeagues` in `docs/customization.md`.
- Modified `Dockerfile` to install `git` alongside canvas dependencies for the `/info` endpoint.
- Updated `README.md` to reflect changes in API description and usage instructions.
- Enhanced `express.js` with additional functionality.
- Improved `helpers/teamMatchingUtils.js` for better team matching logic.
- Refined `providers/TheSportsDBProvider.js` to enhance data fetching capabilities.
- Updated `routes/xcproxy.js` to streamline proxy functionality.
- Updated README.md to include a note about the use of publicly available ESPN APIs and logos, and corrected the MLB endpoint example.

### Deprecated

- Deprecated legacy league-specific endpoints in `docs/DEPRECATIONS.md` with a migration guide to unified endpoints.

### Removed

- Removed obsolete helper functions from `helpers/leagueImageGenerator.js`.
- Deleted unnecessary files related to previous testing strategies.
- Removed unused assets from the `assets` directory, including `ncaa.png`, `ncaab.png`, and `ncaaf.png`.

### Fixed

- Fixed the cache clearing logic in `helpers/imageCache.js` to correctly report the number of cleared files.
- Resolved potential issues with handling logo loading errors in the `loadTrimmedLogo` function by adding error logging.
- Corrected handling of unresolved conflicts in the rebase process within `.github/workflows/rebase-dev.yml`.

## [v0.6.1] - 2025-12-02

### Added

- Introduced new `DEPRECATIONS.md` file to document deprecated features and endpoints.
- Added new helper functions in `helpers/genericImageGenerator.js` for image generation.
- Added new helper functions in `helpers/leagueImageGenerator.js` for league image generation.

### Changed

- Updated multiple API documentation files to reflect changes in endpoint structures and deprecations.
- Modified `express.js` to improve routing logic and support new unified endpoints.
- Updated `teams.json` to include additional team data.

### Fixed

- Fixed various bugs in routing files including `routes/cover.js` and `routes/logo.js` to ensure proper image serving.

## [v0.6.0] - 2025-11-26

<!-- Processed commits: 9a5189b -->

### Changed
- Version release (no detailed changes extracted)

## [v0.5.2] - 2025-11-08

### Added

- Introduced new soccer leagues in `leagues.json` with ESPN configuration details.

## [v0.5.1] - 2025-11-05

### Added

- Added logging configuration options in `README.md` for `LOG_TO_FILE` and `MAX_LOG_FILES`.
- Introduced new API endpoints for team logos and league logos: `/:league/:team/teamlogo[.png]` and `/:league/leaguelogo[.png]`.
- Added log file rotation and cleanup functionality when `LOG_TO_FILE` is enabled.
- Implemented logging of route registration in `express.js` with `logger.info`.

### Changed

- Updated `.gitignore` to include logs directory and log files.
- Modified API documentation in `README.md` to include new endpoints for team and league logos.
- Changed middleware in `express.js` to include `teamlogo` and `leaguelogo` in cache checking and rate limiting.
- Changed logger error handling to include error objects in `helpers/logger.js`.

### Fixed

- Fixed issues with logging socket errors and timeouts in `express.js` by improving error handling.

## [v0.5.0] - 2025-11-04

### Added

- Added health check to Dockerfile with a command to verify the application is running.
- Introduced new environment variables in Dockerfile: `IMAGE_CACHE_HOURS`, `RATE_LIMIT_PER_MINUTE`, `FORCE_COLOR`, and `NODE_ENV`.
- Added color extraction functionality to automatically extract dominant colors from team logos when ESPN doesn't provide them.
- Added fallback mechanism for NCAA Women's sports to automatically use men's teams when a team is not found.
- Updated README to include detailed descriptions of new environment variables and their defaults.
- Added support for 30+ leagues in the README, expanding the multi-sport support description.

### Changed

- Modified the Dockerfile to set default environment variables for server configuration.
- Updated README to reflect changes in API endpoints and supported leagues.
- Updated the API documentation to clarify the usage of the `.png` extension as optional for image endpoints.
- Revised the API routes section in the README to include new NCAA shorthand routes.

### Removed

- Removed the ESPN provider implementation from `providers/ESPN.js` as it was deprecated.

### Fixed

- Fixed formatting issues in the README to improve clarity and readability of the API documentation.

## [v0.4.0] - 2025-10-28

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Added support for additional leagues: WNBA, UFL, EPL, MLS, UEFA Champions League, NCAA Men's Basketball, NCAA Women's Basketball.
- Introduced new images for NCAA teams: ncaa.png, ncaab.png, ncaaf.png.
- Added `fetchLeagueData` function to retrieve league data from ESPN API.

### Changed

- Updated GitHub Actions workflow in `.github/workflows/build-docker.yml` to include `test/.*` branch for Docker image builds.
- Corrected the league abbreviation from `naacw` to `ncaaw` in `leagues.js` for NCAA Women's Basketball.
- Changed the import path for `fetchLeagueData` in `helpers/imageUtils.js` from `./ESPNTeamResolver` to `../providers/ESPN`.
- Updated API request limit from 500 to 1000 in `fetchTeamData` function in `providers/ESPN.js`.
- Modified the logo generation route in `routes/logo.js` to include `trim` parameter in the logo options.
- Updated README.md to reflect new supported leagues and API parameters.
- Changed logo display parameter to default to true in API examples.
- Refactored `ESPNTeamResolver.js` to improve team data fetching and caching logic.
- Updated Dockerfile to include ttf-dejavu package for font support.
- Updated cache checking middleware in express.js to include cover requests alongside thumb and logo requests.

### Removed

- Removed hardcoded API endpoints for different leagues in `fetchTeamData` in favor of dynamic resolution.

### Fixed

- Fixed import paths in multiple route files (`routes/cover.js`, `routes/logo.js`, `routes/raw.js`, `routes/thumb.js`) to use the new `providers/ESPN` module instead of the deprecated `helpers/ESPNTeamResolver`.
- Fixed caching logic in `fetchTeamData` to ensure proper data retrieval and expiration.
- Resolved issue where unsupported leagues would throw an error without proper handling.

## [v0.3.2] - 2025-10-23

### Added

- Added new API endpoint for Cover generation at `/:league/:team1/:team2/cover`.
- Added new API endpoint for Logo generation at `/:league/:team1/:team2/logo`.
- Introduced support for multiple style variations in image generation.

### Changed

- Updated README.md to include detailed API routes and examples for Thumbnail, Cover, and Logo generation.
- Enhanced the logo generation logic to include an optional white stroke for logos without existing outlines.

## [v0.3.1] - 2025-10-23

### Changed

- Updated logo and thumbnail endpoints to explicitly support `.png` naming in the URL.
- Improved route registration in express.js to support multiple paths for logo and thumbnail endpoints.

## [v0.3.0] - 2025-10-23

### Added

- Introduced constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in thumbnailGenerator.js.

### Changed

- Enhanced the `generateDiagonalSplit` function to draw a white diagonal line and improved logo rendering logic based on background color similarity.
- Updated the logic to determine if logos need an outline based on their average color compared to the background.
- Improved caching mechanism for white logos in `getWhiteLogo` function to use a checksum for cache key generation.

### Fixed

- Fixed URL encoding for Los Angeles in API examples in README.md.

## [v0.2.0] - 2025-10-23

### Added

- Added .gitignore file to exclude unnecessary files from version control.
- Added README.md file with project description and API usage instructions.
- Introduced logoGenerator.js helper for dynamic logo generation.
- Added thumbnailGenerator.js helper for creating matchup thumbnails.
- Added routes for logo generation in routes/logo.js.
- Added routes for thumbnail generation in routes/thumb.js.

### Changed

- Updated express.js to enhance server functionality.
- Modified thumbnailGenerator.js to support multiple styles and caching.
- Enhanced README.md with detailed API routes and examples.

## [v0.1.0] - 2025-10-23

### Added

- Added .dockerignore file to exclude files from Docker builds.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Added Dockerfile for containerizing the application.
- Implemented ESPNTeamResolver.js helper for resolving team information.
- Added imageCache.js helper for caching generated images.
- Introduced index.js as the main entry point for the application.
- Updated package.json to include necessary dependencies.
- Added routes/thumb.js for handling thumbnail requests.

### Changed

- Updated express.js to improve routing and middleware handling.
- Enhanced build-docker.yml for better image tagging and handling.
