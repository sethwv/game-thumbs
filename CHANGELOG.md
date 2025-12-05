# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added a step to clean up temporary files generated during changelog processing in `.github/workflows/changelog.yml`.
- Introduced scripts for generating prompts for backfill and updates in `.github/workflows/scripts/generate-backfill-prompt.py` and `.github/workflows/scripts/generate-update-prompt.py`.
- Implemented a script for processing changelog in chunks in `.github/workflows/scripts/process-changelog-chunked.py`.
- Created a changelog formatting script in `.github/workflows/scripts/format-changelog.py`.
- Added a prompt file for backfill in `.github/workflows/prompts/backfill-prompt.txt`.
- Added a prompt file for updates in `.github/workflows/prompts/update-prompt.txt`.
- Introduced `parse_and_merge_entries` function to parse multiple entry blocks and merge them by category.
- Implemented script for generating update prompt in `.github/workflows/scripts/generate-update-prompt.py`.
- Added Axios as a dependency in `package.json`.
- Introduced `getTeamMatchScoreWithOverrides` function in `helpers/teamMatchingUtils.js` to consider overridden abbreviations in team matching.
- Added logic to extract team slug for override lookup in `providers/ESPNProvider.js`.
- Added logic to extract team slug for override lookup in `providers/TheSportsDBProvider.js`.
- Added new team override for "utah-mammoth" in `teams.json`.

### Changed

