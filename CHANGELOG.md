# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Processed commits: 46e4040,5125224,8566867,8f0282d,bec96e0,c770cf6,c8129b1,c98104d -->

### Added

- Created a new `CHANGELOG.md` file to store generated changelog entries.
- Introduced a GitHub Actions workflow for automatic changelog generation.
- Implemented a step to output the generated changelog to the GitHub Actions summary.
- Included logic to strip batch metadata before processing changelog entries.
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
- Introduced team slug extraction for override lookup in `providers/ESPNProvider.js`.
- Added team slug extraction for override lookup in `providers/TheSportsDBProvider.js`.
- Added new team override for "utah-mammoth" in `teams.json` with abbreviation "UTA".
- Added new style option "Style 99" for 3D embossed team covers in `docs/api-reference/cover.md` and `docs/api-reference/thumb.md`.
- Added cache directory creation for trimmed logos in `helpers/imageUtils.js`.

### Changed

- Updated the changelog generation process to include version and tag information.
- Adjusted the workflow to check for changes in `CHANGELOG.md` before creating a pull request.
- Converted `helpers/genericImageGenerator.js` to `generators/genericImageGenerator.js` and updated import paths for utilities from `imageUtils` and `colorUtils`.
- Renamed `helpers/logoGenerator.js` to `generators/logoGenerator.js` and adjusted import paths for `imageUtils` and `logger`.
- Refactored `helpers/thumbnailGenerator.js` to `generators/thumbnailGenerator.js` and modified import paths for `imageUtils` and `logger`.
- Consolidated color utility functions by moving them from `helpers/colorUtils.js` to a more structured location, enhancing modularity.
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
- Updated import paths in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to reflect the new directory structure.
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
- Updated `ESPNProvider` to use `getTeamMatchScoreWithOverrides` instead of the original team matching function.
- Updated `TheSportsDBProvider` to use `getTeamMatchScoreWithOverrides` for team matching.
- Modified aspect ratio options in API documentation for cover and thumbnail endpoints to include `1-1`.
- Cleaned up image cache clearing logic in `helpers/imageCache.js` to log the number of cleared cached images.
- Enhanced `loadTrimmedLogo` function in `helpers/imageUtils.js` to provide automatic selection, downloading, and trimming of team logos.
- Improved `trimImage` function to include caching logic based on image buffer hash.

### Removed

- Deleted `CHANGELOG.md` file, resulting in a complete reset of the changelog documentation.
- Deleted `helpers/colorExtractor.js`, which contained functions for extracting dominant colors from images, reducing code complexity.
- Reverted the changelog update by deleting the entire `CHANGELOG.md` file, which contained 509 entries.
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

- Corrected the logic in `process_single_batch` to ensure that unreleased commits are properly tracked and categorized.
- Corrected the logic for handling cases where the AI response did not split entries by version headers, ensuring all entries are accounted for.
- Corrected logic in `merge_changelog_entries` to ensure that merged entries are appended correctly with associated commit hashes.
- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Fixed timeout handling in `fetchImage` and `downloadImage` functions to throw appropriate errors when requests exceed the specified timeout.
- Corrected logic to check for new commits to process, ensuring accurate changelog updates.
- Fixed handling of dirty working directory states to correctly append `-dirty` to the current version when applicable.
- Resolved issues with detecting changes in the `CHANGELOG.md` file to ensure accurate updates.
- Resolved potential request timeout issues by implementing Axios's built-in timeout handling in various providers.
- Fixed handling of entry blocks to ensure proper categorization and merging of changelog entries.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.
- Fixed issue in `helpers/imageUtils.js` where the logo drawing function now maintains aspect ratio correctly.
- Resolved potential cache miss issue in `trimImage` function by checking if the source image has changed before caching.

### Cleaned Up

- Added a step to clean up temporary files generated during the changelog processing to maintain a tidy workspace.

## [v0.6.2] - 2025-12-02

<!-- Processed commits: 12a786d,2bdbaf4,4065aca,788e1a6,86650ec,a94b562,ab3cfe2,b3b1418,e1596e1,e9fc790,fb256b6 -->

### Added

- Introduced environment variables for tracking conflict resolution status in the rebase workflow.
- Added configuration for automatic conflict resolution using the `union` merge tool and enabling `rerere` (reuse recorded resolution) in the Git configuration.
- Implemented detailed logging for conflict resolution steps, including which files were resolved and how.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Introduced cover endpoint documentation in `docs/api-reference/cover.md`.
- Created internal JSON backups during Docker build in `Dockerfile`.
- Implemented dev branch update workflow in `.github/workflows/rebase-dev.yml`.
- Added Dependabot configuration file at `.github/dependabot.yml` to automate dependency updates.
- Introduced new `feederLeagues` field in the customization configuration to specify fallback leagues when a team is not found.

