# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Introduced `getTeamMatchScoreWithOverrides` function in helpers/teamMatchingUtils.js to consider overridden abbreviations in team matching.

### Changed

- Refactored `process_in_chunks` function in `.github/workflows/scripts/process-changelog-chunked.py` to improve version mapping parsing.
- Simplified logic for handling version sections by removing unnecessary checks and conditions.
- Updated handling of unreleased entries to streamline the process when no version metadata is present.
- Enhanced the method of adding entries to version entries by directly associating them with all relevant versions in the batch.
- Modified `format_changelog` function to accept an additional parameter `version_commit_hashes` for mapping version tags to sets of commit hashes.
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
- Consolidated color utility functions into `colorUtils.js` by adding functions for fetching images and converting RGB to hex.
- Removed the `colorExtractor.js` file as its functionality was integrated into `colorUtils.js`.
- Migrated HTTP requests from the native https module to Axios in helpers/colorExtractor.js for improved request handling.
- Updated image downloading logic in helpers/imageUtils.js to use Axios, enhancing timeout and error handling.
- Refactored ESPNProvider.js to utilize Axios for fetching team data from the ESPN API, improving request management.
- Modified TheSportsDBProvider.js to implement `getTeamMatchScoreWithOverrides` for better team matching accuracy.
- Adjusted team matching logic in ESPNProvider.js to extract team slug for override lookup, enhancing matching precision.
- Updated teams.json to include new team overrides for the NHL and EPL leagues.

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

### Fixed

- Corrected the logic for handling cases where the AI response did not split entries by version headers, ensuring all entries are accounted for.
- Corrected logic in `merge_changelog_entries` to ensure that merged entries are appended correctly with associated commit hashes.
- Fixed issues related to handling large requests by implementing chunked processing for changelog generation.
- Fixed timeout handling in fetchImage and downloadImage functions to throw appropriate errors when requests exceed the specified timeout.
- Corrected logic to check for new commits to process, ensuring accurate changelog updates.
- Fixed handling of dirty working directory states to correctly append `-dirty` to the current version when applicable.
- Resolved issues with detecting changes in the `CHANGELOG.md` file to ensure accurate updates.
- Resolved potential request timeout issues by implementing Axios's built-in timeout handling in various providers.

### Cleaned Up

- Added a step to clean up temporary files generated during the changelog processing to maintain a tidy workspace.

## [v0.6.2] - 2025-12-02

### Added

- Added support for new aspect ratio `1-1` (1080x1080) in `docs/api-reference/cover.md`.
- Introduced new style `99` for covers: 3D embossed with textured backgrounds, reflections, and metallic VS badge in `docs/api-reference/cover.md`.
- Implemented a new function `loadTrimmedLogo` in `helpers/imageUtils.js` to load and trim team logos in one step.
- Created a cache directory for trimmed logos in `helpers/imageUtils.js`.
- Added configuration for automatic conflict resolution using merge tool "union" and conflict style "diff3" in `.github/workflows/rebase-dev.yml`.
- Enabled `rerere` (reuse recorded resolution) for repeated conflicts in `.github/workflows/rebase-dev.yml`.
- Set merge strategies to enable rebase and auto-stash in `.github/workflows/rebase-dev.yml`.
- Introduced environment variables for conflict tracking: `HAD_CONFLICTS`, `RESOLVED_CONFLICTS`, and `FAILED_CONFLICTS` in `.github/workflows/rebase-dev.yml`.
- Created a summary section in the GitHub Actions workflow to report on the status of the rebase and conflicts resolved.
- Added new GitHub Actions workflow for automated testing in `.github/workflows/automated-testing.yml`.
- Introduced cover endpoint documentation in `docs/api-reference/cover.md`.
- Created internal JSON backups during Docker build in `Dockerfile`.
- Added permissions for GitHub Actions to write to branches in `rebase-dev.yml`.

### Changed

