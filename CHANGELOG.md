# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Processed commits: 02710cf,2379012,3cf215c,5125224,591d468,60abcc4,619e355,68dcc32,702bcc6,73cbb9e,8232bf7,8f0282d,b316651,bdfea39,d0fad2e -->

### Added

- Introduced a mechanism to track which commits belong to which version for better metadata management in the changelog.
- Added comments to clarify the purpose of new logic in `process_in_chunks` function.
- Implemented a check to handle cases where no commits exist for a version tag, ensuring the changelog remains informative.
- Added AI-powered changelog generation workflow in `.github/workflows/changelog.yml`.
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`.
- Added script for processing changelog in `.github/workflows/scripts/process-changelog-chunked.py`.
- Included script for formatting changelog in `.github/workflows/scripts/format-changelog.py`.
- Introduced `getTeamMatchScoreWithOverrides` function in `helpers/teamMatchingUtils.js` to consider overridden abbreviations in team matching.
- Added functionality to embed processed commit hashes in the generated changelog for both unreleased and released entries.
- Added Axios as a dependency in `package.json` for handling HTTP requests.
- Introduced logic in `parse_and_merge_entries` to track commit hashes from batch metadata and individual version entries.
- Added scripts for generating prompts for backfill and update scenarios in the changelog process.
- Included a new Python script `process-changelog-chunked.py` for handling large changelog requests.
- Added logic to handle cases where no detailed changes are extracted but commits exist, allowing for metadata embedding in changelog.
- Implemented a mechanism to parse and merge entries by category, removing duplicates and similar entries.
- Added scripts for generating prompts for backfilling and updating changelogs in `.github/workflows/scripts/`.
- Implemented a new script `process-changelog-chunked.py` for handling large changelog requests.
- Included a new prompt file `backfill-prompt.txt` for generating changelog entries from historical commits.
- Added a new prompt file `update-prompt.txt` for generating updates to the changelog based on recent changes.

### Changed

- Updated `format_changelog` function to include an additional parameter `unreleased_commit_hashes` for tracking unreleased commit hashes.
- Refactored `process_in_chunks` function in `.github/workflows/scripts/process-changelog-chunked.py` to improve version mapping parsing.
- Simplified logic for handling version sections by removing unnecessary checks and conditions.
- Updated handling of unreleased entries to streamline the process when no version metadata is present.
- Enhanced the method of adding entries to version entries by directly associating them with all relevant versions in the batch.
- Updated logic to append a note for versions with processed commits but no entries extracted.
- Refined the process of building a mapping of commits to versions for better tracking in the changelog.
- Updated regex in `process-changelog-chunked.py` to match multiple commit hashes in the format "v0.6.2: abc1234,def5678 | v0.6.1: ghi9012".
- Enhanced `parse_and_merge_entries` function to split and update commit hashes from matched groups.
- Updated the commit message format in `.github/workflows/changelog.yml` to use "Changelog Update #${{ github.run_number }}" instead of the previous format.
- Changed the branch naming convention for changelog updates to `changelog/${{ github.run_number }}` in `.github/workflows/changelog.yml`.
- Updated the GitHub Actions workflow for changelog generation to use `peter-evans/create-pull-request@v7` for creating pull requests.
- Updated import paths in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to reflect the new directory structure.
- Refined the logic in `merge_changelog_entries` to ensure that commit hash metadata is embedded in both unreleased and released entries.
- Enhanced changelog generation workflow to extract already processed commit hashes from existing changelog.
- Implemented filtering of already-processed commits to avoid duplication in changelog entries.
- Updated workflow to always use chunked processing for changelog generation, ensuring consistency.
- Modified output messages to provide clearer feedback on the changelog generation process.
- Refactored the changelog generation workflow to include AI-powered analysis using GitHub Models.
- Adjusted the method for checking changes in `CHANGELOG.md` to improve accuracy.
- Moved `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from the `helpers` directory to a new `generators` directory.
- Migrated HTTP requests from the native https module to Axios in `helpers/colorExtractor.js` for improved request handling.
- Updated image downloading logic in `helpers/imageUtils.js` to use Axios, enhancing timeout and error handling.
- Refactored ESPNProvider.js to utilize Axios for fetching team data from the ESPN API, improving request management.
- Modified TheSportsDBProvider.js to implement `getTeamMatchScoreWithOverrides` for better team matching accuracy.
- Adjusted team matching logic in ESPNProvider.js to extract team slug for override lookup, enhancing matching precision.
- Updated teams.json to include new team overrides for the NHL and EPL leagues.
- Simplified logic for handling version sections by removing unnecessary checks and consolidating version entry assignments.
- Updated regex patterns for better accuracy in matching version tags within commit messages.
- Consolidated color utility functions into `colorUtils.js`, adding functions for fetching images, converting RGB to hex, and calculating color brightness.
- Adjusted `merge_changelog_entries` to embed commit hash metadata for unreleased and version entries.
- Updated GitHub Actions workflow in `changelog.yml` to change the commit message title format for changelog updates.
- Implemented chunked processing for changelog generation to ensure consistency.
- Moved `logoGenerator.js` from `helpers` to `generators` directory.
- Moved `thumbnailGenerator.js` from `helpers` to `generators` directory.
- Updated import paths in `logoGenerator.js` to reference the new location of `imageUtils` and `logger`.
- Updated import paths in `thumbnailGenerator.js` to reference the new location of `imageUtils` and `logger`.
- Migrated web requests from the native `https` module to Axios in `helpers/colorExtractor.js`.
- Updated `fetchImage` function in `helpers/colorExtractor.js` to use Axios for image fetching with timeout handling.
- Refactored `downloadImage` function in `helpers/imageUtils.js` to utilize Axios for downloading images with timeout protection.
- Changed team matching logic in `providers/ESPNProvider.js` to use `getTeamMatchScoreWithOverrides` instead of the original matching function.
- Updated team matching logic in `providers/TheSportsDBProvider.js` to utilize `getTeamMatchScoreWithOverrides` for better matching accuracy.
- Modified the `teams.json` file to include new overrides for the NHL team "utah-mammoth".

