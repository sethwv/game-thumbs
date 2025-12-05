# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added Axios as a dependency in package.json for handling HTTP requests.
- Introduced a mechanism to track which commits belong to which version for better metadata management in the changelog.
- Added comments to clarify the purpose of new logic in `process_in_chunks` function.
- Implemented a check to handle cases where no commits exist for a version tag, ensuring the changelog remains informative.
- Added AI-powered changelog generation workflow in `.github/workflows/changelog.yml`.
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`.
- Added script for processing changelog in `.github/workflows/scripts/process-changelog-chunked.py`.

### Changed

- Updated GitHub Actions workflow to set the base branch dynamically using `${{ github.ref_name }}` instead of a hardcoded `main`.
- Refactored image generation helpers by moving `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from the `helpers` directory to a new `generators` directory.
- Migrated HTTP requests from the native https module to Axios in `helpers/colorExtractor.js` for improved request handling.
- Updated `format_changelog` function to include an additional parameter `unreleased_commit_hashes` for tracking unreleased commit hashes.
- Enhanced the method of adding entries to version entries by directly associating them with all relevant versions in the batch.
- Updated regex in `process-changelog-chunked.py` to match multiple commit hashes in the format "v0.6.2: abc1234,def5678 | v0.6.1: ghi9012".
- Updated the commit message format in `.github/workflows/changelog.yml` to use "Changelog Update #${{ github.run_number }}" instead of the previous format.

### Removed

- Deleted `helpers/colorExtractor.js` as its functionality has been integrated into `helpers/colorUtils.js`.
- Eliminated redundant error handling and timeout management code in downloadImage function in helpers/imageUtils.js, now managed by Axios.
- Removed redundant code for splitting entries by version headers in `process_in_chunks` function.
- Deleted backfill prompt template as it is no longer needed.
- Removed update prompt template since it is no longer required.
- Eliminated the script for formatting changelog entries due to changes in the workflow.

### Fixed

- Corrected the logic in `process_single_batch` to ensure that unreleased commits are properly tracked and categorized.
- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.
- Resolved issues with detecting changes in the `CHANGELOG.md` file to ensure accurate updates.
- Fixed handling of entry blocks to ensure proper categorization and merging of changelog entries.

### Cleaned Up

- Removed all entries from the CHANGELOG.md file, resulting in a complete reset of the changelog documentation.
- Added a step to clean up temporary files generated during the changelog processing to maintain a tidy workspace.

## [v0.6.2] - 2025-12-02

<!-- Processed commits: 12a786d,2bdbaf4,4065aca,788e1a6,86650ec,a94b562,ab3cfe2,b3b1418,e1596e1,e9fc790,fb256b6 -->

### Added

- Added support for a new visual style (Style 99) for team covers with 3D embossed effects and textured backgrounds in `docs/api-reference/cover.md`.
- Added support for a new visual style (Style 99) for team thumbnails with 3D embossed effects and textured backgrounds in `docs/api-reference/thumb.md`.
- Introduced a new function `loadTrimmedLogo` in `helpers/imageUtils.js` to load and trim team logos automatically.
- Implemented cache directory creation for trimmed logos in `helpers/imageUtils.js`.
- Introduced environment variables to track whether conflicts occurred during the rebase process.
- Added automatic conflict resolution strategies for specific file types, including workflow files, documentation, and package files.
- Implemented a summary creation step to log the status of the rebase and any conflicts that were automatically resolved.
- Configured Git settings for automatic stashing and squashing during rebases to streamline the process.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Created internal JSON backups for backward compatibility in `Dockerfile`.
- Added paths-ignore for documentation in `.github/workflows/build-docker.yml`.
- Implemented dev branch update workflow in `.github/workflows/rebase-dev.yml`.
- Added Dependabot configuration for automatic dependency updates in `.github/dependabot.yml`.
- Introduced new `DEPRECATIONS.md` documentation to list deprecated features and endpoints.
- Added unified API endpoints for thumbnails, covers, and logos in `docs/api-reference/index.md`.
- Added support for feeder leagues in `docs/customization.md` to enhance team matching.
- Added new helper functions for league image generation in `helpers/leagueImageGenerator.js`.
- Added health check functionality in the Dockerfile for application monitoring.

### Changed