### Changed

- Updated the GitHub Actions workflow for rebasing the `dev` branch onto `main` to include enhanced conflict resolution steps in `.github/workflows/rebase-dev.yml`.
- Modified the rebase strategy to use `-X ours` and `-X patience` for better conflict handling during rebases.
- Changed the summary output in the workflow to include details about automatically resolved conflicts and any unresolved conflicts.
- Updated `.dockerignore` to include internal JSON backups and custom JSON configuration directories.
- Modified `.gitignore` to ignore output directory and added exception for `.gitkeep`.
- Enhanced Docker build workflow to ignore documentation changes in `.github/workflows/build-docker.yml`.
- Updated rebase workflow to provide detailed summaries of rebase operations in `.github/workflows/rebase-dev.yml`.
- Configured Git user details for actions in the rebase workflow.
- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified API documentation to reflect unified endpoints for league and team images in `docs/api-reference/index.md`.
- Updated API reference for NCAA routes to include `raw` as a valid image type in `docs/api-reference/ncaa-route.md`.
- Revised deprecation notices in `docs/DEPRECATIONS.md` to include details about consolidated endpoints.
- Enhanced the customization documentation with an example of league hierarchy using feeder leagues in `docs/customization.md`.

### Deprecated

- Marked legacy league-specific endpoints as deprecated in `docs/api-reference/index.md` and `docs/DEPRECATIONS.md`.

### Removed

- Removed obsolete `helpers/leagueImageGenerator.js` file, which had 493 lines of code.

### Fixed

- Fixed the handling of unresolved conflicts by properly checking for remaining conflicts after attempting automatic resolutions.
- Resolved issues with automatic conflict resolution in the dev branch rebase workflow.
- Fixed inconsistencies in API documentation regarding endpoint paths and descriptions across multiple files.

## [v0.6.1] - 2025-12-02

<!-- Processed commits: 71fd070 -->

### Added

- Added Dependabot configuration file at `.github/dependabot.yml` to automate dependency updates.
- Introduced new `feederLeagues` field in the customization configuration to specify fallback leagues when a team is not found.

### Changed

- Updated Express dependency from version 5.2.0 to 5.2.1 in `package.json`.
- Modified API documentation to reflect unified endpoints for league and team images in `docs/api-reference/index.md`.
- Updated API reference for NCAA routes to include `raw` as a valid image type in `docs/api-reference/ncaa-route.md`.
- Revised deprecation notices in `docs/DEPRECATIONS.md` to include details about consolidated endpoints.
- Enhanced the customization documentation with an example of league hierarchy using feeder leagues in `docs/customization.md`.

### Deprecated

- Marked legacy league-specific endpoints as deprecated in `docs/api-reference/index.md` and `docs/DEPRECATIONS.md`.

### Fixed

- Fixed inconsistencies in API documentation regarding endpoint paths and descriptions across multiple files.

## [v0.6.0] - 2025-11-26

<!-- Processed commits: 9a5189b -->

### Added

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in leagues.json.
- Introduced new assets for dark and light mode in the project.
- Added comprehensive API reference documentation for various endpoints including league and matchup logos.

### Changed

- Updated Dockerfile to include git as a dependency for the /info endpoint.
- Modified README.md to reflect new features and provide a clearer overview of the API capabilities.
- Revised health check command in Dockerfile to improve reliability.
- Enhanced team matching utility functions in helpers/teamMatchingUtils.js for better performance.

### Removed

- Removed unused assets from the project, including ncaa.png, ncaab.png, and ncaaf.png.

### Fixed

- Fixed issues in the logo generation logic to ensure correct rendering of team logos.
- Resolved bugs in the API that caused incorrect responses for certain league endpoints.

## [v0.5.2] - 2025-11-08

<!-- Processed commits: e361a64 -->

### Added

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in leagues.json.
- Introduced new assets for dark and light mode in the project.
- Added comprehensive API reference documentation for various endpoints including league and matchup logos.

### Changed

- Updated Dockerfile to include git as a dependency for the /info endpoint.
- Modified README.md to reflect new features and provide a clearer overview of the API capabilities.
- Revised health check command in Dockerfile to improve reliability.
- Enhanced team matching utility functions in helpers/teamMatchingUtils.js for better performance.

### Removed

- Removed unused assets from the project, including ncaa.png, ncaab.png, and ncaaf.png.

### Fixed

- Fixed issues in the logo generation logic to ensure correct rendering of team logos.
- Resolved bugs in the API that caused incorrect responses for certain league endpoints.

