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
- Introduced `getTeamMatchScoreWithOverrides` function in helpers/teamMatchingUtils.js to consider overridden abbreviations in team matching.

### Changed

- Enhanced changelog generation workflow to extract already processed commit hashes from existing changelog.
- Implemented filtering of already-processed commits to avoid duplication in changelog entries.
- Modified processing logic to check for new commits and handle empty commit scenarios gracefully.
- Changed output branch for generated changelog from the current branch to the main branch.
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
- Enhanced output messages in `process_in_chunks` to include total batches processed and total commits analyzed.
- Adjusted logic for determining current version status based on git tags and branch state.
- Refined the process for checking changes in `CHANGELOG.md` before committing updates.
- Migrated HTTP requests from https to Axios in helpers/colorExtractor.js for improved request handling.
- Adjusted team matching logic in ESPNProvider.js to extract team slugs for override lookups.

### Removed

- Deleted obsolete backfill and update prompt files from the workflows.
- Removed the script for formatting changelog entries as it is no longer needed.
- Eliminated the compiled Python bytecode file for the chunked changelog processing script.
- Removed manual steps for configuring git user details in the changelog workflow.
- Removed the previous method of creating a Pull Request using the `peter-evans/create-pull-request` action.
- Deleted the old method of preparing prompts using `sed` commands from `.github/workflows/changelog.yml`.
- Removed hardcoded prompt content in favor of using external prompt template files.
- Deleted the `colorExtractor.js` helper file as part of the refactoring process.
- Deleted `helpers/colorExtractor.js` entirely, removing its functionality for extracting dominant colors from images.
- Removed native `https` request handling code in `helpers/colorExtractor.js`.
- Eliminated the old promise-based structure for HTTP requests in `helpers/imageUtils.js`.
- Removed unused `request` variable and cleanup logic in `ESPNProvider.js` and `TheSportsDBProvider.js`.
- Eliminated the explicit setting of Git user configuration in the changelog workflow.

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

- Added support for a new visual style (Style 99) for covers and thumbnails, featuring a 3D embossed design with textured backgrounds, reflections, and a metallic VS badge in `docs/api-reference/cover.md` and `docs/api-reference/thumb.md`.
- Introduced a new API endpoint for thumbnails with aspect ratio 1:1 in `docs/api-reference/thumb.md`.
- Implemented a cache directory for trimmed logos in `helpers/imageUtils.js`.
- Added a function `loadTrimmedLogo` to load and trim team logos in one step in `helpers/imageUtils.js`.
- Added environment variables for tracking conflicts in `.github/workflows/rebase-dev.yml`.
- Included a summary section in the GitHub Actions workflow to document the status of the rebase and any conflicts encountered.
- Added automated testing workflow in `.github/workflows/automated-testing.yml`.
- Created internal JSON backups for compatibility in `Dockerfile`.
- Added paths-ignore for documentation in `.github/workflows/build-docker.yml`.
- Added Dependabot configuration in `.github/dependabot.yml` to automate dependency updates.
- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.
- Added explicit `.png` naming to logo and thumbnail endpoints in `README.md`.
- Added logging for registered routes in `express.js` to support multiple paths for routes.

### Changed

- Updated the aspect ratio options for covers to include 1:1 in `docs/api-reference/cover.md`.
- Updated the aspect ratio options for thumbnails to include 1:1 in `docs/api-reference/thumb.md`.
- Enhanced the image cache cleanup logic to report the number of cleared cached images in `helpers/imageCache.js`.
- Modified the `drawLogoWithShadow` function to maintain aspect ratio when drawing logos in `helpers/imageUtils.js`.
- Improved the `trimImage` function to include caching logic based on the image buffer hash in `helpers/imageUtils.js`.
- Updated the GitHub Actions workflow to provide better conflict resolution messages and force push the rebased dev branch in `.github/workflows/rebase-dev.yml`.
- Configured Git settings for automatic conflict resolution in `.github/workflows/rebase-dev.yml`, including merge tool and rerere options.
- Updated `.dockerignore` to include internal JSON backups and custom JSON configuration directories.
- Modified `Dockerfile` to create directories for additional JSON configuration files.
- Enhanced `.gitignore` to ignore output files in `test/output/*`.
- Refined the structure of the dev branch update workflow to include a summary of the rebase process.
- Updated `express` version in `yarn.lock` to reflect the new version.
- Bumped `express` version from `5.1.0` to `5.2.0` in `package.json` in a previous commit.
- Updated Dockerfile to include git installation for `/info` endpoint functionality.
- Modified health check command in Dockerfile to ensure proper application health monitoring.
- Revised README.md to reflect new features and improved API documentation.
- Enhanced `helpers/teamMatchingUtils.js` to improve team matching functionality.
- Updated `providers/TheSportsDBProvider.js` to include additional data handling for new leagues.
- Updated Dockerfile to include `ttf-dejavu` in the installation packages.
- Modified README.md to enhance the API documentation with new style options for thumbnails and covers.
- Refactored `helpers/ESPNTeamResolver.js` to include location abbreviations for better team matching.
- Improved the `getMatchScore` function in `helpers/ESPNTeamResolver.js` to incorporate flexible matching using compact forms and expanded location abbreviations.
- Updated `express.js` to include cover image caching in the middleware check.
- Updated logo generation route to support both `/logo` and `/logo.png` in `routes/logo.js`.
- Updated thumbnail generation route to support both `/thumb` and `/thumb.png` in `routes/thumb.js`.
- Adjusted logo size calculation to use 50% of canvas size instead of 40% in `helpers/logoGenerator.js`.
- Reduced spacing between logos to 0.5% of width in `helpers/logoGenerator.js`.

