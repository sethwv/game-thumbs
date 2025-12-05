# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added AI-powered changelog generation workflow in `.github/workflows/changelog.yml`.
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`.
- Added script for processing changelog in `.github/workflows/scripts/process-changelog-chunked.py`.
- Included script for formatting changelog in `.github/workflows/scripts/format-changelog.py`.
- Implemented scripts for generating prompts in `.github/workflows/scripts/generate-backfill-prompt.py` and `.github/workflows/scripts/generate-update-prompt.py`.
- Added Axios as a dependency in package.json for handling HTTP requests.
- Introduced `getTeamMatchScoreWithOverrides` function in helpers/teamMatchingUtils.js to consider overridden abbreviations in team matching.

### Changed

- Updated the commit message format in `.github/workflows/changelog.yml` to use "Changelog Update #${{ github.run_number }}" instead of the previous format.
- Enhanced the `parse_and_merge_entries` function in `process-changelog-chunked.py` to return both formatted text and a set of commit hashes.
- Added logic to extract commit hashes from batch metadata and VERSIONS metadata in `process-changelog-chunked.py`.
- Updated the `format_changelog` function in `process-changelog-chunked.py` to embed processed commit hash metadata in the changelog output for both unreleased and version entries.
- Enhanced changelog generation by extracting already processed commit hashes from existing changelog.
- Implemented filtering of already processed commits to avoid duplication in changelog.
- Changed the processing method to always use chunked processing for consistency in changelog generation.
- Updated the changelog creation process to utilize the `peter-evans/create-pull-request@v7` action for better management of pull requests.
- Modified the logic for checking changes in `CHANGELOG.md` to improve detection of untracked files.
- Moved `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from the `helpers` directory to a new `generators` directory.
- Updated import paths in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to reflect the new directory structure.
- Consolidated color utility functions into `colorUtils.js` after removing `colorExtractor.js`.
- Migrated HTTP requests from the native https module to Axios in helpers/colorExtractor.js for fetching images.
- Updated the downloadImage function in helpers/imageUtils.js to use Axios for downloading images with timeout protection.
- Refactored ESPNProvider.js to utilize Axios for API requests instead of the native https module.
- Modified TheSportsDBProvider.js to use the new `getTeamMatchScoreWithOverrides` function for team matching.
- Adjusted team matching logic in ESPNProvider.js to extract team slug for override lookup.

### Removed

- Deleted backfill prompt template as it is no longer needed.
- Removed update prompt template since it is no longer required.
- Eliminated the script for formatting changelog entries due to changes in the workflow.
- Removed the manual git commands for creating branches and committing changes in the changelog workflow.
- Deleted `helpers/colorExtractor.js` which contained functions for extracting dominant colors from images.

### Fixed

- Corrected the output of the changelog summary to include the source branch instead of just the branch name.
- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.

### Cleaned Up

- Added a cleanup step to remove temporary files generated during the changelog processing.

## [v0.6.2] - 2025-12-02

### Added

- Added support for new style 99 in cover and thumbnail generation with 3D embossed effects and textured backgrounds.
- Introduced new aspect ratio option `1-1` (1080x1080) for both cover and thumbnail endpoints.
- Implemented a new function `loadTrimmedLogo` to streamline logo loading with automatic selection and trimming.
- Added configuration for automatic conflict resolution using the "union" merge tool in `.github/workflows/rebase-dev.yml`.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Introduced cover endpoint documentation in `docs/api-reference/cover.md`.
- Created internal JSON backups in the Dockerfile for backward compatibility.
- Added directories for additional JSON configuration files in the Dockerfile.
- Added permissions for the dev branch update workflow to allow write access.
- Added Dependabot configuration in `.github/dependabot.yml` for automated dependency updates.
- Added support for new soccer leagues: La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.

### Changed

- Updated documentation for `cover.md` and `thumb.md` to include new aspect ratio and style options.
- Enhanced image cache management by adding a count of cleared cached images in `imageCache.js`.
- Modified `drawLogoWithShadow` function to maintain aspect ratio while drawing logos.
- Improved `trimImage` function to include caching logic based on image buffer hash.
- Updated GitHub Actions workflow in `rebase-dev.yml` to include better conflict resolution logging and force push after rebase.
- Updated rebase strategy to use recursive merge with patience diff algorithm in `.github/workflows/rebase-dev.yml`.
- Updated `.dockerignore` to include internal JSON backups and custom JSON configuration directories.
- Modified `.gitignore` to ignore output files and allow keeping `.gitkeep`.
- Enhanced Dockerfile to create internal backups for teams and leagues JSON files.
- Updated `.github/workflows/build-docker.yml` to ignore documentation changes during build triggers.
- Adjusted the rebase-dev workflow to include a summary of the rebase process.
- Bumped `express` version from `5.2.0` to `5.2.1` in `package.json`.
- Updated `express` version from `5.1.0` to `5.2.0` in `package.json`.
- Updated `yarn.lock` to reflect changes in `express` version.
- Added `feederLeagues` property in `customization.md` for league configuration.
- Updated documentation in `docs/api-reference/index.md` to reflect new unified endpoints.
- Updated Dockerfile to include git installation for `/info` endpoint functionality.
- Modified README.md to reflect updated features and quick start instructions.
- Enhanced health check command in Dockerfile for better reliability.
- Updated environment variable descriptions in README.md for clarity.
- Updated `helpers/thumbnailGenerator.js` to improve color similarity checks by introducing constants for thresholds and outline widths.
- Refactored `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js` to utilize constants for line extension and outline width.
- Enhanced `shouldAddOutlineToLogo` function in `helpers/thumbnailGenerator.js` to use a constant for color similarity threshold.
- Modified `getWhiteLogo` function in `helpers/thumbnailGenerator.js` to generate a checksum for caching instead of using the image source directly.