### Removed

- Removed redundant code for splitting entries by version headers in `process_in_chunks` function.
- Eliminated the need for maintaining separate lists for current version lines, simplifying the overall code structure.
- Deleted backfill prompt template as it is no longer needed.
- Removed update prompt template since it is no longer required.
- Eliminated the script for formatting changelog entries due to changes in the workflow.
- Removed the manual git commands for creating branches and committing changes in the changelog workflow.
- Deleted `helpers/colorExtractor.js` which contained functions for extracting dominant colors from images.
- Eliminated old promise-based request handling in ESPNProvider and TheSportsDBProvider in favor of async/await with Axios.
- Removed redundant comments and cleaned up code in `process-changelog-chunked.py` for better readability.
- Eliminated the old script for formatting changelog entries, as it was replaced by a new approach.
- Eliminated the previous method of creating pull requests in favor of the new streamlined approach using the GitHub action.
- Removed legacy code that handled AI-generated version headers, streamlining the process for version entry assignment.
- Eliminated redundant checks for version headers that were previously used to parse commit entries.
- Eliminated the process-changelog-chunked.cpython-313.pyc file as part of the cleanup.
- Deleted `colorExtractor.js` as its functionality has been integrated into `colorUtils.js`.
- Removed the native `https` request handling code from `helpers/colorExtractor.js` and `helpers/imageUtils.js` in favor of Axios.

### Fixed

- Corrected the logic in `process_single_batch` to ensure that unreleased commits are properly tracked and categorized.
- Corrected the logic for handling cases where the AI response did not split entries by version headers, ensuring all entries are accounted for.
- Corrected logic in `merge_changelog_entries` to ensure that merged entries are appended correctly with associated commit hashes.
- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.
- Corrected logic to check for new commits to process, ensuring accurate changelog updates.
- Fixed handling of dirty working directory states to correctly append `-dirty` to the current version when applicable.
- Resolved issues with detecting changes in the `CHANGELOG.md` file to ensure accurate updates.
- Resolved potential request timeout issues by implementing Axios's built-in timeout handling in various providers.
- Fixed handling of entry blocks to ensure proper categorization and merging of changelog entries.
- Fixed timeout handling in `fetchImage` and `downloadImage` functions to throw meaningful errors when requests exceed the specified timeout.

### Cleaned Up

- Added a step to clean up temporary files generated during the changelog processing to maintain a tidy workspace.

## [v0.6.2] - 2025-12-02