### Removed

- Removed `helpers/leagueImageGenerator.js` due to refactoring and consolidation of image generation utilities.
- Removed unused assets from the project, including `assets/ncaa.png`, `assets/ncaab.png`, and `assets/ncaaf.png`.

### Fixed

- Fixed the logic for clearing the trimmed logo cache to ensure it only clears when caching is enabled in `helpers/imageUtils.js`.
- Resolved potential issues with file path handling in the image cache cleanup process in `helpers/imageCache.js`.
- Resolved issues with automatic conflict resolution logic in `.github/workflows/rebase-dev.yml` to ensure all conflicts are properly handled and reported.

## [v0.6.1] - 2025-12-02

### Added

- Created `docs/DEPRECATIONS.md` to document deprecated features and endpoints.
- Added unified endpoints for API in `docs/api-reference/index.md` to simplify usage.
- Introduced new `feederLeagues` configuration option in `docs/customization.md` for league hierarchy management.

### Changed

- Updated API reference in `docs/api-reference/ncaa-route.md` to include `raw` type for image requests.
- Modified `docs/api-reference/index.md` to reflect new unified endpoints and mark deprecated ones.
- Enhanced `docs/customization.md` with examples of league hierarchy and feeder leagues functionality.
- Updated `docs/api-reference/xc-proxy.md` to include a support notice for the XC API Proxy feature.
- Revised `docs/index.md` to include new unified endpoints and NCAA shorthand routes.

## [v0.6.0] - 2025-11-26

### Added

- Introduced new API reference documentation in `docs/api-reference/` for various endpoints including league and matchup logos.
- Added comprehensive contributing guidelines in `docs/contributing.md`.
- Included customization options in `docs/customization.md`.

### Changed

- Updated `README.md` to provide a clearer overview of the API and its capabilities.
- Refined the structure of `leagues.json` to improve readability and organization of league data.
- Enhanced `express.js` to improve routing and middleware handling.

### Fixed

- Fixed issues in `providers/ProviderManager.js` to ensure proper provider initialization and error handling.
- Resolved bugs in `helpers/logoGenerator.js` related to logo generation logic.

## [v0.5.2] - 2025-11-08

### Changed
- Version release

## [v0.5.1] - 2025-11-05

### Added

- Added logging configuration options in README.md: `LOG_TO_FILE` and `MAX_LOG_FILES`.
- Introduced new API endpoints for team logos and league logos: `/:league/:team/teamlogo[.png]` and `/:league/leaguelogo[.png]`.
- Added file logging functionality in the logger utility.
- Included automatic log file rotation and cleanup in the logging system.

### Changed

- Updated `.gitignore` to include logs directory and log file patterns.
- Enhanced README.md to provide detailed descriptions of new API endpoints and parameters.
- Modified Express middleware to include new routes for team logo and league logo caching.
- Changed logger messages from `success` to `info` for route registration logs.
- Updated error handling in Express to include more detailed logging of errors.
- Adjusted socket timeout logging to be commented out for cleaner output.

### Fixed

- Fixed issues with logging unhandled promise rejections to include error stack traces.
- Resolved potential issues with socket error logging by ensuring proper error object creation.

## [v0.5.0] - 2025-11-04

### Added

- Added health check to Dockerfile with a command to verify application status.
- Introduced new environment variables: `IMAGE_CACHE_HOURS`, `RATE_LIMIT_PER_MINUTE`, `FORCE_COLOR`, and `NODE_ENV` in Dockerfile.
- Added color extraction feature to automatically extract dominant colors from team logos when ESPN doesn't provide them.
- Added fallback mechanism for Women's NCAA sports to automatically fall back to men's teams when a team is not found.
- Updated README to include detailed descriptions of new environment variables and their defaults.

### Changed

- Modified README to reflect support for 30+ leagues instead of just listing a few.
- Changed caching behavior description in README to clarify that both images and team data are cached for 24 hours.
- Updated API documentation in README to include new NCAA shorthand routes and their parameters.
- Revised the description of image generation styles in README to specify the number of available styles.
- Updated Dockerfile to improve the structure and clarity of environment variable settings.