- Updated the aspect ratio options for covers to include `1-1` (1080x1080) in `docs/api-reference/cover.md`.
- Enhanced the image cache clearing logic in `helpers/imageCache.js` to count and log the number of cleared cached images.
- Modified the `drawLogoWithShadow` function in `helpers/imageUtils.js` to maintain aspect ratio when drawing logos.
- Updated the `trimImage` function in `helpers/imageUtils.js` to include caching logic based on image buffer hash.
- Updated GitHub Actions workflow in `.github/workflows/rebase-dev.yml` to include better conflict resolution messages and force-push logic after rebasing.
- Refactored the summary creation logic in the GitHub Actions workflow to improve clarity and maintainability.
- Updated the GitHub Actions workflow for rebasing the `dev` branch onto `main` to include automatic conflict tracking.
- Modified the rebase strategy to use a recursive merge strategy with patience diff algorithm for better conflict resolution.
- Improved logging in the workflow to provide detailed summaries of conflicts detected and resolutions attempted.
- Configured Git to use a union merge tool and enabled rerere (reuse recorded resolution) for repeated conflicts.
- Updated `.dockerignore` to include internal JSON backups and custom JSON configuration directories.
- Modified `.gitignore` to exclude test output files and include a keep file.
- Enhanced `Dockerfile` to create directories for additional JSON configuration files.
- Adjusted automated testing workflow to handle test file discovery and summary generation.
- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified various API endpoints to use unified naming conventions in `docs/api-reference/index.md`.
- Updated README.md to reflect new features and improved descriptions of the API.
- Changed Dockerfile to install git as a dependency for displaying git information in the `/info` endpoint.
- Adjusted health check command in Dockerfile to ensure proper application health monitoring.
- Refactored team matching logic in `helpers/teamMatchingUtils.js` to accommodate new feeder leagues.

### Deprecated

- Deprecated legacy league-specific endpoints in `docs/DEPRECATIONS.md` and provided new unified alternatives.
- Marked old API endpoint structures as deprecated in `docs/api-reference/index.md`.

### Removed

- Removed obsolete `helpers/leagueImageGenerator.js` file, which had 493 lines of code.
- Removed unused assets related to NCAA from the repository.
- Deleted legacy files from the README.md to streamline documentation.

### Fixed

- Fixed the issue where cached trimmed logos were not being cleared on startup in `helpers/imageUtils.js`.
- Resolved issues with the rebase process by ensuring that all conflicts are checked and handled appropriately before continuing.
- Fixed various issues in API documentation to ensure clarity and accuracy.
- Resolved inconsistencies in endpoint descriptions across multiple documentation files.

## [v0.6.1] - 2025-12-02

<!-- Processed commits: 71fd070 -->

### Added

- Added Dependabot configuration for automatic dependency updates in `.github/dependabot.yml`.
- Introduced new `DEPRECATIONS.md` documentation to list deprecated features and endpoints.
- Added unified API endpoints for thumbnails, covers, and logos in `docs/api-reference/index.md`.
- Added support for feeder leagues in `docs/customization.md` to enhance team matching.
- Added new helper functions for league image generation in `helpers/leagueImageGenerator.js`.
- Added health check functionality in the Dockerfile for application monitoring.

### Changed

- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified various API endpoints to use unified naming conventions in `docs/api-reference/index.md`.
- Updated README.md to reflect new features and improved descriptions of the API.
- Changed Dockerfile to install git as a dependency for displaying git information in the `/info` endpoint.
- Adjusted health check command in Dockerfile to ensure proper application health monitoring.
- Refactored team matching logic in `helpers/teamMatchingUtils.js` to accommodate new feeder leagues.

### Deprecated

- Deprecated legacy league-specific endpoints in `docs/DEPRECATIONS.md` and provided new unified alternatives.
- Marked old API endpoint structures as deprecated in `docs/api-reference/index.md`.

### Removed

- Removed unused assets related to NCAA from the repository.
- Deleted legacy files from the README.md to streamline documentation.

### Fixed

- Fixed various issues in API documentation to ensure clarity and accuracy.
- Resolved inconsistencies in endpoint descriptions across multiple documentation files.

## [v0.6.0] - 2025-11-26

<!-- Processed commits: 9a5189b -->

### Added

- Added Dependabot configuration for automatic dependency updates in `.github/dependabot.yml`.
- Introduced new `DEPRECATIONS.md` documentation to list deprecated features and endpoints.
- Added unified API endpoints for thumbnails, covers, and logos in `docs/api-reference/index.md`.
- Added support for feeder leagues in `docs/customization.md` to enhance team matching.
- Added new helper functions for league image generation in `helpers/leagueImageGenerator.js`.
- Added health check functionality in the Dockerfile for application monitoring.

### Changed

- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified various API endpoints to use unified naming conventions in `docs/api-reference/index.md`.
- Updated README.md to reflect new features and improved descriptions of the API.
- Changed Dockerfile to install git as a dependency for displaying git information in the `/info` endpoint.
- Adjusted health check command in Dockerfile to ensure proper application health monitoring.
- Refactored team matching logic in `helpers/teamMatchingUtils.js` to accommodate new feeder leagues.

### Deprecated

