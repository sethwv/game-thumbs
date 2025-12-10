// ------------------------------------------------------------------------------
// jsonMerger.js
// Utility for merging JSON configuration files from base file + directory
// Enables additive configuration where additional files enhance rather than replace
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Path to directory
 */
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Load and merge JSON files from a base file plus all files in a directory
 * Loads base file first, then merges all .json files from the directory
 * For teams: merges league-by-league, team-by-team
 * For leagues: merges league-by-league
 * 
 * @param {string} baseFileName - Name of base file (e.g., 'teams.json')
 * @param {string} directoryName - Name of directory with additional files (e.g., 'json/teams')
 * @param {string} mergeType - Type of merge: 'teams' or 'leagues'
 * @returns {object} Merged JSON object
 */
function loadAndMergeJSON(baseFileName, directoryName, mergeType = 'teams') {
    const basePath = path.join(__dirname, '..');
    const baseFilePath = path.join(basePath, baseFileName);
    const directoryPath = path.join(basePath, directoryName);
    
    // Ensure the directory exists (for local development)
    ensureDirectoryExists(directoryPath);
    
    let mergedData = {};
    
    // Load base file (required)
    try {
        const rawData = fs.readFileSync(baseFilePath, 'utf8');
        mergedData = JSON.parse(rawData);
        logger.info(`Loaded base ${baseFileName}`);
    } catch (error) {
        logger.warn(`Failed to load base file ${baseFileName}: ${error.message}`);
        return {};
    }
    
    // BACKWARD COMPATIBILITY: Check for old-style single external file mounted over base
    // If base file differs significantly from what we expect, it means user mounted their own file
    // In this case, we'll treat it as an external override and merge it on top of internal
    const internalFileName = baseFileName.replace('.json', '-internal.json');
    const internalFilePath = path.join(basePath, internalFileName);
    
    if (fs.existsSync(internalFilePath)) {
        try {
            const internalRawData = fs.readFileSync(internalFilePath, 'utf8');
            const internalData = JSON.parse(internalRawData);
            
            // If base file content differs from internal, merge internal as base and current base as override
            if (JSON.stringify(mergedData) !== JSON.stringify(internalData)) {
                logger.info(`Detected external ${baseFileName} mount (backward compatibility mode)`);
                const externalData = mergedData;
                mergedData = internalData;
                
                if (mergeType === 'teams') {
                    mergedData = mergeTeamsData(mergedData, externalData);
                } else if (mergeType === 'leagues') {
                    mergedData = mergeLeaguesData(mergedData, externalData);
                } else {
                    mergedData = { ...mergedData, ...externalData };
                }
            }
        } catch (error) {
            // Ignore if internal file doesn't exist or can't be read
        }
    }
    
    // Load all JSON files from directory (optional)
    try {
        if (fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory()) {
            const files = fs.readdirSync(directoryPath)
                .filter(file => file.endsWith('.json'))
                .sort(); // Sort for consistent loading order
            
            if (files.length > 0) {
                logger.info(`Loading ${files.length} custom file(s) from ${directoryName}/`);
                
                for (const file of files) {
                    try {
                        const filePath = path.join(directoryPath, file);
                        const rawData = fs.readFileSync(filePath, 'utf8');
                        const fileData = JSON.parse(rawData);
                        
                        // Count what we're merging
                        const itemCount = Object.keys(fileData).length;
                        
                        // Merge this file's data
                        if (mergeType === 'teams') {
                            mergedData = mergeTeamsData(mergedData, fileData);
                        } else if (mergeType === 'leagues') {
                            mergedData = mergeLeaguesData(mergedData, fileData);
                        } else {
                            mergedData = { ...mergedData, ...fileData };
                        }
                        
                        logger.info(`  ✓ Merged ${file}`);
                    } catch (error) {
                        logger.warn(`  ✗ Failed to load ${file}: ${error.message}`);
                    }
                }
            } else {
                logger.info(`No custom files found in ${directoryName}/ (directory is empty)`);
            }
        }
    } catch (error) {
        logger.warn(`Failed to read directory ${directoryName}: ${error.message}`);
        // Continue with just base data
    }
    
    return mergedData;
}