<!-- Processed commits: 12a786d,2bdbaf4,4065aca,788e1a6,86650ec,a94b562,ab3cfe2,b3b1418,e1596e1,e9fc790,fb256b6 -->

### Added

- Added support for a new aspect ratio `1-1` (1080x1080) in `docs/api-reference/cover.md` and `docs/api-reference/thumb.md`.
- Introduced **Style 99** for covers and thumbnails, featuring a 3D embossed design with textured backgrounds in `docs/api-reference/cover.md` and `docs/api-reference/thumb.md`.
- Implemented a new function `loadTrimmedLogo` in `helpers/imageUtils.js` to load and trim team logos automatically.
- Added cache settings for trimmed logos in `helpers/imageUtils.js`, allowing for automatic cache clearing on startup.
- Added environment variables for conflict tracking in `.github/workflows/rebase-dev.yml`.
- Introduced automatic conflict resolution strategies using `git config` in `.github/workflows/rebase-dev.yml`.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Created internal JSON backups during Docker build in `Dockerfile`.
- Added Dependabot configuration file at `.github/dependabot.yml` to automate dependency updates.
- Introduced new documentation page for deprecations at `docs/DEPRECATIONS.md`.
- Added support for feeder leagues in customization configuration to improve team lookup.

### Changed

- Updated the `imageCache.js` to log the number of cleared cached images, improving cache management feedback.
- Refactored `drawLogoWithShadow` function in `helpers/imageUtils.js` to maintain aspect ratio when drawing logos.
- Enhanced the `trimImage` function in `helpers/imageUtils.js` to include caching logic based on image buffer hash.
- Modified GitHub Actions workflow in `.github/workflows/rebase-dev.yml` to include detailed logging for conflict resolution during rebase.
- Updated `.dockerignore` to include custom JSON configuration directories and internal JSON backups.
- Modified `.gitignore` to ignore test output files and added exception for `.gitkeep`.
- Enhanced Docker build workflow to ignore documentation changes in `build-docker.yml`.
- Updated rebase workflow to include a summary of the rebase process in `rebase-dev.yml`.
- Configured Git user for actions in the rebase workflow in `rebase-dev.yml`.
- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified API documentation to reflect unified endpoints in `docs/api-reference/index.md`.
- Updated NCAA route documentation to include new raw data endpoint in `docs/api-reference/ncaa-route.md`.
- Enhanced customization documentation to include examples of feeder leagues in `docs/customization.md`.

### Deprecated

- Marked legacy league-specific endpoints as deprecated in `docs/api-reference/index.md`.
- Documented deprecated endpoints in the new `docs/DEPRECATIONS.md` file.

### Removed

- Removed `helpers/leagueImageGenerator.js` as part of cleanup.
- Deleted multiple test files marked as disabled in the test suite.

### Fixed

- Fixed the issue with clearing the trimmed logo cache by ensuring it only clears when caching is enabled in `helpers/imageUtils.js`.
- Resolved potential errors in the `downloadImage` function by simplifying the promise handling for local file paths in `helpers/imageUtils.js`.
- Fixed handling of unresolved conflicts by checking for remaining conflicts after auto-resolution in `.github/workflows/rebase-dev.yml`.
- Fixed rebase conflict resolution logic in `rebase-dev.yml` to ensure proper handling of workflow files.
- Corrected paths in the automated testing workflow to ensure accurate test file discovery.
- Fixed inconsistencies in API documentation regarding endpoint naming and usage.

## [v0.6.1] - 2025-12-02

<!-- Processed commits: 71fd070 -->

### Added

- Added Dependabot configuration file at `.github/dependabot.yml` to automate dependency updates.
- Introduced new documentation page for deprecations at `docs/DEPRECATIONS.md`.
- Added support for feeder leagues in customization configuration to improve team lookup.

### Changed

- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified API documentation to reflect unified endpoints in `docs/api-reference/index.md`.
- Updated NCAA route documentation to include new raw data endpoint in `docs/api-reference/ncaa-route.md`.
- Enhanced customization documentation to include examples of feeder leagues in `docs/customization.md`.

### Deprecated

- Marked legacy league-specific endpoints as deprecated in `docs/api-reference/index.md`.
- Documented deprecated endpoints in the new `docs/DEPRECATIONS.md` file.

### Fixed

- Fixed inconsistencies in API documentation regarding endpoint naming and usage.