## [v0.5.1] - 2025-11-05

<!-- Processed commits: c872a33 -->

### Added

- Added logging configuration options in `README.md` for `LOG_TO_FILE` and `MAX_LOG_FILES`.
- Introduced new API endpoints for team logos and league logos: `/:league/:team/teamlogo[.png]` and `/:league/leaguelogo[.png]`.
- Added file logging functionality in `helpers/logger.js` with automatic log rotation.
- Included NCAA shorthand endpoints for team and league logos in `README.md`.

### Changed

- Updated `.gitignore` to include log files and logs directory.
- Modified `express.js` to include `teamlogo` and `leaguelogo` in cache and rate limiting checks.
- Updated `README.md` to reflect changes in API endpoints and parameters for team and league logos.

### Fixed

- Fixed logger error handling in `helpers/logger.js` to ensure proper error object usage.
- Resolved issues with socket error and timeout logging in `express.js` by commenting out unnecessary logs.

## [v0.5.0] - 2025-11-04

<!-- Processed commits: e956c13 -->

### Added

- Added health check to Dockerfile with a healthcheck command to verify service status.
- Introduced new environment variables: `IMAGE_CACHE_HOURS`, `RATE_LIMIT_PER_MINUTE`, `FORCE_COLOR`, and `NODE_ENV` in Dockerfile.
- Added support for 30+ leagues in README, including detailed NCAA sports.
- Implemented color extraction feature to automatically extract dominant colors from team logos.
- Added fallback mechanism for NCAA Women's sports to use Men's teams when not found.

### Changed

- Updated README to reflect changes in multi-sport support and caching behavior.
- Modified the description of environment variables in README for clarity and added default values.
- Enhanced API documentation in README to include detailed examples for NCAA shorthand routes.

### Removed

- Removed ESPN provider implementation from `providers/ESPN.js`.

### Fixed

- Fixed various issues in the image cache and thumbnail generation logic to improve performance and reliability.
- Resolved discrepancies in the API documentation regarding supported leagues and their codes.

## [v0.4.0] - 2025-10-28

<!-- Processed commits: 3824760,9d650ef,a7665c1,eb983ad -->

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Added support for additional leagues: WNBA, UFL, EPL, MLS, UEFA Champions League, NCAA Men's Basketball, NCAA Women's Basketball.
- Introduced new assets for NCAA logos: `assets/ncaa.png`, `assets/ncaab.png`, `assets/ncaaf.png`.
- Implemented `fetchLeagueData` function in `helpers/ESPNTeamResolver.js` to retrieve league data from ESPN API.
- Introduced new query parameters for thumbnail generation, including styles 2, 3, and 4.
- Added location abbreviations mapping in `helpers/ESPNTeamResolver.js` for better team matching.
- Expanded location abbreviation handling in team matching logic to improve input flexibility.

### Changed

- Updated GitHub Actions workflow in `.github/workflows/build-docker.yml` to trigger on `test/.*` branches in addition to `dev`.
- Renamed `helpers/ESPNTeamResolver.js` to `providers/ESPN.js` and updated references across the codebase.
- Changed `fetchLeagueData` import path in `helpers/imageUtils.js` from `./ESPNTeamResolver` to `../providers/ESPN`.
- Modified the API URL in `providers/ESPN.js` to increase the limit of teams fetched from 500 to 1000.
- Updated `league` entry for NCAA Women's Basketball in `leagues.js` from `naacw` to `ncaaw`.
- Updated logo generation route in `routes/logo.js` to include `trim` parameter in the request handling.
- Updated README.md to reflect new multi-sport support and detailed league information.
- Changed logo display parameter in API examples to default to `true` and updated examples to reflect this change.
- Enhanced caching mechanism in `fetchTeamData` and `fetchLeagueData` functions to ensure data is cached for 24 hours.
- Updated Dockerfile to include `ttf-dejavu` package installation.
- Enhanced scoring system in `getMatchScore` function to consider compact and expanded inputs for better matching accuracy.
- Updated cache checking middleware in `express.js` to include 'cover' paths alongside 'thumb' and 'logo'.

### Fixed

- Corrected the league abbreviation for NCAA Women's Basketball in `leagues.js` to ensure consistency with the updated naming convention.
- Fixed error handling in `fetchTeamData` and `fetchLeagueData` to properly reject promises on API request failures.
- Corrected the output examples in README.md to include new style parameters for various endpoints.

## [v0.1.0] - 2025-10-23

<!-- Processed commits: 559726f -->

### Added

