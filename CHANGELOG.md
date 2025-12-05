# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Processed commits: 2379012,3cf215c,591d468,60abcc4,619e355,702bcc6,73cbb9e,8f0282d,a249da1,b316651 -->

### Added

- Added AI-powered changelog generation workflow in `.github/workflows/changelog.yml`.
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`.
- Added script for processing changelog in `.github/workflows/scripts/process-changelog-chunked.py`.
- Included script for formatting changelog in `.github/workflows/scripts/format-changelog.py`.
- Implemented scripts for generating prompts in `.github/workflows/scripts/generate-backfill-prompt.py` and `.github/workflows/scripts/generate-update-prompt.py`.
- Added Axios as a dependency in `package.json` for handling HTTP requests.
- Introduced `getTeamMatchScoreWithOverrides` function in `helpers/teamMatchingUtils.js` to consider overridden abbreviations in team matching.
- Introduced tracking of all commit hashes from batch metadata in `process-changelog-chunked.py`.
- Implemented logic to append processed commit hashes as comments in the changelog for both unreleased and version entries in `format_changelog`.
- Introduced a new workflow for generating changelogs automatically on push and release events.
- Added scripts for generating prompts for AI-based changelog generation, including `generate-backfill-prompt.py` and `generate-update-prompt.py`.
- Created a new script, `format-changelog.py`, for consistent formatting of the generated changelog.
- Added functionality to collect commit diffs and statistics for better context in the changelog.
- Introduced getTeamMatchScoreWithOverrides function in helpers/teamMatchingUtils.js to consider overridden abbreviations in team matching.

### Changed

- Updated regex in `process-changelog-chunked.py` to match multiple commit hashes in the format "v0.6.2: abc1234,def5678 | v0.6.1: ghi9012".
- Enhanced `parse_and_merge_entries` function to split and update commit hashes from matched groups.
- Modified `merge_changelog_entries` to embed processed commit hash metadata for both unreleased and version entries.
- Adjusted logic in `process_in_chunks` to retain entry blocks without stripping batch comments for processing.
- Improved handling of version entries to ensure proper embedding of commit hashes in the changelog output.
- Updated the commit message format in `.github/workflows/changelog.yml` to use "Changelog Update #${{ github.run_number }}" instead of the previous format.
- Added logic to extract commit hashes from batch metadata and VERSIONS metadata in `process-changelog-chunked.py`.
- Updated the `format_changelog` function in `process-changelog-chunked.py` to embed processed commit hash metadata in the changelog output for both unreleased and version entries.
- Enhanced changelog generation by extracting already processed commit hashes from existing changelog.
- Implemented filtering of already processed commits to avoid duplication in changelog.
- Changed the processing method to always use chunked processing for consistency in changelog generation.
- Changed the branch naming convention for changelog updates to `changelog/${{ github.run_number }}` in `.github/workflows/changelog.yml`.
- Implemented filtering of already-processed commits to avoid duplication in changelog.
- Changed processing method to always use chunked processing for consistency in changelog generation.
- Updated GitHub Actions workflow for changelog generation to use `peter-evans/create-pull-request@v7` for creating pull requests.
- Moved `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from the `helpers` directory to a new `generators` directory.
- Updated import paths in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to reflect the new directory structure.
- Consolidated color utility functions into `colorUtils.js` and removed the `colorExtractor.js` file.
- Removed unused `colorExtractor.js` file, which contained functions for extracting dominant colors from images.
- Enhanced `colorUtils.js` with additional functions for fetching images and color manipulation.
- Migrated HTTP requests from the native https module to Axios in helpers/colorExtractor.js for improved request handling.
- Updated downloadImage function in helpers/imageUtils.js to use Axios for downloading images with timeout protection.
- Refactored ESPNProvider.js to utilize Axios for fetching team data from ESPN APIs, replacing the native https module.
- Modified TheSportsDBProvider.js to use getTeamMatchScoreWithOverrides for team matching, enhancing the matching logic with override support.
- Adjusted team matching logic in ESPNProvider.js to extract team slug for override lookup.

### Removed

- Deleted backfill prompt template as it is no longer needed.
- Removed update prompt template since it is no longer required.
- Eliminated the script for formatting changelog entries due to changes in the workflow.
- Removed the manual git commands for creating branches and committing changes in the changelog workflow.
- Deleted `helpers/colorExtractor.js` which contained functions for extracting dominant colors from images.
- Deleted obsolete backfill and update prompt files used for changelog generation.

### Fixed