## [v0.6.0] - 2025-11-26

<!-- Processed commits: 9a5189b -->

### Added

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.
- Introduced new assets for dark mode and light mode in `assets/OHL_DARKMODE.png` and `assets/OHL_LIGHTMODE.png`.
- Added comprehensive API documentation for various endpoints in `docs/api-reference/`.

### Changed

- Updated Dockerfile to include `git` as a dependency for the `/info` endpoint.
- Modified the README to reflect the new features and quick start instructions.
- Enhanced health check command in Dockerfile to improve application reliability.
- Refactored `helpers/teamMatchingUtils.js` to improve team matching logic.
- Updated `package.json` to include new dependencies and version updates.

### Deprecated

- Marked the old API endpoints as deprecated in the documentation, encouraging users to transition to the new endpoints.

### Removed

- Removed unused assets from `assets/ncaa.png`, `assets/ncaab.png`, and `assets/ncaaf.png`.

### Fixed

- Fixed issues in `express.js` to handle errors more gracefully.
- Resolved broken links in the documentation for API endpoints.
- Corrected image generation logic in `helpers/leagueImageGenerator.js` to ensure accurate thumbnails.

## [v0.5.2] - 2025-11-08

<!-- Processed commits: e361a64 -->

### Added

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.
- Introduced new assets for dark mode and light mode in `assets/OHL_DARKMODE.png` and `assets/OHL_LIGHTMODE.png`.
- Added comprehensive API documentation for various endpoints in `docs/api-reference/`.

### Changed

- Updated Dockerfile to include `git` as a dependency for the `/info` endpoint.
- Modified the README to reflect the new features and quick start instructions.
- Enhanced health check command in Dockerfile to improve application reliability.
- Refactored `helpers/teamMatchingUtils.js` to improve team matching logic.
- Updated `package.json` to include new dependencies and version updates.

### Deprecated

- Marked the old API endpoints as deprecated in the documentation, encouraging users to transition to the new endpoints.

### Removed

- Removed unused assets from `assets/ncaa.png`, `assets/ncaab.png`, and `assets/ncaaf.png`.

### Fixed

- Fixed issues in `express.js` to handle errors more gracefully.
- Resolved broken links in the documentation for API endpoints.
- Corrected image generation logic in `helpers/leagueImageGenerator.js` to ensure accurate thumbnails.

## [v0.5.1] - 2025-11-05

<!-- Processed commits: c872a33 -->

### Added

- Added logging configuration to support file logging in `helpers/logger.js`.
- Introduced `LOG_TO_FILE` and `MAX_LOG_FILES` environment variables in `README.md` for log management.
- Added new endpoints for raw team and league logos: `/:league/:team/teamlogo[.png]` and `/:league/leaguelogo[.png]` in `README.md`.
- Added health check command in `Dockerfile` to monitor application status.
- Added color extraction functionality in `helpers/colorExtractor.js`.

### Changed

- Updated `.gitignore` to include log files and logs directory.
- Modified logging messages in `express.js` to use `logger.info` instead of `logger.success`.
- Updated API documentation in `README.md` to reflect new endpoints and features.

### Removed

- Removed outdated logging code in `express.js` related to socket errors and timeouts.
- Deleted unused `providers/ESPN.js` file to streamline the codebase.

### Fixed

- Fixed issues with unhandled promise rejections in `express.js` to ensure proper error logging.

## [v0.5.0] - 2025-11-04

<!-- Processed commits: e956c13 -->

### Added

- Added logging configuration to support file logging in `helpers/logger.js`.
- Introduced `LOG_TO_FILE` and `MAX_LOG_FILES` environment variables in `README.md` for log management.
- Added new endpoints for raw team and league logos: `/:league/:team/teamlogo[.png]` and `/:league/leaguelogo[.png]` in `README.md`.
- Added health check command in `Dockerfile` to monitor application status.
- Added color extraction functionality in `helpers/colorExtractor.js`.

### Changed

- Updated `.gitignore` to include log files and logs directory.
- Modified logging messages in `express.js` to use `logger.info` instead of `logger.success`.
- Updated API documentation in `README.md` to reflect new endpoints and features.

### Removed

- Removed outdated logging code in `express.js` related to socket errors and timeouts.
- Deleted unused `providers/ESPN.js` file to streamline the codebase.

### Fixed