- Deprecated legacy league-specific endpoints in `docs/DEPRECATIONS.md` and provided new unified alternatives.
- Marked old API endpoint structures as deprecated in `docs/api-reference/index.md`.

### Removed

- Removed unused assets related to NCAA from the repository.
- Deleted legacy files from the README.md to streamline documentation.

### Fixed

- Fixed various issues in API documentation to ensure clarity and accuracy.
- Resolved inconsistencies in endpoint descriptions across multiple documentation files.

## [v0.5.2] - 2025-11-08

<!-- Processed commits: e361a64 -->

### Added

- Added soccer leagues to `leagues.json` including La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League.
- Introduced logging configuration options in `README.md` for file logging and maximum log files.

### Changed

- Updated `.gitignore` to include logs directory and log files.
- Enhanced logging functionality in `helpers/logger.js` to support file logging.
- Modified `README.md` to include new environment variables for logging and caching.
- Updated `Dockerfile` to include health check for the application.
- Refactored image processing functions in `helpers/imageUtils.js` to improve logo cropping.

### Removed

- Removed deprecated ESPN provider files and replaced with new provider structure in `providers/ESPNProvider.js`.

### Fixed

- Fixed issues with logging in `helpers/logger.js` to ensure proper log rotation.
- Resolved incorrect API endpoint descriptions in `README.md` for NCAA sports.

## [v0.5.1] - 2025-11-05

<!-- Processed commits: c872a33 -->

### Added

- Added soccer leagues to `leagues.json` including La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League.
- Introduced logging configuration options in `README.md` for file logging and maximum log files.

### Changed

- Updated `.gitignore` to include logs directory and log files.
- Enhanced logging functionality in `helpers/logger.js` to support file logging.
- Modified `README.md` to include new environment variables for logging and caching.
- Updated `Dockerfile` to include health check for the application.
- Refactored image processing functions in `helpers/imageUtils.js` to improve logo cropping.

### Removed

- Removed deprecated ESPN provider files and replaced with new provider structure in `providers/ESPNProvider.js`.

### Fixed

- Fixed issues with logging in `helpers/logger.js` to ensure proper log rotation.
- Resolved incorrect API endpoint descriptions in `README.md` for NCAA sports.

## [v0.5.0] - 2025-11-04

<!-- Processed commits: e956c13 -->

### Added

- Added soccer leagues to `leagues.json` including La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League.
- Introduced logging configuration options in `README.md` for file logging and maximum log files.

### Changed

- Updated `.gitignore` to include logs directory and log files.
- Enhanced logging functionality in `helpers/logger.js` to support file logging.
- Modified `README.md` to include new environment variables for logging and caching.
- Updated `Dockerfile` to include health check for the application.
- Refactored image processing functions in `helpers/imageUtils.js` to improve logo cropping.

### Removed

- Removed deprecated ESPN provider files and replaced with new provider structure in `providers/ESPNProvider.js`.

### Fixed

- Fixed issues with logging in `helpers/logger.js` to ensure proper log rotation.
- Resolved incorrect API endpoint descriptions in `README.md` for NCAA sports.

## [v0.4.0] - 2025-10-28

<!-- Processed commits: 3824760,9d650ef,a7665c1,eb983ad -->

### Added

- Added soccer leagues to `leagues.json` including La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League.
- Introduced logging configuration options in `README.md` for file logging and maximum log files.
- Added support for additional leagues: WNBA, UFL, EPL, MLS, UEFA Champions League, NCAA Women's Basketball.
- Introduced new endpoint for cover generation: `/:league/:team1/:team2/cover`.
- Added explicit `.png` naming to logo and thumbnail endpoints.

### Changed

- Updated `.gitignore` to include logs directory and log files.
- Enhanced logging functionality in `helpers/logger.js` to support file logging.
- Modified `README.md` to include new environment variables for logging and caching.
- Updated `Dockerfile` to include health check for the application.
- Refactored image processing functions in `helpers/imageUtils.js` to improve logo cropping.
- Updated README.md to reflect new multi-sport support and API features.
- Modified the Dockerfile to include `ttf-dejavu` package.
- Refactored image generation functions to improve performance and maintainability.
- Changed logo generation to allow for a 50% canvas size for each logo with reduced spacing.
- Updated cache checking middleware to include cover images in cache validation.

### Removed

- Removed deprecated ESPN provider files and replaced with new provider structure in `providers/ESPNProvider.js`.
- Removed the deprecated `logoOutline.js` in favor of consolidating functionality into `imageUtils.js`.

### Fixed

- Fixed issues with logging in `helpers/logger.js` to ensure proper log rotation.
- Resolved incorrect API endpoint descriptions in `README.md` for NCAA sports.
- Fixed issue where logo visibility was inconsistent on light backgrounds by introducing `useLight` parameter.
- Resolved bug in ESPNTeamResolver.js related to team location abbreviations.