- Corrected logic in `merge_changelog_entries` to ensure that merged entries are appended correctly with associated commit hashes.
- Corrected the output of the changelog summary to include the source branch instead of just the branch name.
- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.
- Corrected logic to check for new commits to process, ensuring accurate changelog updates.
- Fixed handling of dirty working directory states to correctly append `-dirty` to the current version when applicable.
- Fixed potential undefined behavior in team matching by ensuring teamSlug is correctly derived before being used in matching logic.

### Cleaned Up

- Added a cleanup step to remove temporary files generated during the changelog processing.

## [v0.6.2] - 2025-12-02

<!-- Processed commits: 2bdbaf4,5125224,788e1a6,86650ec,a94b562,ab3cfe2,e1596e1,e9fc790,fb256b6 -->

### Added

- Added support for new aspect ratio `1-1` (1080x1080) in `docs/api-reference/cover.md`.
- Introduced new style `99` for 3D embossed badges in `docs/api-reference/cover.md` and `docs/api-reference/thumb.md`.
- Implemented cache settings for trimmed logos in `helpers/imageUtils.js`.
- Added `loadTrimmedLogo` function to handle automatic logo selection and trimming in `helpers/imageUtils.js`.
- Added configuration for merge tool as "union" for automatic conflict resolution in `.github/workflows/rebase-dev.yml`.
- Enabled `rerere` (reuse recorded resolution) for handling repeated conflicts in `.github/workflows/rebase-dev.yml`.
- Configured Git to use `pull.rebase` and `rebase.autoStash` for better rebase management in `.github/workflows/rebase-dev.yml`.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Added cover endpoint documentation in `docs/api-reference/cover.md`.
- Created internal backups for backward compatibility in `Dockerfile`.
- Added Dependabot configuration in `.github/dependabot.yml` to automate dependency updates.
- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.

### Changed

- Updated aspect ratio options in `docs/api-reference/thumb.md` to include `1-1` (1080x1080).
- Modified image cache clearing logic to report the number of cleared cached images in `helpers/imageCache.js`.
- Enhanced `drawLogoWithShadow` function to maintain aspect ratio while drawing logos in `helpers/imageUtils.js`.
- Changed the logic in `trimImage` to include caching mechanism based on image buffer hash in `helpers/imageUtils.js`.
- Updated GitHub Actions workflow to include a force push step after rebasing in `.github/workflows/rebase-dev.yml`.
- Updated `.dockerignore` to include custom JSON configuration directories and internal JSON backups.
- Modified `.gitignore` to ignore output files and added a rule to keep `.gitkeep`.
- Enhanced `build-docker.yml` to ignore paths in the `docs` directory during builds.
- Configured Git user details in the rebase workflow for better commit attribution.
- Bumped `express` version from `5.2.0` to `5.2.1` in `package.json`.
- Updated `express` version from `5.1.0` to `5.2.0` in `package.json`.
- Modified `yarn.lock` to reflect the new `express` version and its dependencies.
- Modified `Dockerfile` to install `git` alongside canvas dependencies for enhanced functionality.
- Revised `README.md` to reflect new features and provide a clearer overview of the API and its capabilities.
- Enhanced `helpers/teamMatchingUtils.js` with improved logic for team matching.
- Updated Dockerfile to include `ttf-dejavu` in the package installation.
- Modified README.md to enhance API documentation, adding new styles for thumbnails and covers.
- Refactored ESPNTeamResolver.js to include location abbreviations for better team matching.
- Improved the `getMatchScore` function in ESPNTeamResolver.js to utilize expanded location abbreviations for scoring.
- Enhanced `checkCacheMiddleware` in express.js to include cover images in cache checking.
- Updated README.md to include optional `.png` extension in logo and thumbnail endpoints.
- Adjusted logo size calculation in helpers/logoGenerator.js to use 50% of canvas for each logo instead of 40%.

### Removed

- Removed `helpers/leagueImageGenerator.js` as part of code cleanup.
- Removed unused assets `ncaa.png`, `ncaab.png`, and `ncaaf.png` from the project.

### Fixed

- Fixed cache clearing logic to ensure it only counts actual files cleared in `helpers/imageCache.js`.
- Resolved potential errors in logo loading and trimming process by adding error handling in `loadTrimmedLogo` function in `helpers/imageUtils.js`.
- Fixed handling of unresolved conflicts by checking for remaining conflicts before continuing the rebase in `.github/workflows/rebase-dev.yml`.
- Fixed issues in automated testing by adding detailed output summaries for test results in the GitHub Actions workflow.
- Resolved conflicts in the rebase workflow to ensure successful merges without manual intervention.