### Removed

- Removed `helpers/leagueImageGenerator.js` due to refactoring.
- Deleted deprecated helper functions in `helpers/colorUtils.js`.
- Removed unused assets: `ncaa.png`, `ncaab.png`, and `ncaaf.png`.

### Fixed

- Fixed issue where trimmed logo cache was not being cleared on startup in `imageUtils.js`.
- Resolved potential errors in logo loading process by adding error handling in `loadTrimmedLogo` function.
- Corrected logging messages in the image cache management to accurately reflect the number of cleared images.
- Fixed handling of unresolved conflicts by checking for remaining conflicts before continuing the rebase in `.github/workflows/rebase-dev.yml`.
- Fixed issues in the rebase-dev workflow to handle conflicts more gracefully.
- Resolved missing test results handling in automated testing workflow.

## [v0.6.1] - 2025-12-02

### Added

- Introduced `DEPRECATIONS.md` to document deprecated features and endpoints.
- Added examples for NCAA shorthand routes in `docs/api-reference/ncaa-route.md`.
- Added support notice for XC API Proxy in `docs/api-reference/xc-proxy.md`.

### Changed

- Updated API reference documentation in `docs/api-reference/index.md` to include unified endpoints.
- Revised `docs/customization.md` to include examples of league hierarchy with feeder leagues.
- Updated multiple API documentation files to reflect changes in endpoint structure and deprecations.
- Modified `helpers/genericImageGenerator.js` and `helpers/leagueImageGenerator.js` to enhance image generation functionality.
- Improved `routes` files to streamline endpoint handling and image retrieval processes.

## [v0.6.0] - 2025-11-26

### Added

- Introduced new API reference documentation for league and matchup endpoints in `docs/api-reference/`.
- Added comprehensive contributing guidelines in `docs/contributing.md`.
- Included customization instructions in `docs/customization.md`.
- Added detailed technical documentation in `docs/technical-details.md`.
- Added new helper functions in `helpers/leagueImageGenerator.js` for improved image processing.

### Changed

- Refactored `Dockerfile` to improve build efficiency and clarity.
- Updated `README.md` to provide a more concise overview of the API and its capabilities.
- Enhanced `express.js` for better routing and middleware handling.
- Improved team matching logic in `helpers/teamMatchingUtils.js`.

### Fixed

- Fixed various bugs in `providers/ESPNProvider.js` and `providers/TheSportsDBProvider.js` to ensure accurate data retrieval.
- Corrected issues in `routes/xcproxy.js` to enhance proxy functionality.

## [v0.5.2] - 2025-11-08

### Changed
- Version release

## [v0.5.1] - 2025-11-05

### Added

- Added logging configuration options in `README.md` for `LOG_TO_FILE` and `MAX_LOG_FILES`.
- Added logging functionality to write logs to files in the `./logs` directory with automatic rotation.
- Implemented file logging in `helpers/logger.js`.

### Changed

- Updated `.gitignore` to include logs directory and log files.
- Modified `express.js` to include `teamlogo` and `leaguelogo` in cache and rate limiting checks.
- Updated `README.md` to reflect new API endpoints and their parameters for team and league logos.

### Fixed

- Fixed unhandled route error logging in `express.js` to include error stack traces.

## [v0.5.0] - 2025-11-04

### Added

- Added health check to Dockerfile for monitoring application status.
- Introduced new environment variables: `IMAGE_CACHE_HOURS`, `RATE_LIMIT_PER_MINUTE`, `FORCE_COLOR`, and `NODE_ENV`.
- Added support for 30+ leagues in README, including detailed NCAA sports.
- Implemented color extraction feature to automatically extract dominant colors from team logos.
- Added fallback mechanism for NCAA Women's sports to use Men's teams when not found.

### Changed

- Updated README to reflect new features and environment variable configurations.
- Modified image caching behavior to include both images and team data for 24 hours.
- Enhanced API documentation with detailed descriptions of supported leagues and endpoints.
- Changed default value for `FORCE_COLOR` in environment variables from `false` to `1`.
- Updated Dockerfile to include additional environment variables with defaults.

### Removed

- Removed ESPN provider implementation in `providers/ESPN.js`.
- Deleted unnecessary code and files related to the old ESPN provider.

### Fixed

- Fixed formatting issues in README for better clarity and presentation.
- Resolved inconsistencies in API endpoint descriptions and parameters in the documentation.