- Fixed issues with unhandled promise rejections in `express.js` to ensure proper error logging.

## [v0.4.0] - 2025-10-28

<!-- Processed commits: 3824760,9d650ef,a7665c1,eb983ad -->

### Added

- Added support for trimming images to remove transparent borders in `helpers/imageUtils.js`.
- Introduced new function `trimImage` in `helpers/imageUtils.js` for image processing.
- Added support for NCAA Women's Basketball with updated API parameters in `README.md`.

### Changed

- Updated Docker workflow to trigger on `test/.*` branches in `.github/workflows/build-docker.yml`.
- Changed the API documentation to reflect the correct league parameter for NCAA Women's Basketball in `README.md`.
- Refactored image fetching logic to use `providers/ESPN.js` instead of `helpers/ESPNTeamResolver.js` in `helpers/imageUtils.js`.
- Modified cache checking middleware in `express.js` to include cover images in cache validation.

### Removed

- Removed the old `helpers/ESPNTeamResolver.js` reference and replaced it with the new provider structure in `helpers/imageUtils.js`.

### Fixed

- Fixed incorrect league parameter mapping for NCAA Women's Basketball in `README.md`.
- Resolved issues with image caching for cover images in `express.js`.

## [v0.3.2] - 2025-10-23

<!-- Processed commits: c65075b,e7019b8 -->

### Added

- Added support for trimming images to remove transparent borders in `helpers/imageUtils.js`.
- Introduced new function `trimImage` in `helpers/imageUtils.js` for image processing.
- Added support for NCAA Women's Basketball with updated API parameters in `README.md`.
- Added explicit `.png` naming support to logo and thumbnail endpoints in `routes/logo.js` and `routes/thumb.js`.
- Introduced support for multiple paths in route registration in `express.js`.
- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added a `.gitignore` file to exclude unnecessary files and directories.

### Changed

- Updated Docker workflow to trigger on `test/.*` branches in `.github/workflows/build-docker.yml`.
- Changed the API documentation to reflect the correct league parameter for NCAA Women's Basketball in `README.md`.
- Refactored image fetching logic to use `providers/ESPN.js` instead of `helpers/ESPNTeamResolver.js` in `helpers/imageUtils.js`.
- Modified cache checking middleware in `express.js` to include cover images in cache validation.
- Updated README.md to reflect the new optional `.png` extension for logo and thumbnail endpoints.
- Modified logo size calculation to allocate 50% of the canvas for each logo in `helpers/logoGenerator.js`.
- Adjusted spacing between logos to 0.5% of the width in `helpers/logoGenerator.js`.
- Enhanced logo drawing logic to check if an outline is needed based on background color in `helpers/thumbnailGenerator.js`.

### Deprecated

- Deprecated single path route registration in favor of multiple paths in `express.js` (commented out old code).

### Removed

- Removed the old `helpers/ESPNTeamResolver.js` reference and replaced it with the new provider structure in `helpers/imageUtils.js`.

### Fixed

- Fixed incorrect league parameter mapping for NCAA Women's Basketball in `README.md`.
- Resolved issues with image caching for cover images in `express.js`.
- Corrected the logo drawing logic to ensure outlines are applied when necessary in `helpers/thumbnailGenerator.js`.

## [v0.3.1] - 2025-10-23

<!-- Processed commits: aaafc74 -->

### Added

- Added explicit `.png` naming support to logo and thumbnail endpoints in `routes/logo.js` and `routes/thumb.js`.
- Introduced support for multiple paths in route registration in `express.js`.
- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added a `.gitignore` file to exclude unnecessary files and directories.

### Changed

- Updated README.md to reflect the new optional `.png` extension for logo and thumbnail endpoints.
- Modified logo size calculation to allocate 50% of the canvas for each logo in `helpers/logoGenerator.js`.
- Adjusted spacing between logos to 0.5% of the width in `helpers/logoGenerator.js`.
- Enhanced logo drawing logic to check if an outline is needed based on background color in `helpers/thumbnailGenerator.js`.
- Updated example URLs in README.md to use proper URL encoding for team names.

### Deprecated

- Deprecated single path route registration in favor of multiple paths in `express.js` (commented out old code).

### Fixed

- Fixed URL encoding for "Los Angeles" in example endpoints in README.md.
- Corrected the logo drawing logic to ensure outlines are applied when necessary in `helpers/thumbnailGenerator.js`.