- Updated image cache clearing logic to report the number of cleared cached images in `helpers/imageCache.js`.
- Modified `drawLogoWithShadow` function to maintain aspect ratio and center logos in `helpers/imageUtils.js`.
- Enhanced `trimImage` function to support caching of trimmed images and handle cache misses in `helpers/imageUtils.js`.
- Updated GitHub Actions workflow in `.github/workflows/rebase-dev.yml` to include detailed logging for conflict resolution during rebase.
- Updated `.dockerignore` to include internal JSON backups and custom JSON configuration directories.
- Modified `.gitignore` to ignore output files in `test/output/*`.
- Enhanced Docker build workflow to ignore documentation changes in `build-docker.yml`.
- Improved rebase workflow to include detailed logging and conflict resolution in `rebase-dev.yml`.
- Changed test suite to include more detailed summaries and artifact uploads in `automated-testing.yml`.

### Removed

- Removed deprecated `helpers/leagueImageGenerator.js` file, which was no longer in use.

### Fixed

- Fixed issue where cached trimmed logos were not being cleared on startup in `helpers/imageUtils.js`.
- Resolved potential errors in logo loading and trimming process with improved error handling in `loadTrimmedLogo` function in `helpers/imageUtils.js`.
- Fixed the logic that checks for remaining unresolved conflicts after attempting to auto-resolve in `.github/workflows/rebase-dev.yml`.
- Resolved issues with test file discovery and execution in the automated testing workflow.

### v0.6.2

- Added Dependabot configuration in `.github/dependabot.yml` to automate dependency updates.
- Updated `express` dependency from version `5.2.0` to `5.2.1` in `package.json`.
- Modified API documentation to reflect new unified endpoints in `docs/api-reference/index.md`.
- Updated NCAA route documentation to include new `raw` image type in `docs/api-reference/ncaa-route.md`.
- Enhanced customization documentation to include `feederLeagues` key in `docs/customization.md`.
- Revised `docs/index.md` to showcase unified endpoints for API calls.
- Deprecated legacy league-specific endpoints in `docs/api-reference/index.md` and provided new unified endpoint alternatives.

### v0.6.1

- Introduced `DEPRECATIONS.md` to document deprecated features and endpoints.
- Added extensive documentation for new unified endpoints in `docs/api-reference/index.md`.
- Included examples for new NCAA shorthand routes in `docs/api-reference/ncaa-route.md`.
- Added support notice for XC API Proxy in `docs/api-reference/xc-proxy.md`.
- Updated various API documentation files to reflect changes in endpoint structures and deprecations.
- Enhanced `helpers/genericImageGenerator.js` with new functionalities for image generation.
- Revised `helpers/leagueImageGenerator.js` to improve image handling for leagues.
- Updated `providers/ProviderManager.js` to enhance provider management functionalities.
- Modified multiple route files to reflect changes in endpoint logic and structure.

## [v0.6.1] - 2025-12-02

### v0.6.2

- Added Dependabot configuration in `.github/dependabot.yml` to automate dependency updates.
- Updated `express` dependency from version `5.2.0` to `5.2.1` in `package.json`.
- Modified API documentation to reflect new unified endpoints in `docs/api-reference/index.md`.
- Updated NCAA route documentation to include new `raw` image type in `docs/api-reference/ncaa-route.md`.
- Enhanced customization documentation to include `feederLeagues` key in `docs/customization.md`.
- Revised `docs/index.md` to showcase unified endpoints for API calls.
- Deprecated legacy league-specific endpoints in `docs/api-reference/index.md` and provided new unified endpoint alternatives.

### v0.6.1

