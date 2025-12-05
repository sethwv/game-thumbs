# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Processed commits: 46e4040,5125224,56deeb4,6dc3029,8566867,8f0282d,bec96e0,c8129b1,c98104d,d9b275a,f6f2796 -->

### Added

- Added Axios as a dependency in package.json for handling HTTP requests. <!-- c8129b1 -->
- Introduced a mechanism to track which commits belong to which version for better metadata management in the changelog. <!-- c8129b1 -->
- Added AI-powered changelog generation workflow in .github/workflows/changelog.yml. <!-- c8129b1 -->
- Introduced prompts for backfill and update in .github/workflows/prompts/backfill-prompt.txt and .github/workflows/prompts/update-prompt.txt. <!-- c8129b1 -->
- Added functionality to embed processed commit hashes in the generated changelog for both unreleased and released entries. <!-- c8129b1 -->
- Introduced `getTeamMatchScoreWithOverrides` function in helpers/teamMatchingUtils.js to consider overridden abbreviations in team matching. <!-- c8129b1 -->
- Added support for tracking commit hashes associated with each version to enhance metadata in the changelog. <!-- c8129b1 -->
- Added GitHub Actions workflow for changelog generation in `.github/workflows/changelog.yml`. <!-- 8566867 -->
- Introduced Python script for processing changelog in `.github/workflows/scripts/process-changelog-chunked.py`. <!-- 8566867 -->
- Created new `CHANGELOG.md` file to track project changes. <!-- 8566867 -->
- Implemented automated changelog update process using AI-powered analysis. <!-- 8566867 -->
- Added comments to clarify the purpose of new logic in `process_in_chunks` function. <!-- 46e4040 -->
- Implemented a check to handle cases where no commits exist for a version tag, ensuring the changelog remains informative. <!-- 46e4040 -->
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`. <!-- 46e4040 -->
- Included script for formatting changelog in `.github/workflows/scripts/format-changelog.py`. <!-- 46e4040 -->
- Implemented a check to handle cases where no commits exist for a version tag, ensuring the changelog remains informative. <!-- c98104d -->
- Added `getTeamMatchScoreWithOverrides` function to check both overridden and original team abbreviations for better matching. <!-- 8f0282d -->
- Introduced team slug extraction for override lookup in ESPN and TheSportsDB providers. <!-- 8f0282d -->
- Added new style option 99 for 3D embossed team covers and thumbnails in API documentation. <!-- 5125224 -->

### Changed

- Added concurrency configuration to changelog generation workflow to group and cancel in-progress jobs. <!-- f6f2796 -->
- Commented out the changelog-test branch from the push trigger in the changelog generation workflow. <!-- 6dc3029 -->
- Set a timeout of 10 minutes for the changelog generation job in the workflow. <!-- 6dc3029 -->
- Updated GitHub Actions workflow to set the base branch dynamically using `${{ github.ref_name }}` instead of a hardcoded `main`. <!-- c8129b1 -->
- Refactored image generation helpers by moving genericImageGenerator.js, logoGenerator.js, and thumbnailGenerator.js from the helpers directory to a new generators directory. <!-- c8129b1 -->
- Updated the GitHub Actions workflow for changelog generation to use `peter-evans/create-pull-request@v7` for creating pull requests. <!-- c8129b1 -->
- Enhanced the method of adding entries to version entries by directly associating them with all relevant versions in the batch. <!-- c8129b1 -->
- Refined the logic in merge_changelog_entries to ensure that commit hash metadata is embedded in both unreleased and released entries. <!-- c8129b1 -->
- Updated README.md to reflect new changelog generation features. <!-- 8566867 -->
- Modified workflow steps to include commit diff extraction and changelog generation logic. <!-- 8566867 -->
- Converted helper modules to a new directory structure, moving files from `helpers` to `generators`. <!-- bec96e0 -->
- Updated import paths in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to reflect the new directory structure. <!-- bec96e0 -->
- Refactored `colorUtils.js` to consolidate color-related functions previously in `colorExtractor.js`. <!-- bec96e0 -->
- Removed direct dependencies on `colorExtractor.js` in favor of consolidated color utility functions. <!-- bec96e0 -->
- Updated `format_changelog` function to include an additional parameter `unreleased_commit_hashes` for tracking unreleased commit hashes. <!-- 46e4040 -->
- Refactored `process_in_chunks` function in `.github/workflows/scripts/process-changelog-chunked.py` to improve version mapping parsing. <!-- 46e4040 -->
- Simplified logic for handling version sections by removing unnecessary checks and conditions. <!-- 46e4040 -->
- Updated handling of unreleased entries to streamline the process when no version metadata is present. <!-- 46e4040 -->
- Updated logic to append a note for versions with processed commits but no entries extracted. <!-- 46e4040 -->
- Refined the process of building a mapping of commits to versions for better tracking in the changelog. <!-- 46e4040 -->
- Simplified logic for handling version sections by removing unnecessary checks and conditions. <!-- c98104d -->
- Updated regex in `process-changelog-chunked.py` to match multiple commit hashes in the format "v0.6.2: abc1234,def5678 | v0.6.1: ghi9012". <!-- c98104d -->
- Updated ESPNProvider to use `getTeamMatchScoreWithOverrides` for improved team matching. <!-- 8f0282d -->
- Enhanced `cover.md` and `thumb.md` documentation to include new aspect ratio options and style 99. <!-- 5125224 -->
- Refactored image cache clearing logic to log the number of cleared cached images. <!-- 5125224 -->

### Removed

- Deleted CHANGELOG.md, resulting in a complete reset of the changelog documentation. <!-- c8129b1 -->
- Removed the manual git commands for creating branches and committing changes in the changelog workflow. <!-- c8129b1 -->
- Eliminated the old script for formatting changelog entries, as it was replaced by a new approach. <!-- c8129b1 -->
- Deleted unused request cleanup logic in providers/ESPNProvider.js that was part of the previous https implementation. <!-- c8129b1 -->
- Removed redundant error handling and timeout management code in downloadImage function in helpers/imageUtils.js, now managed by Axios. <!-- c8129b1 -->
- Deleted `helpers/colorExtractor.js` due to consolidation of its functionality into `helpers/colorUtils.js`. <!-- bec96e0 -->
- Removed redundant code for splitting entries by version headers in `process_in_chunks` function. <!-- 46e4040 -->
- Eliminated the need for maintaining separate lists for current version lines, simplifying the overall code structure. <!-- 46e4040 -->
- Deleted backfill prompt template as it is no longer needed. <!-- 46e4040 -->
- Removed update prompt template since it is no longer required. <!-- 46e4040 -->
- Eliminated the script for formatting changelog entries due to changes in the workflow. <!-- 46e4040 -->
- Removed legacy code that handled AI-generated version headers, streamlining the process for version entry assignment. <!-- 46e4040 -->
- Eliminated the need for maintaining separate lists for current version lines, simplifying the overall code structure. <!-- c98104d -->
- Eliminated the script for formatting changelog entries due to changes in the workflow. <!-- c98104d -->

### Fixed

- Capped the wait time for API rate limits to a maximum of 5 minutes to avoid excessively long waits. <!-- 56deeb4 -->
- Implemented validation for per-line hash comments to ensure at least one hash exists in git before including the entry in the changelog. <!-- d9b275a -->
- Added logic to skip lines with invalid commit hashes to prevent including entries from rebased or squashed commits. <!-- d9b275a -->
- Corrected the logic in process_single_batch to ensure that unreleased commits are properly tracked and categorized. <!-- c8129b1 -->
- Fixed handling of entry blocks to ensure proper categorization and merging of changelog entries. <!-- c8129b1 -->
- Resolved issues with duplicate entries in the changelog by consolidating similar entries in the consolidate_similar_entries function. <!-- c8129b1 -->
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout. <!-- c8129b1 -->
- Corrected logic to check for new commits to process, ensuring accurate changelog updates. <!-- c8129b1 -->
- Corrected the logic in `process_single_batch` to ensure that unreleased commits are properly tracked and categorized. <!-- 46e4040 -->
- Resolved potential request timeout issues by implementing Axios's built-in timeout handling in various providers. <!-- 46e4040 -->
- Fixed image trimming logic to ensure proper aspect ratio is maintained when drawing logos. <!-- 5125224 -->
- Resolved caching issues in image utilities by implementing proper cache directory checks and clearing logic. <!-- 5125224 -->

### Cleaned Up

- Added a step to clean up temporary files generated during the changelog processing to maintain a tidy workspace. <!-- c98104d -->

## [v0.6.1] - 2025-12-02

<!-- Processed commits: 71fd070 -->

### Added

- Added Dependabot configuration file for automated dependency updates. <!-- b3b1418 -->
- Added deprecation notices documentation to inform users of deprecated features. <!-- 71fd070 -->
- Introduced new unified API endpoints for league and team images. <!-- 71fd070 -->

### Changed

- Updated Express dependency from version 5.2.0 to 5.2.1. <!-- 4065aca -->
- Modified API documentation to reflect changes in endpoint structure and deprecated endpoints. <!-- 71fd070 -->
- Enhanced customization documentation with new `feederLeagues` configuration option. <!-- 71fd070 -->

### Deprecated

- Marked legacy league-specific endpoints as deprecated in API documentation. <!-- 71fd070 -->
- Deprecated individual team logo endpoints in favor of unified logo endpoints. <!-- 71fd070 -->

### Fixed

- Resolved inconsistencies in API documentation regarding endpoint descriptions and usage. <!-- 71fd070 -->

## [v0.6.2] - 2025-12-02

<!-- Processed commits: 12a786d,2bdbaf4,4065aca,788e1a6,86650ec,a94b562,ab3cfe2,b3b1418,e1596e1,e9fc790,fb256b6 -->

### Added

- Added echo statements to indicate successful conflict resolution during rebase. <!-- 86650ec -->
- Introduced environment variables for tracking conflict resolution status. <!-- fb256b6 -->
- Added detailed summaries for conflicts detected and auto-resolved during the rebase process. <!-- fb256b6 -->
- Configured Git to use a union merge tool for automatic conflict resolution. <!-- e1596e1 -->
- Enabled rerere (reuse recorded resolution) for repeated conflicts in Git. <!-- e1596e1 -->
- Added automated testing workflow in `.github/workflows/automated-testing.yml`. <!-- ab3cfe2 -->
- Introduced new API reference documentation for cover endpoints in `docs/api-reference/cover.md`. <!-- ab3cfe2 -->
- Created internal JSON backup files during Docker build in `Dockerfile`. <!-- ab3cfe2 -->
- Added paths-ignore to Docker build workflow to exclude documentation changes. <!-- 788e1a6 -->
- Enhanced dev branch update workflow with automatic conflict resolution in `rebase-dev.yml`. <!-- 2bdbaf4 -->
- Added permissions for GitHub Actions to write to branches in `rebase-dev.yml`. <!-- a94b562 -->
- Established new rebase dev workflow in `.github/workflows/rebase-dev.yml`. <!-- e9fc790 -->
- Added Dependabot configuration file for automated dependency updates. <!-- b3b1418 -->
- Added deprecation notices documentation to inform users of deprecated features. <!-- 71fd070 -->
- Introduced new unified API endpoints for league and team images. <!-- 71fd070 -->

### Changed

- Modified the rebase workflow to include a force push after successful rebase. <!-- 86650ec -->
- Modified `.dockerignore` to include internal JSON backups and custom JSON configuration directories. <!-- ab3cfe2 -->
- Updated `Dockerfile` to create directories for additional JSON configuration files. <!-- ab3cfe2 -->
- Refactored `helpers/jsonMerger.js` with significant changes for improved functionality. <!-- ab3cfe2 -->
- Adjusted build Docker workflow to prevent actions from running for dependabot and GitHub actions users. <!-- 788e1a6 -->
- Enhanced logging and conflict resolution messages in `rebase-dev.yml`. <!-- 2bdbaf4 -->
- Updated Express dependency from version 5.2.0 to 5.2.1. <!-- 4065aca -->
- Modified API documentation to reflect changes in endpoint structure and deprecated endpoints. <!-- 71fd070 -->
- Enhanced customization documentation with new `feederLeagues` configuration option. <!-- 71fd070 -->

### Deprecated

- Marked legacy league-specific endpoints as deprecated in API documentation. <!-- 71fd070 -->
- Deprecated individual team logo endpoints in favor of unified logo endpoints. <!-- 71fd070 -->

### Fixed

- Resolved issues with automatic conflict resolution by improving the logic for handling different file types. <!-- fb256b6 -->
- Fixed the rebase process to ensure continuation only occurs if all conflicts are resolved. <!-- e1596e1 -->
- Fixed issues in test files by adding comprehensive test cases in `test/*`. <!-- ab3cfe2 -->
- Resolved automatic conflict resolution failure in the rebase process in `rebase-dev.yml`. <!-- 2bdbaf4 -->
- Resolved inconsistencies in API documentation regarding endpoint descriptions and usage. <!-- 71fd070 -->

## [v0.6.0] - 2025-11-26

<!-- Processed commits: 9a5189b -->

### Added

- Added La Liga soccer league configuration in `leagues.json`. <!-- e361a64 -->
- Added new API reference documentation for various endpoints in `docs/api-reference`. <!-- 9a5189b -->

### Changed

- Updated Dockerfile to include git installation for `/info` endpoint. <!-- 9a5189b -->
- Modified README.md to reflect changes in API features and usage instructions. <!-- 9a5189b -->
- Refactored health check command in Dockerfile to improve reliability. <!-- 9a5189b -->
- Updated `helpers/teamMatchingUtils.js` to enhance team matching logic. <!-- 9a5189b -->

### Removed

- Removed unused assets including `assets/ncaa.png`, `assets/ncaab.png`, and `assets/ncaaf.png`. <!-- 9a5189b -->
- Removed outdated sections from README.md that no longer apply to current functionality. <!-- 9a5189b -->

### Fixed

- Fixed issues in `express.js` related to route handling for new API endpoints. <!-- 9a5189b -->
- Resolved bugs in `providers/ProviderManager.js` affecting data retrieval from ESPN. <!-- 9a5189b -->

## [v0.5.2] - 2025-11-08

<!-- Processed commits: e361a64 -->

### Added

- Added La Liga soccer league configuration in `leagues.json`. <!-- e361a64 -->
- Added new API reference documentation for various endpoints in `docs/api-reference`. <!-- 9a5189b -->

### Changed

- Updated Dockerfile to include git installation for `/info` endpoint. <!-- 9a5189b -->
- Modified README.md to reflect changes in API features and usage instructions. <!-- 9a5189b -->
- Refactored health check command in Dockerfile to improve reliability. <!-- 9a5189b -->
- Updated `helpers/teamMatchingUtils.js` to enhance team matching logic. <!-- 9a5189b -->

### Removed

- Removed unused assets including `assets/ncaa.png`, `assets/ncaab.png`, and `assets/ncaaf.png`. <!-- 9a5189b -->
- Removed outdated sections from README.md that no longer apply to current functionality. <!-- 9a5189b -->

### Fixed

- Fixed issues in `express.js` related to route handling for new API endpoints. <!-- 9a5189b -->
- Resolved bugs in `providers/ProviderManager.js` affecting data retrieval from ESPN. <!-- 9a5189b -->

## [v0.5.1] - 2025-11-05

## [v0.5.0] - 2025-11-04

## [v0.4.0] - 2025-10-28

<!-- Processed commits: 3824760,9d650ef,a7665c1,eb983ad -->

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images. <!-- a7665c1 -->
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching. <!-- a7665c1 -->
- Added support for Women's National Basketball Association (WNBA) in the API. <!-- 9d650ef -->
- Added NCAA Women's Basketball support in the API. <!-- 9d650ef -->
- Added new binary assets for NCAA logos (ncaaf.png, ncaab.png, ncaa.png). <!-- 9d650ef -->
- Added `ttf-dejavu` package to Dockerfile for font support. <!-- 3824760 -->
- Introduced new cover generation endpoint `/:league/:team1/:team2/cover` for creating vertical matchup covers. <!-- e7019b8 -->

### Changed

- Updated Docker workflow in `.github/workflows/build-docker.yml` to include `test/.*` branch for builds. <!-- a7665c1 -->
- Renamed `helpers/ESPNTeamResolver.js` to `providers/ESPN.js` and updated references throughout the codebase. <!-- a7665c1 -->
- Changed the limit parameter in the ESPN API URL from 500 to 1000 in `providers/ESPN.js`. <!-- a7665c1 -->
- Updated `README.md` to correct the league abbreviation for NCAA Women's Basketball from `naacw` to `ncaaw`. <!-- a7665c1 -->
- Modified logo generation routes in `routes/logo.js`, `routes/cover.js`, `routes/raw.js`, and `routes/thumb.js` to use the new `providers/ESPN.js`. <!-- a7665c1 -->
- Updated README.md to reflect new supported leagues and their API parameters. <!-- 9d650ef -->
- Modified the logo display parameter in the API to default to true. <!-- 9d650ef -->
- Refactored the ESPNTeamResolver.js to include a new function for fetching league data. <!-- 9d650ef -->
- Improved caching mechanism in ESPNTeamResolver.js for team and league data. <!-- 9d650ef -->
- Refactored `logoOutline.js` to `imageUtils.js`, consolidating image utility functions. <!-- 3824760 -->
- Modified cache checking middleware to include cover images along with thumbs and logos. <!-- eb983ad -->
- Changed aspect ratio for cover images to 3:4 in the API documentation. <!-- e7019b8 -->

### Fixed

- Fixed incorrect league abbreviation for NCAA Women's Basketball in `leagues.js`. <!-- a7665c1 -->
- Fixed error handling in the fetchTeamData function to correctly throw an error for unsupported leagues. <!-- 9d650ef -->
- Resolved potential memory leak in the team cache implementation in ESPNTeamResolver.js. <!-- 9d650ef -->
- Fixed cache middleware to correctly check for cover image requests. <!-- eb983ad -->
- Resolved issues with white outlines in logo generation for better visibility. <!-- e7019b8 -->

## [v0.3.0] - 2025-10-23

<!-- Processed commits: 907387a,dccd0c6,e12a6a6 -->

### Added

- Added explicit `.png` naming to logo and thumbnail endpoints in README.md. <!-- c65075b -->
- Introduced support for multiple paths in logo and thumbnail routes for optional `.png` extension. <!-- c65075b -->
- Added `.gitignore` file to exclude unnecessary files from version control. <!-- 039d6b0 -->
- Created README.md file with detailed API documentation and features. <!-- 039d6b0 -->

### Changed

- Updated thumbnail generation endpoint documentation to reflect optional `.png` extension in README.md. <!-- c65075b -->
- Refactored logo outline logic in `helpers/thumbnailGenerator.js` to use a constant for color similarity threshold. <!-- aaafc74 -->

### Deprecated

- Deprecated single path route handling in favor of multiple paths for logo and thumbnail routes. <!-- c65075b -->

### Fixed

- Fixed URL encoding for "Los Angeles" in API examples within README.md. <!-- dccd0c6 -->
- Addressed potential issues in logo color outline logic in `helpers/thumbnailGenerator.js`. <!-- aaafc74 -->

## [v0.2.0] - 2025-10-23

<!-- Processed commits: 039d6b0,f791d33 -->

### Added

- Added explicit `.png` naming to logo and thumbnail endpoints in README.md. <!-- c65075b -->
- Introduced support for multiple paths in logo and thumbnail routes for optional `.png` extension. <!-- c65075b -->
- Added `.gitignore` file to exclude unnecessary files from version control. <!-- 039d6b0 -->
- Created README.md file with detailed API documentation and features. <!-- 039d6b0 -->

### Changed

- Updated thumbnail generation endpoint documentation to reflect optional `.png` extension in README.md. <!-- c65075b -->
- Refactored logo outline logic in `helpers/thumbnailGenerator.js` to use a constant for color similarity threshold. <!-- aaafc74 -->

### Deprecated

- Deprecated single path route handling in favor of multiple paths for logo and thumbnail routes. <!-- c65075b -->

### Fixed

- Fixed URL encoding for "Los Angeles" in API examples within README.md. <!-- dccd0c6 -->
- Addressed potential issues in logo color outline logic in `helpers/thumbnailGenerator.js`. <!-- aaafc74 -->

## [v0.3.2] - 2025-10-23

<!-- Processed commits: c65075b,e7019b8 -->

### Added

- Added `ttf-dejavu` package to Dockerfile for font support. <!-- 3824760 -->
- Introduced new cover generation endpoint `/:league/:team1/:team2/cover` for creating vertical matchup covers. <!-- e7019b8 -->
- Added support for multiple cover styles in the API documentation. <!-- e7019b8 -->
- Added explicit `.png` naming to logo and thumbnail endpoints in README.md. <!-- c65075b -->
- Introduced support for multiple paths in logo and thumbnail routes for optional `.png` extension. <!-- c65075b -->
- Added `.gitignore` file to exclude unnecessary files from version control. <!-- 039d6b0 -->
- Created README.md file with detailed API documentation and features. <!-- 039d6b0 -->

### Changed

- Refactored `logoOutline.js` to `imageUtils.js`, consolidating image utility functions. <!-- 3824760 -->
- Updated README.md to include new cover generation details and examples. <!-- 3824760 -->
- Modified cache checking middleware to include cover images along with thumbs and logos. <!-- eb983ad -->
- Changed aspect ratio for cover images to 3:4 in the API documentation. <!-- e7019b8 -->
- Updated thumbnail generation endpoint documentation to reflect optional `.png` extension in README.md. <!-- c65075b -->
- Refactored logo outline logic in `helpers/thumbnailGenerator.js` to use a constant for color similarity threshold. <!-- aaafc74 -->

### Deprecated

- Deprecated single path route handling in favor of multiple paths for logo and thumbnail routes. <!-- c65075b -->

### Fixed

- Fixed cache middleware to correctly check for cover image requests. <!-- eb983ad -->
- Resolved issues with white outlines in logo generation for better visibility. <!-- e7019b8 -->
- Fixed URL encoding for "Los Angeles" in API examples within README.md. <!-- dccd0c6 -->
- Addressed potential issues in logo color outline logic in `helpers/thumbnailGenerator.js`. <!-- aaafc74 -->

## [v0.1.0] - 2025-10-23

## [v0.3.1] - 2025-10-23

<!-- Processed commits: aaafc74 -->

### Added

- Added explicit `.png` naming to logo and thumbnail endpoints in README.md. <!-- c65075b -->
- Introduced support for multiple paths in logo and thumbnail routes for optional `.png` extension. <!-- c65075b -->
- Added `.gitignore` file to exclude unnecessary files from version control. <!-- 039d6b0 -->
- Created README.md file with detailed API documentation and features. <!-- 039d6b0 -->

### Changed

- Updated thumbnail generation endpoint documentation to reflect optional `.png` extension in README.md. <!-- c65075b -->
- Refactored logo outline logic in `helpers/thumbnailGenerator.js` to use a constant for color similarity threshold. <!-- aaafc74 -->

### Deprecated

- Deprecated single path route handling in favor of multiple paths for logo and thumbnail routes. <!-- c65075b -->

### Fixed

- Fixed URL encoding for "Los Angeles" in API examples within README.md. <!-- dccd0c6 -->
- Addressed potential issues in logo color outline logic in `helpers/thumbnailGenerator.js`. <!-- aaafc74 -->