### Removed

- Removed ESPN provider implementation from `providers/ESPN.js` as it was no longer needed.

## [v0.4.0] - 2025-10-28

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Added support for additional leagues: WNBA, UFL, EPL, MLS, UEFA Champions League, NCAA Women's Basketball.
- Introduced new assets for NCAA logos: `assets/ncaa.png`, `assets/ncaab.png`, `assets/ncaaf.png`.
- Implemented a new function `fetchLeagueData` in `helpers/ESPNTeamResolver.js` to retrieve league data from the ESPN API.
- Introduced new cover generation functionality in `routes/cover.js`.
- Added support for new cover styles in the API documentation within `README.md`.

### Changed

- Updated GitHub Actions workflow in `.github/workflows/build-docker.yml` to trigger on `test/.*` branches in addition to `dev`.
- Renamed `helpers/ESPNTeamResolver.js` to `providers/ESPN.js` and updated references accordingly in multiple files.
- Updated API URL in `providers/ESPN.js` to increase the limit of teams fetched from 500 to 1000.
- Changed `NCAA Women's Basketball` league key from `naacw` to `ncaaw` in `leagues.js`.
- Modified `resolveTeam` import paths in `routes/cover.js`, `routes/logo.js`, `routes/raw.js`, and `routes/thumb.js` to point to the new `providers/ESPN.js`.
- Updated README.md to reflect new multi-sport support and detailed league parameters.
- Modified the `fetchTeamData` function in `helpers/ESPNTeamResolver.js` to use a dynamic API endpoint based on the league.
- Changed logo display parameter in API examples to default to false for better clarity.
- Updated the logic in `getMatchScore` function to improve team matching accuracy.
- Enhanced `helpers/logoGenerator.js` to support improved white outlines for logos.
- Modified `helpers/thumbnailGenerator.js` to adjust aspect ratios for generated images.

### Fixed

- Corrected the league key for NCAA Women's Basketball in `leagues.js` to ensure proper functionality.
- Fixed potential caching issues in `fetchTeamData` and `fetchLeagueData` functions by ensuring teamCache is initialized correctly.
- Resolved parsing errors in the league API response handling within `fetchLeagueData`.
- Corrected output dimensions in the README.md for cover images to reflect the new 3:4 aspect ratio.

## [v0.3.2] - 2025-10-23

### Changed
- Version release

## [v0.3.1] - 2025-10-23

### Changed

- Addressed code review suggestions in `helpers/thumbnailGenerator.js`, improving code clarity and maintainability.
- Refactored constants for color similarity threshold and outline width percentage in `helpers/thumbnailGenerator.js`.

## [v0.3.0] - 2025-10-23

### Changed

- Enhanced thumbnail generation logic to add strokes to team logos that match closely in color in `helpers/thumbnailGenerator.js`.

## [v0.2.0] - 2025-10-23

### Added

- Added `.gitignore` file to exclude unnecessary files from version control.
- Introduced a comprehensive `README.md` file detailing API features, usage, and examples.
- Added support for dynamic thumbnail generation for multiple sports in `helpers/thumbnailGenerator.js`.
- Added .dockerignore file to exclude unnecessary files from Docker context.
- Introduced GitHub Actions workflow for building and pushing Docker images in .github/workflows/build-docker.yml.
- Added Dockerfile for configuring the Docker image.
- Implemented express.js for handling HTTP requests.
- Created helpers/ESPNTeamResolver.js for resolving ESPN team data.
- Developed helpers/thumbnailGenerator.js for generating thumbnails.
- Added index.js as the entry point for the application.
- Included routes/thumb.js for handling thumbnail-related routes.
- Updated package.json with initial dependencies.
- Generated yarn.lock for dependency management.

### Changed

- Updated example URLs in `README.md` to reflect correct URL encoding for team names.
- Configured GitHub Actions to trigger on push events to 'dev' branch and version tags.
- Modified build-docker.yml to include steps for logging into the container repository and pushing the Docker image.

## [v0.1.0] - 2025-10-23

### Added

- Added .dockerignore file to exclude unnecessary files from Docker context.
- Introduced GitHub Actions workflow for building and pushing Docker images in .github/workflows/build-docker.yml.
- Added Dockerfile for configuring the Docker image.
- Implemented express.js for handling HTTP requests.
- Created helpers/ESPNTeamResolver.js for resolving ESPN team data.
- Developed helpers/thumbnailGenerator.js for generating thumbnails.
- Added index.js as the entry point for the application.
- Included routes/thumb.js for handling thumbnail-related routes.
- Updated package.json with initial dependencies.
- Generated yarn.lock for dependency management.

### Changed

- Configured GitHub Actions to trigger on push events to version tags.