## [v0.6.1] - 2025-12-02

### Added

- Created `docs/DEPRECATIONS.md` to document deprecated features and endpoints.
- Added unified API endpoints in `docs/api-reference/index.md` for better clarity and usability.
- Introduced examples for NCAA routes in `docs/api-reference/ncaa-route.md` to demonstrate usage.
- Enhanced `docs/customization.md` with a new configuration option `feederLeagues` for league hierarchy.
- Added support notice for XC API Proxy in `docs/api-reference/xc-proxy.md`.

### Changed

- Updated API reference to replace deprecated endpoints with unified endpoints in `docs/api-reference/index.md`.
- Revised the NCAA route documentation to include raw data retrieval examples in `docs/api-reference/ncaa-route.md`.
- Improved league configuration examples in `docs/customization.md` to illustrate the use of `feederLeagues`.
- Updated multiple API documentation files to reflect changes in endpoint structure and deprecations.
- Adjusted the `docs/index.md` to include unified endpoints and their descriptions.

## [v0.6.0] - 2025-11-26

### Changed
- Version release

## [v0.5.2] - 2025-11-08

### Added

- Introduced new API documentation for soccer leagues in `docs/api-reference` including endpoints for league cover, logos, and thumbnails.
- Added extensive contributing guidelines in `docs/contributing.md`.
- Included detailed customization options in `docs/customization.md`.
- Added health check command in `Dockerfile` to ensure application stability.

### Changed

- Updated `package.json` to reflect new dependencies and versions.
- Enhanced `express.js` to improve routing and middleware handling.
- Revised `README.md` to provide new quick start instructions and environment variable configurations.

## [v0.5.1] - 2025-11-05

<!-- Processed commits: c872a33 -->

### Added

- Added logging configuration options in `README.md` for file logging and maximum log files.
- Added logging of route registration with info level in `express.js`.
- Implemented file logging functionality in `helpers/logger.js`.

### Changed

- Updated `.gitignore` to include log files and logs directory.
- Modified API endpoint descriptions in `README.md` to include new team logo and league logo endpoints.
- Changed cache and rate limiting middleware to include new `teamlogo` and `leaguelogo` paths in `express.js`.
- Updated logging behavior to include error stack traces in `express.js`.

### Fixed

- Fixed unhandled route error logging to include error stack in `express.js`.

## [v0.5.0] - 2025-11-04

<!-- Processed commits: e956c13 -->

### Added

- Added health check to Dockerfile to monitor application status.
- Introduced new environment variables: `IMAGE_CACHE_HOURS`, `RATE_LIMIT_PER_MINUTE`, `FORCE_COLOR`, and `NODE_ENV` with default values.
- Added support for automatic extraction of dominant colors from team logos when ESPN does not provide them.
- Implemented fallback mechanism for NCAA Women's sports to use Men's teams when not found.

### Changed

- Updated README.md to reflect support for 30+ leagues and detailed descriptions of features.
- Modified caching behavior to include both generated images and team data for 24 hours.
- Enhanced API documentation with detailed descriptions of environment variables and their default values.
- Revised API endpoints section to clarify league codes and provide examples for NCAA shorthand routes.
- Adjusted image generation parameters to include style options with descriptions in the API documentation.

### Removed

- Removed the ESPN provider implementation as it was no longer needed.

### Fixed

- Fixed inconsistencies in API endpoint descriptions in README.md.
- Resolved issues with image generation requests exceeding rate limits when caching was disabled.

## [v0.4.0] - 2025-10-28

<!-- Processed commits: 9d650ef,a7665c1 -->

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Added support for additional leagues: WNBA, UFL, EPL, MLS, UEFA Champions League, NCAA Women's Basketball.
- Introduced new images for NCAA Football, NCAA Men's Basketball, and NCAA Women's Basketball in the assets directory.
- Implemented a new function `fetchLeagueData` in `helpers/ESPNTeamResolver.js` to retrieve league data from the ESPN API.
- Introduced new cover generation functionality in routes/cover.js.
- Added support for multiple styles in cover generation in README.md.
- Implemented new functions in helpers/logoOutline.js for improved logo outlines.

### Changed