- Introduced `DEPRECATIONS.md` to document deprecated features and endpoints.
- Added extensive documentation for new unified endpoints in `docs/api-reference/index.md`.
- Included examples for new NCAA shorthand routes in `docs/api-reference/ncaa-route.md`.
- Added support notice for XC API Proxy in `docs/api-reference/xc-proxy.md`.
- Updated various API documentation files to reflect changes in endpoint structures and deprecations.
- Enhanced `helpers/genericImageGenerator.js` with new functionalities for image generation.
- Revised `helpers/leagueImageGenerator.js` to improve image handling for leagues.
- Updated `providers/ProviderManager.js` to enhance provider management functionalities.
- Modified multiple route files to reflect changes in endpoint logic and structure.

## [v0.6.0] - 2025-11-26

### v0.6.2

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.
- Updated `.dockerignore` to include `.git`, `.gitignore`, `*.md`, and `README.md` files for exclusion.
- Modified `Dockerfile` to install `git` along with canvas dependencies for the `/info` endpoint.
- Updated `README.md` to reflect new features and provide a quick start guide for the API.
- Revised `helpers/teamMatchingUtils.js` to improve team matching logic.
- Removed unused assets: `ncaa.png`, `ncaab.png`, and `ncaaf.png`.

### v0.5.2

- Introduced multiple soccer leagues including La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.

## [v0.5.2] - 2025-11-08

### v0.6.2

- Added support for La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.
- Updated `.dockerignore` to include `.git`, `.gitignore`, `*.md`, and `README.md` files for exclusion.
- Modified `Dockerfile` to install `git` along with canvas dependencies for the `/info` endpoint.
- Updated `README.md` to reflect new features and provide a quick start guide for the API.
- Revised `helpers/teamMatchingUtils.js` to improve team matching logic.
- Removed unused assets: `ncaa.png`, `ncaab.png`, and `ncaaf.png`.

### v0.5.2

- Introduced multiple soccer leagues including La Liga, Bundesliga, Serie A, Ligue 1, UEFA Europa League, and UEFA Europa Conference League in `leagues.json`.

## [v0.5.1] - 2025-11-05

### Added

- Added logging configuration options in README.md for file logging and maximum log files.
- Introduced new API endpoints for team logos and league logos, allowing retrieval of raw images.
- Added support for NCAA shorthand endpoints for team and league logos.

### Changed

- Updated `.gitignore` to include logs directory and log file patterns.
- Modified `express.js` to include `teamlogo` and `leaguelogo` in cache and rate limiting checks.
- Enhanced logging in `helpers/logger.js` to support optional file logging.

### Fixed

- Fixed unhandled route error logging in `express.js` to include error details correctly.
- Resolved potential socket timeout logging issues by commenting out unnecessary log statements.

## [v0.5.0] - 2025-11-04

### Added

- Added health check to Dockerfile with a command to verify application health.
- Introduced new environment variables for configuration: `IMAGE_CACHE_HOURS`, `RATE_LIMIT_PER_MINUTE`, `FORCE_COLOR`, and `NODE_ENV`.
- Added support for automatic color extraction from team logos when ESPN does not provide them.
- Added fallback mechanism for NCAA Women's sports to use Men's teams when not found.
- Added detailed descriptions for environment variables in README.md.

### Changed

- Updated README.md to reflect support for 30+ leagues, including detailed NCAA sports information.
- Modified caching behavior to include both images and team data for 24 hours.
- Changed the default behavior of the `FORCE_COLOR` environment variable to enable colored output in logs.
- Updated API documentation to clarify the use of league codes and provide examples for NCAA shorthand routes.
- Revised image generation parameters in API documentation to include style options and their descriptions.

### Removed

- Removed ESPN.js provider file which was no longer needed.
- Deleted deprecated methods and references in the providers related to ESPN.

## [v0.4.0] - 2025-10-28

### Added

- Added `trimImage` function in `helpers/imageUtils.js` to trim transparent edges from images.
- Introduced `trim` option in `generateLogo` function in `helpers/logoGenerator.js` to allow trimming of logos before caching.
- Updated README.md to include support for additional sports leagues: WNBA, UFL, EPL, and MLS.
- Added support for NCAA Women's Basketball in `leagues.js` with correct API league parameter.

