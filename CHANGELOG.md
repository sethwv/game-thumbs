# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Processed commits: 1a9ff14,1f78b8b,3839766,46e4040,4c69b0d,5125224,608619c,6d39e16,7227424,78f9582,7f7694e,8607f3b,88ac2d9,89d3041,8f0282d,b1f61b4,bae7e2d,bec96e0,c3746d6,c98104d -->

### Added

- Added Axios as a dependency in package.json for handling HTTP requests.
- Introduced a mechanism to track which commits belong to which version for better metadata management in the changelog.
- Added comments to clarify the purpose of new logic in `process_in_chunks` function.
- Implemented a check to handle cases where no commits exist for a version tag, ensuring the changelog remains informative.
- Added AI-powered changelog generation workflow in `.github/workflows/changelog.yml`.
- Introduced prompts for backfill and update in `.github/workflows/prompts/backfill-prompt.txt` and `.github/workflows/prompts/update-prompt.txt`.
- Added script for processing changelog in `.github/workflows/scripts/process-changelog-chunked.py`.
- Included script for formatting changelog in `.github/workflows/scripts/format-changelog.py`.
- Introduced `getTeamMatchScoreWithOverrides` function in `helpers/teamMatchingUtils.js` to consider overridden abbreviations in team matching.
- Added functionality to embed processed commit hashes in the generated changelog for both unreleased and released entries.
- Introduced logic in `parse_and_merge_entries` to track commit hashes from batch metadata and individual version entries.
- Added scripts for generating prompts for backfill and update scenarios in the changelog process.
- Included a new Python script `process-changelog-chunked.py` for handling large changelog requests.
- Added logic to handle cases where no detailed changes are extracted but commits exist, allowing for metadata embedding in changelog.
- Implemented a mechanism to parse and merge entries by category, removing duplicates and similar entries.
- Added scripts for generating prompts for backfilling and updating changelogs in `.github/workflows/scripts/`.
- Implemented a new script `process-changelog-chunked.py` for handling large changelog requests.
- Included a new prompt file `backfill-prompt.txt` for generating changelog entries from historical commits.
- Added a new prompt file `update-prompt.txt` for generating updates to the changelog based on recent changes.
- Added support for tracking commit hashes associated with each version to enhance metadata in the changelog.
- Implemented a new script for processing changelogs in chunks to handle larger requests.
- Included a new Python script for formatting the generated changelog.
- Added support for team overrides in `ESPNProvider.js` and `TheSportsDBProvider.js` to enhance team matching accuracy.
- Added an override for the Utah Mammoth team in `teams.json`.
- Introduced `workflow_dispatch` trigger in `.github/workflows/changelog.yml` to allow manual triggering of the changelog workflow.
- Included a new script `format-changelog.py` for consistent formatting of the generated changelog.
- Introduced `helpers/colorUtils.js` with enhanced color manipulation functions, replacing the removed `colorExtractor.js`.

### Changed

- Updated GitHub Actions workflow to set the base branch dynamically using `${{ github.ref_name }}` instead of a hardcoded `main`.
- Refactored image generation helpers by moving `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from the `helpers` directory to a new `generators` directory.
- Consolidated color utility functions into `colorUtils.js` and removed the now redundant `colorExtractor.js`.
- Migrated HTTP requests from the native https module to Axios in helpers/colorExtractor.js for improved request handling.
- Refactored downloadImage function in helpers/imageUtils.js to utilize Axios for downloading images, replacing the previous promise-based implementation.
- Replaced the native https request handling with Axios in providers/ESPNProvider.js for fetching team data from ESPN APIs, simplifying the code structure.
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
- Refined the logic in `merge_changelog_entries` to ensure that commit hash metadata is embedded in both unreleased and released entries.
- Enhanced changelog generation workflow to extract already processed commit hashes from existing changelog.
- Implemented filtering of already-processed commits to avoid duplication in changelog entries.
- Updated workflow to always use chunked processing for changelog generation, ensuring consistency.
- Modified output messages to provide clearer feedback on the changelog generation process.
- Refactored the changelog generation workflow to include AI-powered analysis using GitHub Models.
- Adjusted the method for checking changes in `CHANGELOG.md` to improve accuracy.
- Moved `genericImageGenerator.js`, `logoGenerator.js`, and `thumbnailGenerator.js` from the `helpers` directory to a new `generators` directory.
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
- Adjusted handling of entries without version headers to ensure they are correctly assigned to the appropriate version.
- Updated the commit hash extraction logic in `.github/workflows/scripts/process-changelog-chunked.py` to support multiple hash formats.
- Refactored the process of creating a new branch and committing changes in the changelog workflow.
- Removed unused `colorExtractor.js` file which contained functions for extracting dominant colors from images.
- Refactored `colorUtils.js` to include functions for fetching images from URLs and converting RGB to hex.
- Migrated web requests from `https` to Axios in `helpers/colorExtractor.js` for improved request handling.
- Updated the matching logic in `TheSportsDBProvider.js` to use the new `getTeamMatchScoreWithOverrides` function.
- Refactored the handling of existing version sections in the changelog to validate and merge entries based on commit hashes.
- Adjusted the commit processing logic to support a release mode that processes all commits without skipping already-processed ones.
- Updated `README.md` to include a new section titled "TEST CHANGE".
- Refactored the handling of version entries to ensure that all commits are correctly assigned to their respective versions based on metadata.
- Converted `helpers/genericImageGenerator.js` to `generators/genericImageGenerator.js` and updated import paths for `imageUtils`, `colorUtils`, and `logger`.
- Converted `helpers/logoGenerator.js` to `generators/logoGenerator.js` and updated import paths for `imageUtils` and `logger`.
- Converted `helpers/thumbnailGenerator.js` to `generators/thumbnailGenerator.js` and updated import paths for `imageUtils` and `logger`.
- Updated `package.json` to reflect changes in dependencies.
- Refactored the structure of the project by moving helper functions to a new `generators` directory.

### Removed

- Deleted `helpers/colorExtractor.js` as its functionality has been integrated into `helpers/colorUtils.js`.
- Eliminated redundant error handling and timeout management code in downloadImage function in helpers/imageUtils.js, now managed by Axios.
- Deleted unused request cleanup logic in providers/ESPNProvider.js that was part of the previous https implementation.
- Reverted the changes made in "Changelog Update #44", resulting in the deletion of the entire CHANGELOG.md file.
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
- Eliminated the `process-changelog-chunked.pyc` file as part of cleanup.
- Removed the `format-changelog.py` script, simplifying the changelog formatting process.
- Removed manual git commands for branch creation and commit in the changelog workflow.
- Deleted unused request handling code in `ESPNProvider.js` related to the old request method.
- Eliminated the Python script responsible for formatting the changelog entries.

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
- Resolved issue where entries for versions without detailed changes were not properly noted in the changelog.
- Corrected the logic for stripping batch metadata before processing changelog entries in `.github/workflows/scripts/process-changelog-chunked.py`.
- Resolved issue where unreleased commits were not being tracked correctly by adding logic to store unreleased commit hashes in `process-changelog-chunked.py`.
- Fixed potential error in `format_changelog` where it would not embed commit hash metadata for versions that had no detailed changes extracted.
- Adjusted import paths across multiple files to ensure correct module resolution after restructuring.

### Cleaned Up

- Removed all entries from the CHANGELOG.md file, resulting in a complete reset of the changelog documentation.
- Added a step to clean up temporary files generated during the changelog processing to maintain a tidy workspace.