- Added .dockerignore file to exclude unnecessary files from Docker builds.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Created Dockerfile for containerizing the application.
- Implemented express.js for handling HTTP requests and routing.
- Developed ESPNTeamResolver.js for resolving team data from ESPN API.
- Added imageCache.js for caching images to improve performance.
- Created thumbnailGenerator.js for generating thumbnails from images.
- Established routes/thumb.js for handling thumbnail-related routes.
- Added package.json to manage project dependencies and scripts.
- Included yarn.lock for locking dependency versions.

### Changed

- Configured GitHub Actions to trigger on tag pushes and manual dispatch.
- Updated Docker image build process to include dynamic tagging based on version.
- Modified build step to run on the latest Ubuntu environment.

### Removed

- No files or features were removed in this commit.

## [v0.3.1] - 2025-10-23

<!-- Processed commits: aaafc74 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added white diagonal line drawing functionality in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Added support for dynamic API routes in `README.md`.

### Changed

- Refactored `shouldAddOutlineToLogo` function to use the new constant for color similarity threshold in `helpers/thumbnailGenerator.js`.
- Updated the logic for caching white logos to limit cache size in `helpers/thumbnailGenerator.js`.
- Modified `generateDiagonalSplit` function to check if logos need outlines based on background color in `helpers/thumbnailGenerator.js`.
- Changed URL encoding for Los Angeles in API examples in `README.md`.

### Removed

- Removed hardcoded threshold values in favor of constants in `helpers/thumbnailGenerator.js`.

### Fixed

- Fixed incorrect URL encoding for Los Angeles in API examples in `README.md`.
- Resolved issues with logo drawing logic to ensure outlines are applied correctly based on color similarity in `helpers/thumbnailGenerator.js`.

## [v0.3.0] - 2025-10-23

<!-- Processed commits: 907387a,dccd0c6,e12a6a6 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added white diagonal line drawing functionality in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Added support for dynamic API routes in `README.md`.

### Changed

- Refactored `shouldAddOutlineToLogo` function to use the new constant for color similarity threshold in `helpers/thumbnailGenerator.js`.
- Updated the logic for caching white logos to limit cache size in `helpers/thumbnailGenerator.js`.
- Modified `generateDiagonalSplit` function to check if logos need outlines based on background color in `helpers/thumbnailGenerator.js`.
- Changed URL encoding for Los Angeles in API examples in `README.md`.

### Removed

- Removed hardcoded threshold values in favor of constants in `helpers/thumbnailGenerator.js`.

### Fixed

- Fixed incorrect URL encoding for Los Angeles in API examples in `README.md`.
- Resolved issues with logo drawing logic to ensure outlines are applied correctly based on color similarity in `helpers/thumbnailGenerator.js`.

## [v0.2.0] - 2025-10-23

<!-- Processed commits: 039d6b0,f791d33 -->

### Added

- Added constants for color similarity threshold, outline width percentage, diagonal line extension, and maximum cache size in `helpers/thumbnailGenerator.js`.
- Added white diagonal line drawing functionality in `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js`.
- Added support for dynamic API routes in `README.md`.

### Changed

- Refactored `shouldAddOutlineToLogo` function to use the new constant for color similarity threshold in `helpers/thumbnailGenerator.js`.
- Updated the logic for caching white logos to limit cache size in `helpers/thumbnailGenerator.js`.
- Modified `generateDiagonalSplit` function to check if logos need outlines based on background color in `helpers/thumbnailGenerator.js`.
- Changed URL encoding for Los Angeles in API examples in `README.md`.

### Removed

- Removed hardcoded threshold values in favor of constants in `helpers/thumbnailGenerator.js`.

### Fixed

- Fixed incorrect URL encoding for Los Angeles in API examples in `README.md`.
- Resolved issues with logo drawing logic to ensure outlines are applied correctly based on color similarity in `helpers/thumbnailGenerator.js`.

## [v0.3.2] - 2025-10-23

<!-- Processed commits: c65075b,e7019b8 -->

### Added

- Added new helper `logoOutline.js` for adding white outlines to logos.
- Introduced `outline` option in logo generation to add white stroke to team logos without existing outlines.
- Added support for generating covers for sports matchups with a new endpoint.

### Changed

- Updated README.md to include detailed API documentation for thumbnail and cover generation endpoints.
- Modified `generateLogo` function in `logoGenerator.js` to accept an `outline` option.
- Enhanced logo generation logic to conditionally apply outlines based on the new `outline` parameter.
- Changed logo size calculation in `generateSideBySide` method to use 50% of the canvas for each logo.
- Updated routes for logo and thumbnail generation to support optional `.png` extension.

### Fixed

- Fixed incorrect output resolution in cover generation documentation in README.md.
- Resolved issues with route registration in `express.js` to handle multiple paths for logo and thumbnail endpoints.