### Changed

- Modified GitHub Actions workflow in `.github/workflows/build-docker.yml` to trigger on `test/.*` branches in addition to `dev`.
- Updated `fetchLeagueData` import path in `helpers/imageUtils.js` from `./ESPNTeamResolver` to `../providers/ESPN`.
- Changed the API URL in `providers/ESPN.js` to increase the limit of teams fetched from 500 to 1000.
- Updated logo generation styles in `helpers/logoGenerator.js` to include new styles and handle the `trim` option.
- Revised query parameters in routes to include `trim` option for logo and cover generation in `routes/logo.js` and `routes/cover.js`.

### Removed

- Removed outdated references to `helpers/ESPNTeamResolver.js` in various route files, replacing them with `providers/ESPN.js`.

### Fixed

- Corrected the league parameter for NCAA Women's Basketball in `leagues.js` from `naacw` to `ncaaw`.
- Fixed the README.md examples to correctly reflect the default behavior of the `logo` parameter in API requests.

### v0.6.2

- Added support for additional style options in thumbnail and cover generation in `README.md`.
- Introduced new cover generation endpoint in `routes/cover.js`.
- Added explicit `.png` naming to logo and thumb endpoints in `routes/logo.js` and `routes/thumb.js`.
- Updated Dockerfile to include `ttf-dejavu` package.
- Enhanced README.md to provide detailed API route overview and examples for thumbnail and cover generation.
- Modified `express.js` to include cover in cache checking logic.
- Changed logo generation logic to allow for optional `.png` extension in `routes/logo.js`.
- Updated thumbnail generation logic to adjust logo sizing and spacing in `helpers/logoGenerator.js`.
- Fixed caching logic in `helpers/thumbnailGenerator.js` to limit cache size and improve performance.

### v0.4.0

- Added common location abbreviations in `helpers/ESPNTeamResolver.js`.
- Introduced new styles for logo generation in `README.md`.
- Updated cache checking middleware in `express.js` to include cover paths.
- Adjusted logo generation parameters to include new styles in `helpers/logoGenerator.js`.

### v0.3.2

- Added new cover generation functionality in `helpers/thumbnailGenerator.js`.
- Introduced new styles for thumbnails and covers in `README.md`.
- Updated thumbnail generation logic for improved outline handling in `helpers/thumbnailGenerator.js`.
- Enhanced README.md to clarify output dimensions and aspect ratios for generated images.

### v0.3.1

- Refactored thumbnail generation logic to improve performance and maintainability in `helpers/thumbnailGenerator.js`.
- Updated README.md to reflect changes in API usage and endpoint details.

## [v0.3.2] - 2025-10-23

### v0.6.2

- Added support for additional style options in thumbnail and cover generation in `README.md`.
- Introduced new cover generation endpoint in `routes/cover.js`.
- Added explicit `.png` naming to logo and thumb endpoints in `routes/logo.js` and `routes/thumb.js`.
- Updated Dockerfile to include `ttf-dejavu` package.
- Enhanced README.md to provide detailed API route overview and examples for thumbnail and cover generation.
- Modified `express.js` to include cover in cache checking logic.
- Changed logo generation logic to allow for optional `.png` extension in `routes/logo.js`.
- Updated thumbnail generation logic to adjust logo sizing and spacing in `helpers/logoGenerator.js`.
- Fixed caching logic in `helpers/thumbnailGenerator.js` to limit cache size and improve performance.

### v0.4.0

- Added common location abbreviations in `helpers/ESPNTeamResolver.js`.
- Introduced new styles for logo generation in `README.md`.
- Updated cache checking middleware in `express.js` to include cover paths.
- Adjusted logo generation parameters to include new styles in `helpers/logoGenerator.js`.

### v0.3.2

- Added new cover generation functionality in `helpers/thumbnailGenerator.js`.
- Introduced new styles for thumbnails and covers in `README.md`.
- Updated thumbnail generation logic for improved outline handling in `helpers/thumbnailGenerator.js`.
- Enhanced README.md to clarify output dimensions and aspect ratios for generated images.