- Updated GitHub Actions workflow in `.github/workflows/build-docker.yml` to trigger on `test/.*` branches in addition to `dev`.
- Renamed `helpers/ESPNTeamResolver.js` to `providers/ESPN.js` for better organization.
- Updated API URL in `providers/ESPN.js` to increase the limit of teams fetched from ESPN from 500 to 1000.
- Changed the league identifier for NCAA Women's Basketball from `naacw` to `ncaaw` in `leagues.js`.
- Modified logo generation logic in `helpers/logoGenerator.js` to store the logo buffer before applying the trim.
- Updated README.md to reflect new supported leagues and API parameters.
- Modified the `fetchTeamData` function to utilize a dynamic API endpoint based on the league.
- Changed the `logo` parameter in API examples to default to `true` for better clarity.
- Enhanced the `getMatchScore` function to improve team matching accuracy by using expanded location abbreviations.
- Modified helpers/logoGenerator.js to support new cover styles.
- Adjusted helpers/thumbnailGenerator.js to accommodate changes in aspect ratios for thumbnails.

### Fixed

- Fixed incorrect reference to `ESPNTeamResolver` in multiple route files (`routes/cover.js`, `routes/logo.js`, `routes/raw.js`, `routes/thumb.js`) by updating to the new `providers/ESPN` path.
- Fixed error handling in the `fetchLeagueData` function to properly handle API response parsing errors.
- Resolved potential issues with team data caching logic in `fetchTeamData` to prevent unnecessary API calls.
- Corrected the output dimensions in README.md for cover generation to reflect 1080x1440 PNG image (3:4 aspect ratio).

## [v0.3.2] - 2025-10-23

### Changed

- Refactored generateThumbnail function in helpers/thumbnailGenerator.js to include constants for color similarity threshold, outline width, diagonal line extension, and maximum cache size.
- Updated color distance check in shouldAddOutlineToLogo function to use defined constant for threshold.
- Enhanced getWhiteLogo function to generate checksum from image data if source is not available, improving cache key generation.
- Modified drawLogoWithOutline function to use defined constant for outline width.

## [v0.3.1] - 2025-10-23

### Changed

- Addressed feedback from copilot review in helpers/thumbnailGenerator.js, improving code readability and structure.
- Updated constants and logic for determining when to add outlines to logos based on color similarity.

## [v0.3.0] - 2025-10-23

### Changed

- Implemented logic to add white strokes to team logos in helpers/thumbnailGenerator.js when colors match too closely.
- Adjusted drawing logic for logos to include outlines when necessary, improving visibility against backgrounds.

## [v0.2.0] - 2025-10-23

### Added

- Introduced .gitignore file to exclude node modules, cache directories, and IDE files.
- Added README.md with detailed API documentation, including features, usage examples, and Docker instructions.
- Created new routes for logo and thumbnail generation in routes/logo.js and routes/thumb.js, supporting dynamic generation of sports logos and thumbnails.
- Implemented helpers/logoGenerator.js and helpers/thumbnailGenerator.js for generating logos and thumbnails dynamically.
- Added .dockerignore file to exclude unnecessary files from the Docker context.
- Introduced GitHub Actions workflow for building and pushing Docker images in .github/workflows/build-docker.yml.
- Added Dockerfile for defining the Docker image build process.
- Implemented express.js file for handling HTTP requests.
- Created helpers/ESPNTeamResolver.js for resolving ESPN team data.
- Developed helpers/thumbnailGenerator.js for generating thumbnails.
- Created index.js as the entry point of the application.
- Added routes/thumb.js for handling thumbnail-related routes.
- Included package.json for managing project dependencies.
- Added yarn.lock for locking dependency versions.

### Changed

- Updated .github/workflows/build-docker.yml to trigger on tag pushes and manual dispatch.
- Modified Dockerfile to set up the application environment.
- Enhanced express.js with additional routes and middleware.
- Improved helpers/ESPNTeamResolver.js for better data handling.
- Refined helpers/imageCache.js for optimized image caching.

## [v0.1.0] - 2025-10-23

### Added

- Added .dockerignore file to exclude unnecessary files from the Docker context.
- Introduced GitHub Actions workflow for building and pushing Docker images in .github/workflows/build-docker.yml.
- Added Dockerfile for defining the Docker image build process.
- Implemented express.js file for handling HTTP requests.
- Created helpers/ESPNTeamResolver.js for resolving ESPN team data.
- Developed helpers/thumbnailGenerator.js for generating thumbnails.
- Created index.js as the entry point of the application.
- Added routes/thumb.js for handling thumbnail-related routes.
- Included package.json for managing project dependencies.
- Added yarn.lock for locking dependency versions.

### Changed

- Updated .github/workflows/build-docker.yml to trigger on tag pushes and manual dispatch.
- Modified Dockerfile to set up the application environment.
- Enhanced express.js with additional routes and middleware.
- Improved helpers/ESPNTeamResolver.js for better data handling.
- Refined helpers/imageCache.js for optimized image caching.