## [v0.3.0] - 2025-10-23

<!-- Processed commits: 907387a,dccd0c6,e12a6a6 -->

### Added

- Added explicit `.png` naming support to logo and thumbnail endpoints in `routes/logo.js` and `routes/thumb.js`.
- Introduced support for multiple paths in route registration in `express.js`.
- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added a `.gitignore` file to exclude unnecessary files and directories.

### Changed

- Updated README.md to reflect the new optional `.png` extension for logo and thumbnail endpoints.
- Modified logo size calculation to allocate 50% of the canvas for each logo in `helpers/logoGenerator.js`.
- Adjusted spacing between logos to 0.5% of the width in `helpers/logoGenerator.js`.
- Enhanced logo drawing logic to check if an outline is needed based on background color in `helpers/thumbnailGenerator.js`.
- Updated example URLs in README.md to use proper URL encoding for team names.

### Deprecated

- Deprecated single path route registration in favor of multiple paths in `express.js` (commented out old code).

### Fixed

- Fixed URL encoding for "Los Angeles" in example endpoints in README.md.
- Corrected the logo drawing logic to ensure outlines are applied when necessary in `helpers/thumbnailGenerator.js`.

## [v0.2.0] - 2025-10-23

<!-- Processed commits: 039d6b0,f791d33 -->

### Added

- Added explicit `.png` naming support to logo and thumbnail endpoints in `routes/logo.js` and `routes/thumb.js`.
- Introduced support for multiple paths in route registration in `express.js`.
- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added a `.gitignore` file to exclude unnecessary files and directories.
- Added .dockerignore file to exclude unnecessary files from Docker builds.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Created Dockerfile for containerizing the application.
- Added express.js file to handle server routing and middleware.
- Implemented ESPNTeamResolver.js to resolve team data from ESPN API.
- Developed imageCache.js for caching images to improve performance.
- Created thumbnailGenerator.js for generating image thumbnails.
- Added index.js as the entry point for the application.
- Included routes/thumb.js for handling thumbnail-related routes.
- Updated package.json to manage project dependencies.
- Generated yarn.lock file for consistent dependency management.

### Changed

- Updated README.md to reflect the new optional `.png` extension for logo and thumbnail endpoints.
- Modified logo size calculation to allocate 50% of the canvas for each logo in `helpers/logoGenerator.js`.
- Adjusted spacing between logos to 0.5% of the width in `helpers/logoGenerator.js`.
- Enhanced logo drawing logic to check if an outline is needed based on background color in `helpers/thumbnailGenerator.js`.
- Updated example URLs in README.md to use proper URL encoding for team names.
- Configured GitHub Actions to trigger on push events to tags matching 'v*'.
- Adjusted Docker build process to support multi-platform builds for Linux.
- Enhanced image information retrieval in the GitHub Actions workflow.
- Modified the logging in step to provide clearer output during Docker image push.

### Deprecated

- Deprecated single path route registration in favor of multiple paths in `express.js` (commented out old code).

### Removed

- Removed any default configurations that may have been included in the initial setup.

### Fixed

- Fixed URL encoding for "Los Angeles" in example endpoints in README.md.
- Corrected the logo drawing logic to ensure outlines are applied when necessary in `helpers/thumbnailGenerator.js`.

## [v0.1.0] - 2025-10-23

<!-- Processed commits: 559726f -->

### Added

- Added .dockerignore file to exclude unnecessary files from Docker builds.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Created Dockerfile for containerizing the application.
- Added express.js file to handle server routing and middleware.
- Implemented ESPNTeamResolver.js to resolve team data from ESPN API.
- Developed imageCache.js for caching images to improve performance.
- Created thumbnailGenerator.js for generating image thumbnails.
- Added index.js as the entry point for the application.
- Included routes/thumb.js for handling thumbnail-related routes.
- Updated package.json to manage project dependencies.
- Generated yarn.lock file for consistent dependency management.

### Changed

- Configured GitHub Actions to trigger on push events to tags matching 'v*'.
- Adjusted Docker build process to support multi-platform builds for Linux.
- Enhanced image information retrieval in the GitHub Actions workflow.
- Modified the logging in step to provide clearer output during Docker image push.

### Removed

- Removed any default configurations that may have been included in the initial setup.