### v0.3.1

- Refactored thumbnail generation logic to improve performance and maintainability in `helpers/thumbnailGenerator.js`.
- Updated README.md to reflect changes in API usage and endpoint details.

## [v0.3.1] - 2025-10-23

### v0.6.2

- Added support for additional style options in thumbnail and cover generation in `README.md`.
- Introduced new cover generation endpoint in `routes/cover.js`.
- Added explicit `.png` naming to logo and thumb endpoints in `routes/logo.js` and `routes/thumb.js`.
- Updated Dockerfile to include `ttf-dejavu` package.
- Enhanced README.md to provide detailed API route overview and examples for thumbnail and cover generation.
- Modified `express.js` to include cover in cache checking logic.
- Changed logo generation logic to allow for optional `.png` extension in `routes/logo.js`.
- Updated thumbnail generation logic to adjust logo sizing and spacing in `helpers/logoGenerator.js`.
- Fixed caching logic in `helpers/thumbnailGenerator.js` to limit cache size and improve performance.

### v0.4.0

- Added common location abbreviations in `helpers/ESPNTeamResolver.js`.
- Introduced new styles for logo generation in `README.md`.
- Updated cache checking middleware in `express.js` to include cover paths.
- Adjusted logo generation parameters to include new styles in `helpers/logoGenerator.js`.

### v0.3.2

- Added new cover generation functionality in `helpers/thumbnailGenerator.js`.
- Introduced new styles for thumbnails and covers in `README.md`.
- Updated thumbnail generation logic for improved outline handling in `helpers/thumbnailGenerator.js`.
- Enhanced README.md to clarify output dimensions and aspect ratios for generated images.

### v0.3.1

- Refactored thumbnail generation logic to improve performance and maintainability in `helpers/thumbnailGenerator.js`.
- Updated README.md to reflect changes in API usage and endpoint details.

## [v0.3.0] - 2025-10-23

### v0.6.2

- Added white diagonal line drawing in `helpers/thumbnailGenerator.js` to enhance team logo visibility.
- Added `drawLogoWithOutline` function to handle logo outlines in `helpers/thumbnailGenerator.js`.
- Updated logo rendering logic in `helpers/thumbnailGenerator.js` to conditionally apply drop shadows or outlines based on logo visibility.
- Fixed URL encoding for "Los Angeles" in examples in `README.md`.
- Updated the MLB endpoint example in `README.md` to use "sox" instead of "red-sox".
- Corrected README to include a note about using publicly available ESPN APIs and logos.

### v0.3.0

- Added `.gitignore` file to exclude unnecessary files from version control.
- Introduced `README.md` file detailing the API features and usage instructions.
- Enhanced Docker instructions in `README.md` for pulling and running the image.

### v0.2.0

- Introduced initial Docker setup with `.dockerignore`, `Dockerfile`, and GitHub Actions workflow for building and pushing Docker images.
- Added `express.js` to handle API requests and responses.
- Implemented `helpers/ESPNTeamResolver.js` for resolving team data from ESPN APIs.
- Created `helpers/imageCache.js` for managing cached images.
- Added `helpers/thumbnailGenerator.js` for generating thumbnails dynamically.
- Established routes for thumbnail generation in `routes/thumb.js`.
- Updated `README.md` to include detailed API routes and examples for thumbnail generation.
- Enhanced the caching mechanism in `helpers/imageCache.js` to improve performance.

### v0.1.0

- Initial commit with foundational files including `.dockerignore`, `Dockerfile`, and `express.js`.
- Introduced `helpers/ESPNTeamResolver.js` for team data resolution.
- Added `helpers/imageCache.js` for caching functionality.
- Implemented `helpers/thumbnailGenerator.js` for dynamic thumbnail generation.
- Established basic routing in `routes/thumb.js` for handling requests.