## [v0.3.2] - 2025-10-23

<!-- Processed commits: c65075b,e7019b8 -->

### Added

- Added support for additional leagues: WNBA, UFL, EPL, MLS, UEFA Champions League, NCAA Women's Basketball.
- Introduced new endpoint for cover generation: `/:league/:team1/:team2/cover`.
- Added explicit `.png` naming to logo and thumbnail endpoints.

### Changed

- Updated README.md to reflect new multi-sport support and API features.
- Modified the Dockerfile to include `ttf-dejavu` package.
- Refactored image generation functions to improve performance and maintainability.
- Changed logo generation to allow for a 50% canvas size for each logo with reduced spacing.
- Updated cache checking middleware to include cover images in cache validation.

### Removed

- Removed the deprecated `logoOutline.js` in favor of consolidating functionality into `imageUtils.js`.

### Fixed

- Fixed issue where logo visibility was inconsistent on light backgrounds by introducing `useLight` parameter.
- Resolved bug in ESPNTeamResolver.js related to team location abbreviations.

## [v0.3.1] - 2025-10-23

<!-- Processed commits: aaafc74 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added support for drawing a white diagonal line in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.

### Changed

- Updated the logic for extending diagonal lines in `generateDiagonalSplit` function to use a constant instead of a hardcoded value in `helpers/thumbnailGenerator.js`.
- Refactored the outline logic for logos to use a new function `drawLogoWithOutline` in `helpers/thumbnailGenerator.js`.
- Modified the README to reflect correct URL encoding for Los Angeles in examples.
- Updated README to include a note about the use of ESPN APIs and logos.

### Removed

- Removed hardcoded values for outline width and color similarity threshold in `helpers/thumbnailGenerator.js`.

### Fixed

- Fixed URL encoding for Los Angeles in examples in `README.md`.
- Corrected the logic for checking if a logo needs an outline in `helpers/thumbnailGenerator.js`.

## [v0.3.0] - 2025-10-23

<!-- Processed commits: 907387a,dccd0c6,e12a6a6 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added support for drawing a white diagonal line in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.

### Changed

- Updated the logic for extending diagonal lines in `generateDiagonalSplit` function to use a constant instead of a hardcoded value in `helpers/thumbnailGenerator.js`.
- Refactored the outline logic for logos to use a new function `drawLogoWithOutline` in `helpers/thumbnailGenerator.js`.
- Modified the README to reflect correct URL encoding for Los Angeles in examples.
- Updated README to include a note about the use of ESPN APIs and logos.

### Removed

- Removed hardcoded values for outline width and color similarity threshold in `helpers/thumbnailGenerator.js`.

### Fixed

- Fixed URL encoding for Los Angeles in examples in `README.md`.
- Corrected the logic for checking if a logo needs an outline in `helpers/thumbnailGenerator.js`.

## [v0.2.0] - 2025-10-23

<!-- Processed commits: 039d6b0,f791d33 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added support for drawing a white diagonal line in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.

### Changed

- Updated the logic for extending diagonal lines in `generateDiagonalSplit` function to use a constant instead of a hardcoded value in `helpers/thumbnailGenerator.js`.
- Refactored the outline logic for logos to use a new function `drawLogoWithOutline` in `helpers/thumbnailGenerator.js`.
- Modified the README to reflect correct URL encoding for Los Angeles in examples.
- Updated README to include a note about the use of ESPN APIs and logos.

### Removed

- Removed hardcoded values for outline width and color similarity threshold in `helpers/thumbnailGenerator.js`.

### Fixed

- Fixed URL encoding for Los Angeles in examples in `README.md`.
- Corrected the logic for checking if a logo needs an outline in `helpers/thumbnailGenerator.js`.

## [v0.1.0] - 2025-10-23

<!-- Processed commits: 559726f -->

### Added

- Added .dockerignore file to exclude unnecessary files from Docker builds.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Created Dockerfile for containerizing the application.
- Added express.js file to set up the Express server.
- Implemented ESPNTeamResolver.js to resolve team data from ESPN API.
- Developed imageCache.js for caching images to improve performance.
- Created thumbnailGenerator.js for generating image thumbnails.
- Added route for thumbnail generation in routes/thumb.js.
- Included package.json to manage project dependencies.
- Added yarn.lock for consistent dependency resolution.

### Changed

- Configured build-docker.yml to trigger on tag pushes and manual dispatch.
- Updated build process in GitHub Actions to include Docker image tagging.
- Modified Docker build command to specify platform as linux/amd64.

### Removed

- No files or features were removed in this commit.