- Updated the changelog workflow to include a cleanup step that removes specific temporary files after generating the changelog.
- Updated the changelog workflow to use `peter-evans/create-pull-request@v7` for creating pull requests.
- Updated the branch creation logic to use a parameterized branch name format `changelog-update-${{ github.run_number }}`.
- Removed manual git commands for branch creation and commit in favor of using the `create-pull-request` action.
- Updated the method of creating a Pull Request to use the GitHub CLI instead of the `peter-evans/create-pull-request` action.
- Refactored `format_changelog` to merge and organize entries by category, removing duplicates.
- Improved `build_commit_version_map` logic to correctly assign commits to their respective version tags based on the presence of tags in the commit history.
- Enhanced error handling in the changelog generation process to check for successful formatting.
- Updated batch processing print statements to include more detailed information about the number of commits and the size of each batch in characters.
- Refined error handling in API calls to provide clearer messages in case of failure.
- Moved `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from the `helpers` directory to a new `generators` directory.
- Updated import paths in `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` to reflect the new directory structure.
- Consolidated color utility functions into `colorUtils.js` by adding functions for fetching images, converting RGB to hex, and calculating color brightness.
- Updated image fetching logic in `helpers/imageUtils.js` to use Axios, replacing the previous promise-based approach with async/await.
- Refactored ESPN API data fetching in `providers/ESPNProvider.js` to utilize Axios, simplifying the request handling.
- Modified TheSportsDB provider to use `getTeamMatchScoreWithOverrides` for team matching in `providers/TheSportsDBProvider.js`.
- Adjusted team data structure in `teams.json` to include overrides for team abbreviations.
- Adjusted the workflow to consolidate similar entries in the changelog.
- Enhanced `extract_processed_commits` function to verify commit hashes still exist in git history, handling squashed/rebased commits.
- Updated `process_single_batch` to determine if a batch contains multiple versions and adjust output formatting accordingly.
- Modified the commit retrieval logic to handle both backfill and normal updates based on the existence of `CHANGELOG.md`.
- Refactored `colorUtils.js` to include functions previously in `colorExtractor.js`, such as `fetchImage`, `rgbToHex`, and `getColorBrightness`.
- Migrated web requests from native `https` to Axios in `helpers/colorExtractor.js`.
- Refactored `fetchImage` function in `helpers/colorExtractor.js` to use Axios for image fetching.
- Updated `downloadImage` function in `helpers/imageUtils.js` to use Axios for downloading images.
- Modified `ESPNProvider` to use `getTeamMatchScoreWithOverrides` instead of the original matching function.
- Changed `TheSportsDBProvider` to utilize `getTeamMatchScoreWithOverrides` for team matching.

### Removed

- Removed manual steps for configuring git user details in the changelog workflow.
- Deleted the section of the workflow that manually checked for changes and created a branch if changes were detected.
- Removed the previous method of creating a Pull Request using the `peter-evans/create-pull-request` action.
- Deleted the old method of preparing prompts using `sed` commands from `.github/workflows/changelog.yml`.
- Removed hardcoded prompt content in favor of using external prompt template files.
- Deleted the `colorExtractor.js` helper file as part of the refactoring process.
- Deleted `helpers/colorExtractor.js` entirely, removing its functionality for extracting dominant colors from images.
- Removed native `https` request handling code in `helpers/colorExtractor.js`.
- Eliminated the old promise-based structure for HTTP requests in `helpers/imageUtils.js`.
- Removed unused `request` variable and cleanup logic in `ESPNProvider.js` and `TheSportsDBProvider.js`.

### Fixed

- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Corrected the logic to ensure that untracked `CHANGELOG.md` files are properly identified.
- Fixed potential bugs in batch size calculation to ensure all commits are processed correctly.
- Resolved issues with image caching logic in `helpers/imageCache.js` to ensure proper cache directory creation.
- Fixed documentation inconsistencies in `docs/api-reference/cover.md` and `docs/api-reference/thumb.md` regarding aspect ratios and styles.
- Resolved potential request timeout issues by implementing Axios timeout handling in `helpers/colorExtractor.js` and `helpers/imageUtils.js`.
- Fixed team matching logic in `providers/ESPNProvider.js` to correctly extract team slugs for override lookups.
- Corrected content in `generate-backfill-prompt.py` to ensure clarity in the role of the changelog generator.
- Improved error handling in the changelog generation process to provide a preview of the response in case of API errors.
- Fixed error handling in the API call to the models service to provide clearer error messages.

### Security

- Improved security by ensuring that the GitHub token is used correctly in the workflow scripts.
- Updated API token handling to use `MODELS_TOKEN` if available, enhancing security in `changelog.yml`.

### Documentation

- Added detailed instructions in backfill-prompt.txt for creating a CHANGELOG.md file following the Keep a Changelog format.
- Updated comments and documentation within `process-changelog-chunked.py` to clarify the purpose and functionality of new and modified functions.
- Included critical instructions in `process-changelog-chunked.py` for handling version boundaries and grouping changes effectively.

## [v0.6.2] - 2025-12-02

### Added

- Added support for a new visual style (Style 99) for covers and thumbnails, featuring a 3D embossed design with textured backgrounds and metallic VS badge.
- Introduced new aspect ratio option (1-1) for cover and thumbnail requests.
- Implemented automatic clearing of cached trimmed logos on startup.
- Added a new function `loadTrimmedLogo` to streamline logo loading, downloading, and trimming processes.
- Added configuration for automatic conflict resolution using the `union` merge tool in `.github/workflows/rebase-dev.yml`.
- Introduced environment variables to track conflict resolution status and results during the rebase process.
- Implemented a summary section in the GitHub Actions workflow to report on the status of the rebase and any conflicts that were automatically resolved.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Introduced new API reference documentation for cover endpoints in `docs/api-reference/cover.md`.
- Created internal backups for compatibility in `Dockerfile`.
- Added paths-ignore for documentation in `.github/workflows/build-docker.yml`.
- Introduced permissions for GitHub Actions in `rebase-dev.yml`.
- Added Dependabot configuration in `.github/dependabot.yml` to automate dependency updates.
- Added support for La Liga in `leagues.json`.

### Changed

- Updated API documentation for covers and thumbnails to include the new aspect ratio and style options.
- Enhanced the `drawLogoWithShadow` function to maintain aspect ratio when drawing logos.
- Modified image cache clearing logic to report the number of cleared cached images.
- Improved error handling in the `loadTrimmedLogo` function to log warnings when logo loading fails.
- Refactored the `trimImage` function to include caching logic based on image buffer hash.
- Updated GitHub Actions workflow to improve conflict resolution messaging and force push behavior after rebasing the dev branch.
- Updated GitHub Actions workflow for rebasing the `dev` branch onto `main` in `.github/workflows/rebase-dev.yml`.
- Enhanced automatic conflict resolution strategies in the rebase process by configuring `git` settings for merge tools and enabling `rerere`.
- Modified the rebase process to include a summary of conflicts detected and resolved during the workflow execution.
- Updated `.dockerignore` to include internal JSON backups and custom JSON configuration directories.
- Modified `.gitignore` to ignore output files and added a rule to keep `.gitkeep`.
- Refactored `Dockerfile` to create directories for additional JSON configuration files.
- Enhanced `rebase-dev.yml` to include detailed logging for rebase operations.
- Updated `express` dependency from version `5.2.0` to `5.2.1` in `package.json`.
- Changed `README.md` to reflect the API's support for 30+ leagues and updated features.
- Updated `express.js` to improve API handling.
- Modified `helpers/teamMatchingUtils.js` for better team matching logic.
- Updated `providers/ProviderManager.js` to enhance provider management.
- Revised `routes/xcproxy.js` to improve proxy functionality.
- Updated `helpers/thumbnailGenerator.js` to improve thumbnail generation logic with new constants for color similarity threshold and outline width percentage.
- Refactored `generateDiagonalSplit` function in `helpers/thumbnailGenerator.js` to use constants for line extension and outline width.
- Enhanced `shouldAddOutlineToLogo` function in `helpers/thumbnailGenerator.js` to utilize a constant for color similarity threshold.
- Improved caching mechanism in `getWhiteLogo` function in `helpers/thumbnailGenerator.js` to limit cache size using a constant.

### Removed

- Removed obsolete helper functions from `helpers/leagueImageGenerator.js`.
- Deleted unnecessary test files marked as DISABLED in the test suite.
- Removed unused assets: `assets/ncaa.png`, `assets/ncaab.png`, `assets/ncaaf.png`.

### Fixed

- Fixed issue where cached trimmed logos were not being cleared properly on startup.
- Resolved potential race condition in the `downloadImage` function when handling local file paths.
- Fixed handling of unresolved conflicts by checking for remaining conflicts after attempting to auto-resolve them in the rebase process.
- Resolved issues with the rebase continuation process by ensuring that the workflow correctly aborts if conflicts cannot be resolved.
- Fixed path issues in the Docker build process to ensure compatibility with internal JSON files.

## [v0.6.1] - 2025-12-02

### Added

- Added `DEPRECATIONS.md` documentation to outline deprecated features and endpoints.
- Introduced unified API endpoints for logos, covers, and thumbnails in `docs/api-reference/index.md`.
- Added support for NCAA shorthand routes in `docs/api-reference/ncaa-route.md`.
- Added `feederLeagues` configuration option in `docs/customization.md` to support league hierarchy.
- Added example for league hierarchy using feeder leagues in `docs/customization.md`.

### Changed

- Updated API reference to reflect new unified endpoints in `docs/api-reference/index.md`.
- Modified NCAA route documentation to include new `raw` image type in `docs/api-reference/ncaa-route.md`.
- Updated XC API Proxy support notice in `docs/api-reference/xc-proxy.md`.
- Enhanced customization documentation with details on how feeder leagues work in `docs/customization.md`.

### Deprecated

- Deprecated legacy league-specific endpoints in `docs/api-reference/index.md` and provided replacements.

## [v0.6.0] - 2025-11-26

### Changed
- Version release

## [v0.5.2] - 2025-11-08

### Added

- Introduced `league-cover.md`, `league-logo.md`, `league-thumb.md` in `docs/api-reference/`.
- Added `matchup-cover.md`, `matchup-logo.md`, `matchup-thumb.md` in `docs/api-reference/`.
- Added `ncaa-route.md` and `raw-data.md` in `docs/api-reference/`.
- Added `server-info.md` and `team-logo.md` in `docs/api-reference/`.
- Added `xc-proxy.md` in `docs/api-reference/`.
- Added `contributing.md` to provide guidelines for contributions.
- Added `customization.md` for user customization options.
- Added `docker.md` for Docker usage instructions.
- Added `supported-leagues.md` to list all supported leagues.
- Added `team-matching.md` to explain team matching logic.
- Added `technical-details.md` for technical insights into the API.

## [v0.5.1] - 2025-11-05

### Added

- Added logging configuration options in `README.md` for `LOG_TO_FILE` and `MAX_LOG_FILES`.
- Added logging for team logo and league logo retrieval in `express.js`.

### Changed

- Updated `.gitignore` to include logs directory and log file patterns.
- Modified `express.js` to include `teamlogo` and `leaguelogo` in cache and rate limiting checks.
- Updated logging behavior in `helpers/logger.js` to support optional file logging.

### Fixed

- Corrected error handling in `express.js` to include stack traces in logger for uncaught exceptions and unhandled promise rejections.

## [v0.5.0] - 2025-11-04

### Added

- Added health check to Dockerfile to monitor application status.
- Introduced environment variables for configuration: `IMAGE_CACHE_HOURS`, `RATE_LIMIT_PER_MINUTE`, `FORCE_COLOR`, and `NODE_ENV`.
- Added support for automatic color extraction from team logos when ESPN doesn't provide them.
- Implemented fallback mechanism for Women's NCAA sports to use Men's teams when not found.
- Added detailed descriptions for environment variables in README.md.

### Changed

- Updated README.md to reflect support for 30+ leagues, including detailed NCAA sports.
- Modified caching behavior to cache both generated images and team data for 24 hours.
- Enhanced API documentation with detailed examples for NCAA shorthand routes.
- Changed default values for environment variables in README.md for clarity.

### Removed

- Removed the ESPN provider implementation from the project, streamlining the provider architecture.
- Deleted outdated references and examples related to the removed ESPN provider in the README.md.

### Fixed

- Fixed issues in the image generation logic to ensure consistent output across different styles.
- Resolved discrepancies in league code mappings for NCAA sports in the API documentation.

## [v0.4.0] - 2025-10-28

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Added support for Women's National Basketball Association (WNBA) in the API.
- Added NCAA Women's Basketball support in the API.
- Added new binary assets for NCAA Football, NCAA Men's Basketball, and NCAA Women's Basketball logos.
- Added support for additional logo styles in README.md, including gradient blends and minimalist badges.
- Introduced location abbreviation expansions in ESPNTeamResolver.js to enhance team matching capabilities.

### Changed

- Updated GitHub Actions workflow in `.github/workflows/build-docker.yml` to trigger on `test/.*` branches in addition to `dev`.
- Modified the README to correct the league identifier for NCAA Women's Basketball from `naacw` to `ncaaw`.
- Changed the import path for `fetchLeagueData` in `helpers/imageUtils.js` from `./ESPNTeamResolver` to `../providers/ESPN`.
- Renamed `helpers/ESPNTeamResolver.js` to `providers/ESPN.js` and updated all relevant import paths across the codebase.
- Increased the limit of teams fetched from the ESPN API in `providers/ESPN.js` from 500 to 1000.
- Updated the `resolveTeam` import path in multiple route files (`routes/cover.js`, `routes/logo.js`, `routes/raw.js`, `routes/thumb.js`) to reflect the new location in `providers/ESPN.js`.
- Adjusted logo generation options in `routes/logo.js` to include `trim` parameter from the request query.
- Updated README.md to reflect new multi-sport support including additional leagues.
- Modified the API documentation to clarify the `logo` parameter behavior for thumbnails and logos.
- Enhanced the `fetchTeamData` function to utilize a dynamic API endpoint based on the league.
- Refactored the `getMatchScore` function to improve team name matching logic.
- Updated Dockerfile to include `ttf-dejavu` in the package installation.
- Refactored `getMatchScore` function in ESPNTeamResolver.js to utilize expanded location abbreviations for improved matching accuracy.
- Updated cache checking middleware in express.js to include cover paths along with thumb and logo paths.

### Fixed

- Fixed the league identifier for NCAA Women's Basketball in `leagues.js` from `naacw` to `ncaaw`.
- Fixed caching logic in `fetchTeamData` to ensure proper cache key usage.
- Resolved potential error in league data fetching by adding error handling for unsupported leagues.
- Corrected the handling of abbreviations and expansions in `expandLocationAbbreviations` function.
- Fixed incorrect path checks in express.js middleware to ensure cache checking works for cover images.

## [v0.3.2] - 2025-10-23

### Added

- Added new helper module `logoOutline.js` for adding white outlines to logos.
- Introduced `outline` option in `generateLogo` function to conditionally add white outlines to team logos.
- Added support for explicit `.png` naming in logo and thumbnail endpoints.

### Changed

- Updated README.md to include detailed API route information for thumbnail and cover generation, including dimensions and aspect ratios.
- Modified `generateLogo` function in `logoGenerator.js` to accept an `outline` parameter.
- Adjusted logo size calculation in `generateSideBySide` function to use 50% of the canvas for each logo instead of 40%.
- Enhanced logging in `express.js` to support multiple paths for routes, improving route registration.
- Changed thumbnail generation endpoint documentation to clarify that the `.png` extension is optional.

### Fixed

- Fixed spacing calculation between logos in `generateSideBySide` function to use 0.5% of the width instead of 10%.

## [v0.3.1] - 2025-10-23

### Changed

- Modified `helpers/thumbnailGenerator.js` to add a diagonal white line in the `generateDiagonalSplit` function for better visual separation of team logos.
- Updated logo drawing logic in `generateDiagonalSplit` function to conditionally add outlines based on color similarity.
- Enhanced logo rendering logic with drop shadow effects for better visibility when outlines are not needed.

## [v0.3.0] - 2025-10-23

### Fixed

- Corrected URL encoding for Los Angeles in examples section of `README.md` to ensure proper API usage.

## [v0.2.0] - 2025-10-23

### Added

- Introduced `.gitignore` file to exclude unnecessary files from version control.
- Created initial `README.md` with detailed API documentation and features.
- Added `helpers/logoGenerator.js` for logo generation functionality.
- Implemented `helpers/imageCache.js` for caching generated images.
- Developed `routes/logo.js` and `routes/thumb.js` for handling logo and thumbnail requests.
- Established Docker support with `Dockerfile` and `.dockerignore` for containerization.

## [v0.1.0] - 2025-10-23

### Added

- Initial commit with foundational files for the project including `express.js`, `index.js`, and workflow for building Docker images.
- Added .dockerignore file to exclude unnecessary files from Docker context.
- Introduced GitHub Actions workflow for building and pushing Docker images.
- Created Dockerfile for containerizing the application.
- Implemented express.js for handling HTTP requests.
- Added ESPNTeamResolver helper for resolving ESPN team data.
- Developed imageCache helper for caching images.
- Created thumbnailGenerator helper for generating thumbnails.
- Added route for thumbnail generation in routes/thumb.js.
- Included package.json for managing project dependencies.
- Added yarn.lock for locking dependency versions.

### Changed

- Configured GitHub Actions to trigger on tag pushes and manual dispatch.
- Updated Docker image build process to include dynamic tagging based on GitHub release version.
- Modified the build process to log into the container repository before pushing the image.