/**
 * Merge teams data (league-by-league, team-by-team)
 * External team data enhances or overrides internal team data
 * 
 * @param {object} internal - Internal teams data
 * @param {object} external - External teams data
 * @returns {object} Merged teams data
 */
function mergeTeamsData(internal, external) {
    const merged = { ...internal };
    
    // Process each league in external data
    for (const leagueKey in external) {
        if (!merged[leagueKey]) {
            // New league from external file
            merged[leagueKey] = external[leagueKey];
        } else {
            // Merge teams within existing league
            merged[leagueKey] = { ...merged[leagueKey] };
            
            for (const teamKey in external[leagueKey]) {
                const externalTeam = external[leagueKey][teamKey];
                const internalTeam = merged[leagueKey][teamKey];
                
                if (!internalTeam) {
                    // New team from external file
                    merged[leagueKey][teamKey] = externalTeam;
                } else {
                    // Merge team data
                    merged[leagueKey][teamKey] = mergeTeamEntry(internalTeam, externalTeam);
                }
            }
        }
    }
    
    return merged;
}

/**
 * Merge a single team entry
 * Combines aliases (removing duplicates) and merges overrides
 * 
 * @param {object} internal - Internal team entry
 * @param {object} external - External team entry
 * @returns {object} Merged team entry
 */
function mergeTeamEntry(internal, external) {
    const merged = { ...internal };
    
    // Merge aliases (combine and deduplicate)
    if (external.aliases) {
        const allAliases = [
            ...(internal.aliases || []),
            ...external.aliases
        ];
        
        // Deduplicate aliases (case-insensitive comparison)
        const uniqueAliases = [];
        const seenLowercase = new Set();
        
        for (const alias of allAliases) {
            const lowerAlias = alias.toLowerCase();
            if (!seenLowercase.has(lowerAlias)) {
                seenLowercase.add(lowerAlias);
                uniqueAliases.push(alias);
            }
        }
        
        merged.aliases = uniqueAliases;
    }
    
    // Merge overrides (external takes precedence)
    if (external.override || internal.override) {
        merged.override = {
            ...(internal.override || {}),
            ...(external.override || {})
        };
    }
    
    return merged;
}

/**
 * Merge leagues data
 * External leagues enhance or override internal leagues
 * 
 * @param {object} internal - Internal leagues data
 * @param {object} external - External leagues data
 * @returns {object} Merged leagues data
 */
function mergeLeaguesData(internal, external) {
    const merged = { ...internal };
    
    for (const leagueKey in external) {
        const externalLeague = external[leagueKey];
        const internalLeague = merged[leagueKey];
        
        if (!internalLeague) {
            // New league from external file
            merged[leagueKey] = externalLeague;
        } else {
            // Merge league data
            merged[leagueKey] = {
                ...internalLeague,
                ...externalLeague
            };
            
            // Merge aliases if both exist
            if (internalLeague.aliases && externalLeague.aliases) {
                const allAliases = [
                    ...internalLeague.aliases,
                    ...externalLeague.aliases
                ];
                
                // Deduplicate (case-insensitive)
                const uniqueAliases = [];
                const seenLowercase = new Set();
                
                for (const alias of allAliases) {
                    const lowerAlias = alias.toLowerCase();
                    if (!seenLowercase.has(lowerAlias)) {
                        seenLowercase.add(lowerAlias);
                        uniqueAliases.push(alias);
                    }
                }
                
                merged[leagueKey].aliases = uniqueAliases;
            }
            
            // Merge providers if both exist
            if (internalLeague.providers && externalLeague.providers) {
                merged[leagueKey].providers = [
                    ...internalLeague.providers,
                    ...externalLeague.providers
                ];
            }
        }
    }
    
    return merged;
}

module.exports = {
    loadAndMergeJSON,
    mergeTeamsData,
    mergeLeaguesData
};

// ------------------------------------------------------------------------------
