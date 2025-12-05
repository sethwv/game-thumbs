# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Processed commits: 46e4040,5125224,8566867,8f0282d,bec96e0,c8129b1,c98104d -->

### Added

- Added GitHub Actions workflow for automatic changelog generation in `.github/workflows/changelog.yml`.
- Introduced a script for processing changelog entries in chunks in `.github/workflows/scripts/process-changelog-chunked.py`.
- Created a new `CHANGELOG.md` file to track project changes.
- Introduced `helpers/colorUtils.js` to provide color manipulation utilities, replacing the functionality previously found in `colorExtractor.js`.
- Introduced a mechanism to track which commits belong to which version for better metadata management in the changelog.
- Added comments to clarify the purpose of new logic in `process_in_chunks` function.
- Implemented a check to handle cases where no commits exist for a version tag, ensuring the changelog remains informative.
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`.
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
- Introduced team slug extraction for override lookup in `providers/ESPNProvider.js` and `providers/TheSportsDBProvider.js`.
- Added new team override for "utah-mammoth" in `teams.json` with abbreviation "UTA".
- Added support for new style "99" in API documentation for covers and thumbnails in `docs/api-reference/cover.md` and `docs/api-reference/thumb.md`.
- Implemented `loadTrimmedLogo` function in `helpers/imageUtils.js` for loading and trimming team logos in a single step.

### Changed

- Enhanced the changelog generation process to include commit diffs and metadata.
- Modified the workflow to check for changes in `CHANGELOG.md` and create a pull request if changes are detected.
- Converted `helpers/genericImageGenerator.js` to `generators/genericImageGenerator.js` and updated import paths for utility functions.
- Converted `helpers/logoGenerator.js` to `generators/logoGenerator.js` and updated import paths for utility functions.
- Converted `helpers/thumbnailGenerator.js` to `generators/thumbnailGenerator.js` and updated import paths for utility functions.
- Refactored imports in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to use the new structure under `generators`.
- Updated `package.json` to reflect changes in dependencies related to Axios integration.
- Updated `format_changelog` function to include an additional parameter `unreleased_commit_hashes` for tracking unreleased commit hashes.
- Refactored `process_in_chunks` function in `.github/workflows/scripts/process-changelog-chunked.py` to improve version mapping parsing.
- Simplified logic for handling version sections by removing unnecessary checks and conditions.
- Updated handling of unreleased entries to streamline the process when no version metadata is present.
- Updated logic to append a note for versions with processed commits but no entries extracted.
- Refined the process of building a mapping of commits to versions for better tracking in the changelog.
- Updated regex in `process-changelog-chunked.py` to match multiple commit hashes in the format "v0.6.2: abc1234,def5678 | v0.6.1: ghi9012".
- Enhanced `parse_and_merge_entries` function to split and update commit hashes from matched groups.
- Updated the commit message format in `.github/workflows/changelog.yml` to use "Changelog Update #${{ github.run_number }}" instead of the previous format.
- Changed the branch naming convention for changelog updates to `changelog/${{ github.run_number }}` in `.github/workflows/changelog.yml`.
- Updated the GitHub Actions workflow for changelog generation to use `peter-evans/create-pull-request@v7` for creating pull requests.
- Refined the logic in `merge_changelog_entries` to ensure that commit hash metadata is embedded in both unreleased and released entries.
- Enhanced changelog generation workflow to extract already processed commit hashes from existing changelog.
- Implemented filtering of already-processed commits to avoid duplication in changelog entries.
- Updated workflow to always use chunked processing for changelog generation, ensuring consistency.
- Modified output messages to provide clearer feedback on the changelog generation process.
- Refactored the changelog generation workflow to include AI-powered analysis using GitHub Models.
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
- Modified `TheSportsDBProvider.js` to utilize `getTeamMatchScoreWithOverrides` for improved team matching accuracy.
- Enhanced API documentation in `cover.md` and `thumb.md` to include new aspect ratio options and the new style "99".
- Refactored image cache clearing logic in `helpers/imageCache.js` to log the number of cleared cached images.
- Improved `trimImage` function in `helpers/imageUtils.js` to support caching of trimmed logos and added error handling for cache misses.

### Removed

- Deleted `CHANGELOG.md` file, resulting in the removal of all changelog entries.
- Deleted `helpers/colorExtractor.js`, which contained functionality for extracting dominant colors from images.
- Reverted the changelog update by deleting the entire `CHANGELOG.md` file, which included 509 entries.
- Removed redundant code for splitting entries by version headers in `process_in_chunks` function.
- Eliminated the need for maintaining separate lists for current version lines, simplifying the overall code structure.
- Deleted backfill prompt template as it is no longer needed.
- Removed update prompt template since it is no longer required.
- Eliminated the script for formatting changelog entries due to changes in the workflow.
- Removed the manual git commands for creating branches and committing changes in the changelog workflow.
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

- Resolved issues with commit processing to ensure accurate changelog entries and summaries.
- Fixed potential errors in handling dirty working directory states during changelog generation.
- Corrected the logic in `process_single_batch` to ensure that unreleased commits are properly tracked and categorized.
- Corrected the logic for handling cases where the AI response did not split entries by version headers, ensuring all entries are accounted for.
- Corrected logic in `merge_changelog_entries` to ensure that merged entries are appended correctly with associated commit hashes.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.
- Corrected logic to check for new commits to process, ensuring accurate changelog updates.
- Fixed handling of dirty working directory states to correctly append `-dirty` to the current version when applicable.
- Resolved issues with detecting changes in the `CHANGELOG.md` file to ensure accurate updates.
- Fixed handling of entry blocks to ensure proper categorization and merging of changelog entries.
- Fixed timeout handling in `fetchImage` and `downloadImage` functions to throw meaningful errors when requests exceed the specified timeout.
- Fixed issue in `helpers/imageUtils.js` where the logo drawing function did not maintain aspect ratio correctly.
- Resolved potential file handling errors in `helpers/imageCache.js` when clearing cached images.

### Cleaned Up

- Removed all entries from the CHANGELOG.md file, resulting in a complete reset of the changelog documentation.
- Added a step to clean up temporary files generated during the changelog processing to maintain a tidy workspace.
- Removed all entries from the `CHANGELOG.md` file, resulting in a complete deletion of the changelog history.

## [v0.6.1] - 2025-12-02

<!-- Processed commits: 71fd070 -->

### Added

- Added Dependabot configuration file at `.github/dependabot.yml` to automate dependency updates.
- Introduced new documentation page for deprecations at `docs/DEPRECATIONS.md`.
- Added support for feeder leagues in the customization configuration, allowing fallback to alternative leagues when teams are not found.

### Changed

- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified API reference documentation to reflect unified endpoints and deprecated endpoints in `docs/api-reference/index.md`.
- Updated NCAA route documentation to include new raw data endpoint in `docs/api-reference/ncaa-route.md`.
- Enhanced customization documentation with examples of league hierarchy and feeder leagues in `docs/customization.md`.
- Revised API documentation to clarify endpoint usage and deprecated endpoints in `docs/index.md`.

### Deprecated

- Marked legacy league-specific endpoints as deprecated in `docs/DEPRECATIONS.md` and `docs/api-reference/index.md`.

### Fixed

- Fixed inconsistencies in API documentation regarding endpoint descriptions and usage examples across multiple files.

## [v0.6.2] - 2025-12-02

<!-- Processed commits: 12a786d,2bdbaf4,4065aca,788e1a6,86650ec,a94b562,ab3cfe2,b3b1418,e1596e1,e9fc790,fb256b6 -->

### Added

- Introduced environment variables to track conflict resolution status (`HAD_CONFLICTS`, `RESOLVED_CONFLICTS`, `FAILED_CONFLICTS`) in `.github/workflows/rebase-dev.yml`.
- Implemented automatic conflict resolution for specific file types, including workflow files, documentation, and package files.
- Configured Git to use a union merge tool and enabled rerere (reuse recorded resolution) for repeated conflicts in `.github/workflows/rebase-dev.yml`.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Introduced cover endpoint documentation in `docs/api-reference/cover.md`.
- Created internal JSON backups during Docker build in `Dockerfile`.
- Implemented dev branch rebase workflow in `.github/workflows/rebase-dev.yml`.
- Added Dependabot configuration file at `.github/dependabot.yml` to automate dependency updates.
- Introduced new documentation page for deprecations at `docs/DEPRECATIONS.md`.
- Added support for feeder leagues in the customization configuration, allowing fallback to alternative leagues when teams are not found.

### Changed

- Updated `.github/workflows/rebase-dev.yml` to improve conflict resolution handling during rebase operations.
- Modified the rebase strategy to use `-X ours` and `-X patience` for better conflict resolution.
- Enhanced logging for conflict resolution, including detailed summaries of resolved and unresolved conflicts.
- Updated `.dockerignore` to include custom JSON configuration directories and internal JSON backups.
- Modified `.gitignore` to ignore output files and added exceptions for `.gitkeep`.
- Enhanced `build-docker.yml` to ignore documentation changes for Docker builds.
- Improved conflict resolution logic in `rebase-dev.yml` for better handling during rebase.
- Configured Git user details in `rebase-dev.yml` for automated commits.
- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified API reference documentation to reflect unified endpoints and deprecated endpoints in `docs/api-reference/index.md`.
- Updated NCAA route documentation to include new raw data endpoint in `docs/api-reference/ncaa-route.md`.
- Enhanced customization documentation with examples of league hierarchy and feeder leagues in `docs/customization.md`.
- Revised API documentation to clarify endpoint usage and deprecated endpoints in `docs/index.md`.

### Deprecated

- Marked legacy league-specific endpoints as deprecated in `docs/DEPRECATIONS.md` and `docs/api-reference/index.md`.

### Removed

- Removed obsolete `helpers/leagueImageGenerator.js` file with 493 lines of code.
- Deleted unnecessary test files marked as DISABLED in the test suite.

### Fixed

- Resolved issues where conflicts were not properly logged or reported during the rebase process.
- Corrected the handling of unresolved conflicts to provide clearer instructions for manual resolution when necessary.
- Corrected Dockerfile to ensure compatibility with old mounting approaches by creating internal backups.
- Fixed inconsistencies in API documentation regarding endpoint descriptions and usage examples across multiple files.

## [v0.6.0] - 2025-11-26

<!-- Processed commits: 9a5189b -->

### Added

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.
- Introduced new assets for dark mode and light mode in `assets/OHL_DARKMODE.png` and `assets/OHL_LIGHTMODE.png`.
- Added new API reference documentation for various endpoints in `docs/api-reference/`.
- Added health check functionality in Dockerfile with a health check command.
- Added new contributing and customization documentation in `docs/contributing.md` and `docs/customization.md`.

### Changed

- Updated Dockerfile to include `git` as a dependency for the application.
- Modified the README.md to reflect a more concise description of the API and its features.
- Refactored the `helpers/teamMatchingUtils.js` to improve team matching logic.
- Revised the structure and content of `docs/index.md` to enhance navigation and clarity.
- Updated `package.json` to reflect new dependencies and version changes.

### Removed

- Removed unused assets from `assets/ncaa.png`, `assets/ncaab.png`, and `assets/ncaaf.png`.
- Deleted outdated sections from `README.md` that were no longer relevant to the current API functionality.

### Fixed

- Fixed issues in `providers/ESPNProvider.js` to ensure correct data retrieval for newly added soccer leagues.
- Resolved broken links in the API documentation that pointed to non-existent endpoints.
- Corrected the health check command in the Dockerfile to ensure it properly checks the application status.

## [v0.5.2] - 2025-11-08

<!-- Processed commits: e361a64 -->

### Added

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.
- Introduced new assets for dark mode and light mode in `assets/OHL_DARKMODE.png` and `assets/OHL_LIGHTMODE.png`.
- Added new API reference documentation for various endpoints in `docs/api-reference/`.
- Added health check functionality in Dockerfile with a health check command.
- Added new contributing and customization documentation in `docs/contributing.md` and `docs/customization.md`.

### Changed

- Updated Dockerfile to include `git` as a dependency for the application.
- Modified the README.md to reflect a more concise description of the API and its features.
- Refactored the `helpers/teamMatchingUtils.js` to improve team matching logic.
- Revised the structure and content of `docs/index.md` to enhance navigation and clarity.
- Updated `package.json` to reflect new dependencies and version changes.

### Removed

- Removed unused assets from `assets/ncaa.png`, `assets/ncaab.png`, and `assets/ncaaf.png`.
- Deleted outdated sections from `README.md` that were no longer relevant to the current API functionality.

### Fixed

- Fixed issues in `providers/ESPNProvider.js` to ensure correct data retrieval for newly added soccer leagues.
- Resolved broken links in the API documentation that pointed to non-existent endpoints.
- Corrected the health check command in the Dockerfile to ensure it properly checks the application status.

## [v0.5.1] - 2025-11-05

<!-- Processed commits: c872a33 -->

### Added

- Added logging configuration options in `README.md` for `LOG_TO_FILE` and `MAX_LOG_FILES`.
- Added logging functionality to write logs to files in the `./logs` directory with automatic rotation.
- Added support for NCAA shorthand endpoints for team and league logos.

### Changed

- Updated `.gitignore` to include log files and logs directory.
- Modified logging in `express.js` to use `logger.info` instead of `logger.success` for route registration.
- Enhanced API documentation in `README.md` to include new endpoints and parameters.

### Fixed

- Fixed unhandled promise rejection logging in `express.js` to ensure proper error object creation.

## [v0.5.0] - 2025-11-04

<!-- Processed commits: e956c13 -->

### Added

- Added environment variables for image caching, rate limiting, and color output in Dockerfile.
- Introduced health check in Dockerfile to monitor application status.
- Added color extraction feature to automatically extract dominant colors from team logos.
- Implemented NCAA fallback mechanism for women's sports to use men's teams when not found.
- Added support for 30+ leagues in README, including detailed descriptions for NCAA sports.

### Changed

- Updated README to reflect new features and environment variable configurations.
- Modified image caching behavior to cache both images and team data for 24 hours.
- Changed the default value for `FORCE_COLOR` in logs to `1` for better visibility in Docker/CI environments.
- Updated API documentation to include new NCAA shorthand routes and their parameters.
- Revised API endpoints to clarify league codes and their corresponding supported leagues.

### Removed

- Removed ESPN provider implementation from the codebase, streamlining the provider management system.

## [v0.4.0] - 2025-10-28

<!-- Processed commits: 3824760,9d650ef,a7665c1,eb983ad -->

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Added support for additional leagues: WNBA, UFL, EPL, MLS, UEFA Champions League, NCAA Men's Basketball, NCAA Women's Basketball.
- Introduced new image assets for NCAA teams: `assets/ncaa.png`, `assets/ncaab.png`, `assets/ncaaf.png`.
- Added `fetchLeagueData` function in `helpers/ESPNTeamResolver.js` to retrieve league data from the ESPN API.
- Added `ttf-dejavu` package to the Dockerfile for font support.
- Introduced new query parameters for thumbnail and cover generation styles in README.md.
- Implemented location abbreviation expansion in `ESPNTeamResolver.js` for more flexible team matching.

### Changed

- Updated GitHub Actions workflow in `.github/workflows/build-docker.yml` to trigger on `test/.*` branches in addition to `dev`.
- Renamed `helpers/ESPNTeamResolver.js` to `providers/ESPN.js` to better reflect its purpose.
- Changed `fetchLeagueData` import path in `helpers/imageUtils.js` to the new location in `providers/ESPN.js`.
- Updated API URL in `fetchTeamData` function in `providers/ESPN.js` to increase the limit of teams fetched from 500 to 1000.
- Modified `resolveTeam` import paths in multiple route files (`routes/cover.js`, `routes/logo.js`, `routes/raw.js`, `routes/thumb.js`) to point to the new `providers/ESPN.js`.
- Updated README.md to reflect new multi-sport support and detailed API endpoints for various leagues.
- Updated logo display logic in API examples to clarify the default behavior of the `logo` parameter.
- Refactored `normalize` function in `ESPNTeamResolver.js` for improved string handling.
- Enhanced `getMatchScore` function in `ESPNTeamResolver.js` to utilize expanded location abbreviations for scoring.
- Modified cache checking middleware in `express.js` to include cover paths in cache validation.

### Fixed

- Corrected the league short name from `naacw` to `ncaaw` in `leagues.js` for NCAA Women's Basketball.
- Fixed potential error in `fetchTeamData` when league is unsupported by using the `findLeague` function for validation.
- Resolved issues with team data caching by ensuring the cache is initialized properly before use.
- Fixed inconsistencies in query parameter descriptions in README.md for logo display options.
- Resolved issues with team matching logic in `ESPNTeamResolver.js` to improve accuracy.

## [v0.3.0] - 2025-10-23

<!-- Processed commits: 907387a,dccd0c6,e12a6a6 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Introduced checksum generation for logo images in `getWhiteLogo` function to improve cache key uniqueness in `helpers/thumbnailGenerator.js`.
- Added white diagonal line drawing functionality in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Added API documentation note regarding the use of publicly available ESPN APIs in `README.md`.

### Changed

- Refactored `shouldAddOutlineToLogo` function to use the new constant for color similarity threshold in `helpers/thumbnailGenerator.js`.
- Updated logo drawing logic to conditionally add outlines or drop shadows based on background color proximity in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Modified URL encoding for Los Angeles in API examples in `README.md`.

### Fixed

- Fixed cache size management in `getWhiteLogo` function to ensure it does not exceed the maximum defined size in `helpers/thumbnailGenerator.js`.
- Corrected shadow reset logic after drawing logos in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.

## [v0.1.0] - 2025-10-23

<!-- Processed commits: 559726f -->

### Added

- Added .dockerignore file to exclude unnecessary files from Docker builds.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Created Dockerfile for containerizing the application.
- Added express.js file to handle server setup and routing.
- Implemented ESPNTeamResolver.js to resolve team data from ESPN API.
- Developed imageCache.js for caching images to improve performance.
- Created thumbnailGenerator.js for generating image thumbnails.
- Added route handler in routes/thumb.js for thumbnail-related requests.
- Included package.json to manage project dependencies.
- Added yarn.lock for consistent dependency resolution.

### Changed

- Configured GitHub Actions to trigger on tag pushes and manual dispatch.
- Updated Docker image build process to include dynamic tagging based on GitHub events.
- Modified build step to specify platform as linux/amd64 in Docker build command.

## [v0.3.2] - 2025-10-23

<!-- Processed commits: c65075b,e7019b8 -->

### Added

- Added new helper `logoOutline.js` for adding white outlines to logos.
- Introduced `outline` option in logo generation to add white stroke to team logos without existing outlines.
- Added support for generating covers with specified aspect ratios.

### Changed

- Updated README.md to include detailed API documentation for thumbnail, cover, and logo generation endpoints.
- Modified `generateLogo` function in `logoGenerator.js` to accept `outline` parameter.
- Adjusted logo size calculation in `generateSideBySide` function to use 50% of canvas size for each logo.
- Changed thumbnail generation endpoint to explicitly support `.png` extension.
- Updated route definitions in `routes/logo.js` and `routes/thumb.js` to support both standard and `.png` endpoints.

### Fixed

- Fixed spacing calculation in `generateSideBySide` function to use 0.5% instead of 10%.
- Resolved issues with logo drawing logic to ensure outlines are only added when appropriate.

## [v0.2.0] - 2025-10-23

<!-- Processed commits: 039d6b0,f791d33 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Introduced checksum generation for logo images in `getWhiteLogo` function to improve cache key uniqueness in `helpers/thumbnailGenerator.js`.
- Added white diagonal line drawing functionality in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Added API documentation note regarding the use of publicly available ESPN APIs in `README.md`.

### Changed

- Refactored `shouldAddOutlineToLogo` function to use the new constant for color similarity threshold in `helpers/thumbnailGenerator.js`.
- Updated logo drawing logic to conditionally add outlines or drop shadows based on background color proximity in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Modified URL encoding for Los Angeles in API examples in `README.md`.

### Fixed

- Fixed cache size management in `getWhiteLogo` function to ensure it does not exceed the maximum defined size in `helpers/thumbnailGenerator.js`.
- Corrected shadow reset logic after drawing logos in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.

## [v0.3.1] - 2025-10-23

<!-- Processed commits: aaafc74 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Introduced checksum generation for logo images in `getWhiteLogo` function to improve cache key uniqueness in `helpers/thumbnailGenerator.js`.
- Added white diagonal line drawing functionality in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Added API documentation note regarding the use of publicly available ESPN APIs in `README.md`.

### Changed

- Refactored `shouldAddOutlineToLogo` function to use the new constant for color similarity threshold in `helpers/thumbnailGenerator.js`.
- Updated logo drawing logic to conditionally add outlines or drop shadows based on background color proximity in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Modified URL encoding for Los Angeles in API examples in `README.md`.

### Fixed

- Fixed cache size management in `getWhiteLogo` function to ensure it does not exceed the maximum defined size in `helpers/thumbnailGenerator.js`.
- Corrected shadow reset logic after drawing logos in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