## [v0.2.0] - 2025-10-23

### v0.6.2

- Added white diagonal line drawing in `helpers/thumbnailGenerator.js` to enhance team logo visibility.
- Added `drawLogoWithOutline` function to handle logo outlines in `helpers/thumbnailGenerator.js`.
- Updated logo rendering logic in `helpers/thumbnailGenerator.js` to conditionally apply drop shadows or outlines based on logo visibility.
- Fixed URL encoding for "Los Angeles" in examples in `README.md`.
- Updated the MLB endpoint example in `README.md` to use "sox" instead of "red-sox".
- Corrected README to include a note about using publicly available ESPN APIs and logos.

### v0.3.0

- Added `.gitignore` file to exclude unnecessary files from version control.
- Introduced `README.md` file detailing the API features and usage instructions.
- Enhanced Docker instructions in `README.md` for pulling and running the image.

### v0.2.0

- Introduced initial Docker setup with `.dockerignore`, `Dockerfile`, and GitHub Actions workflow for building and pushing Docker images.
- Added `express.js` to handle API requests and responses.
- Implemented `helpers/ESPNTeamResolver.js` for resolving team data from ESPN APIs.
- Created `helpers/imageCache.js` for managing cached images.
- Added `helpers/thumbnailGenerator.js` for generating thumbnails dynamically.
- Established routes for thumbnail generation in `routes/thumb.js`.
- Updated `README.md` to include detailed API routes and examples for thumbnail generation.
- Enhanced the caching mechanism in `helpers/imageCache.js` to improve performance.

### v0.1.0

- Initial commit with foundational files including `.dockerignore`, `Dockerfile`, and `express.js`.
- Introduced `helpers/ESPNTeamResolver.js` for team data resolution.
- Added `helpers/imageCache.js` for caching functionality.
- Implemented `helpers/thumbnailGenerator.js` for dynamic thumbnail generation.
- Established basic routing in `routes/thumb.js` for handling requests.

## [v0.1.0] - 2025-10-23

### v0.6.2

- Added white diagonal line drawing in `helpers/thumbnailGenerator.js` to enhance team logo visibility.
- Added `drawLogoWithOutline` function to handle logo outlines in `helpers/thumbnailGenerator.js`.
- Updated logo rendering logic in `helpers/thumbnailGenerator.js` to conditionally apply drop shadows or outlines based on logo visibility.
- Fixed URL encoding for "Los Angeles" in examples in `README.md`.
- Updated the MLB endpoint example in `README.md` to use "sox" instead of "red-sox".
- Corrected README to include a note about using publicly available ESPN APIs and logos.

### v0.3.0

- Added `.gitignore` file to exclude unnecessary files from version control.
- Introduced `README.md` file detailing the API features and usage instructions.
- Enhanced Docker instructions in `README.md` for pulling and running the image.

### v0.2.0

- Introduced initial Docker setup with `.dockerignore`, `Dockerfile`, and GitHub Actions workflow for building and pushing Docker images.
- Added `express.js` to handle API requests and responses.
- Implemented `helpers/ESPNTeamResolver.js` for resolving team data from ESPN APIs.
- Created `helpers/imageCache.js` for managing cached images.
- Added `helpers/thumbnailGenerator.js` for generating thumbnails dynamically.
- Established routes for thumbnail generation in `routes/thumb.js`.
- Updated `README.md` to include detailed API routes and examples for thumbnail generation.
- Enhanced the caching mechanism in `helpers/imageCache.js` to improve performance.

### v0.1.0

- Initial commit with foundational files including `.dockerignore`, `Dockerfile`, and `express.js`.
- Introduced `helpers/ESPNTeamResolver.js` for team data resolution.
- Added `helpers/imageCache.js` for caching functionality.
- Implemented `helpers/thumbnailGenerator.js` for dynamic thumbnail generation.
- Established basic routing in `routes/thumb.js` for handling requests.