## [v0.4.0] - 2025-10-28

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Added support for Women's National Basketball Association (WNBA) in the API.
- Added NCAA Women's Basketball to the list of supported leagues.
- Added new images for NCAA Football, NCAA Men's Basketball, and NCAA Women's Basketball.
- Added `ttf-dejavu` package to the Dockerfile for font support.
- Introduced new query parameter options for thumbnail and cover generation in README.md, including styles for gradient blends and minimalist badges.
- Added support for location abbreviations in `ESPNTeamResolver.js` to enhance team matching capabilities.
- Implemented a new function `expandLocationAbbreviations` to handle location abbreviations in user input.

### Changed

- Updated GitHub Actions workflow in `.github/workflows/build-docker.yml` to trigger on `test/.*` branches in addition to `dev`.
- Renamed `helpers/ESPNTeamResolver.js` to `providers/ESPN.js` and updated all references accordingly.
- Changed the API URL in `providers/ESPN.js` to increase the limit of teams fetched from 500 to 1000.
- Modified the `README.md` to correct the league abbreviation for NCAA Women's Basketball from `naacw` to `ncaaw`.
- Updated `resolveTeam` import paths in `routes/cover.js`, `routes/logo.js`, `routes/raw.js`, and `routes/thumb.js` to reflect the new location of `ESPN.js`.
- Adjusted the `logoOptions` in `routes/logo.js` to include the `trim` parameter based on query input.
- Updated README.md to reflect the expanded list of supported leagues.
- Modified the `fetchTeamData` function to use a dynamic API endpoint based on league type.
- Updated the logo display option in the API to default to true.
- Enhanced the `getMatchScore` function to improve team matching accuracy.
- Modified cache checking middleware in `express.js` to include 'cover' paths in addition to 'thumb' and 'logo'.

### Fixed

- Fixed incorrect league abbreviation for NCAA Women's Basketball in `leagues.js`.
- Resolved issues with league data fetching in `fetchLeagueData` function.
- Fixed potential errors in team data fetching when unsupported leagues are requested.
- Corrected parsing errors in API responses to ensure proper data handling.
- Corrected the handling of logo display options in the README.md examples to reflect the new query parameters.
- Improved the normalization process in `ESPNTeamResolver.js` to handle spaces and non-alphanumeric characters more effectively.

## [v0.3.2] - 2025-10-23

### Added

- Added new helper `logoOutline.js` for adding white outlines to logos.
- Introduced `outline` option in logo generation to add white stroke to team logos without existing outlines.
- Added support for explicit `.png` naming in logo and thumbnail generation endpoints.

### Changed

- Updated README.md to include detailed API endpoint information for thumbnail, cover, and logo generation.
- Modified `generateLogo` function to accept `outline` parameter for logo generation.
- Adjusted logo size calculation to use 50% of the canvas for each logo and reduced spacing to 0.5%.
- Enhanced thumbnail generation endpoint to clarify that the `.png` extension is optional.
- Updated route registration logic in `express.js` to support multiple paths for logo and thumbnail routes.

### Fixed

- Fixed logo generation to ensure outlines are only added if the logo does not already have a light outline.
- Corrected output dimensions in README.md for cover generation to reflect the new 1080x1440 size.

## [v0.3.1] - 2025-10-23

### Changed

- Refactored `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js` to add a white diagonal line with configurable styles.

## [v0.3.0] - 2025-10-23

### Fixed

- Corrected URL encoding for Los Angeles in examples within `README.md` to use `%20` instead of a hyphen.

## [v0.2.0] - 2025-10-23

### Added

- Introduced `.gitignore` to exclude node modules, cache directories, test files, IDE files, OS files, and logs.
- Created `README.md` with detailed API documentation, features, and usage instructions.
- Added `helpers/logoGenerator.js` with functionality for generating logos.
- Implemented `helpers/imageCache.js` for caching images.
- Developed `routes/logo.js` and `routes/thumb.js` for handling logo and thumbnail requests.
- Established initial Docker setup with `Dockerfile` and `.dockerignore` for containerization.
- Added GitHub Actions workflow for building and pushing Docker images.

## [v0.1.0] - 2025-10-23

### Added

- Initial commit with foundational files including `express.js`, `index.js`, and various helper functions for thumbnail generation.
- Added .dockerignore file to exclude unnecessary files from Docker builds.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Created Dockerfile for containerizing the application.
- Added express.js file for setting up the Express server.
- Implemented ESPNTeamResolver.js for resolving ESPN team data.
- Added imageCache.js for caching images to improve performance.
- Developed thumbnailGenerator.js for generating image thumbnails.
- Created routes/thumb.js for handling thumbnail-related routes.
- Added package.json for managing project dependencies.
- Included yarn.lock for consistent dependency management.

### Changed

- Configured build-docker.yml to trigger on tag pushes and manual dispatch.
- Updated Docker build command to support multiple tags, including 'latest'.
- Modified workflow to log in to the container repository before pushing images.
- Enhanced image information step to dynamically determine tags based on the GitHub event.

### Removed

- No files or features were removed in this commit.
