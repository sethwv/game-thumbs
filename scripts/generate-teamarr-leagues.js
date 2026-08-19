#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_SOURCE = 'https://raw.githubusercontent.com/Pharaoh-Labs/teamarr/dev/teamarr/database/schema.sql';
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'generated', 'leagues_teamarr.json');
const REQUIRED_COLUMNS = [
    'league_code',
    'provider',
    'provider_league_id',
    'provider_league_name',
    'display_name',
    'league_alias',
    'event_type'
];

function parseArguments(args) {
    const options = {
        source: process.env.TEAMARR_SCHEMA_URL || DEFAULT_SOURCE,
        output: process.env.TEAMARR_LEAGUES_OUTPUT || DEFAULT_OUTPUT
    };

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (argument === '--source' || argument === '--output') {
            const value = args[index + 1];
            if (!value) throw new Error(`${argument} requires a value`);
            options[argument.slice(2)] = value;
            index += 1;
        } else {
            throw new Error(`Unknown argument: ${argument}`);
        }
    }

    return options;
}

function stripSqlComment(value) {
    return value.replace(/--[^\n]*/g, '').trim();
}

function parseSqlValue(value) {
    const trimmed = value.trim();
    if (trimmed.toUpperCase() === 'NULL') return null;
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1).replace(/''/g, "'");
    }
    return trimmed;
}

function parseTuple(input, startIndex) {
    if (input[startIndex] !== '(') throw new Error('Expected SQL tuple');

    const values = [];
    let value = '';
    let inString = false;

    for (let index = startIndex + 1; index < input.length; index += 1) {
        const character = input[index];

        if (inString) {
            value += character;
            if (character === "'") {
                if (input[index + 1] === "'") {
                    value += input[index + 1];
                    index += 1;
                } else {
                    inString = false;
                }
            }
            continue;
        }

        if (character === "'") {
            inString = true;
            value += character;
        } else if (character === ',') {
            values.push(parseSqlValue(value));
            value = '';
        } else if (character === ')') {
            values.push(parseSqlValue(value));
            return { values, endIndex: index + 1 };
        } else {
            value += character;
        }
    }

    throw new Error('Unterminated SQL tuple');
}

function parseValues(valuesSql) {
    const rows = [];
    let index = 0;

    while (index < valuesSql.length) {
        while (index < valuesSql.length && /[\s,]/.test(valuesSql[index])) index += 1;
        if (valuesSql.startsWith('--', index)) {
            const newline = valuesSql.indexOf('\n', index);
            index = newline === -1 ? valuesSql.length : newline + 1;
            continue;
        }
        if (index >= valuesSql.length) break;
        if (valuesSql[index] !== '(') throw new Error(`Unexpected SQL value at offset ${index}`);

        const tuple = parseTuple(valuesSql, index);
        rows.push(tuple.values);
        index = tuple.endIndex;
    }

    return rows;
}

function extractLeagueRows(schema) {
    const match = schema.match(/INSERT\s+OR\s+REPLACE\s+INTO\s+leagues\s*\(([\s\S]*?)\)\s*VALUES\s*/i);
    if (!match) throw new Error('Could not find the Teamarr leagues seed statement');

    const columns = match[1].split(',').map(stripSqlComment).filter(Boolean);
    const missingColumns = REQUIRED_COLUMNS.filter(column => !columns.includes(column));
    if (missingColumns.length > 0) {
        throw new Error(`Teamarr leagues seed is missing required columns: ${missingColumns.join(', ')}`);
    }

    const valuesStart = match.index + match[0].length;
    let valuesEnd = valuesStart;
    let inString = false;
    let inComment = false;

    for (; valuesEnd < schema.length; valuesEnd += 1) {
        const character = schema[valuesEnd];
        if (inComment) {
            if (character === '\n') inComment = false;
        } else if (!inString && character === '-' && schema[valuesEnd + 1] === '-') {
            inComment = true;
            valuesEnd += 1;
        } else if (inString && character === "'" && schema[valuesEnd + 1] === "'") {
            valuesEnd += 1;
        } else if (character === "'") {
            inString = !inString;
        } else if (!inString && character === ';') {
            break;
        }
    }

    if (valuesEnd === schema.length) throw new Error('Could not find the end of the Teamarr leagues seed statement');

    return parseValues(schema.slice(valuesStart, valuesEnd)).map((values, rowIndex) => {
        if (values.length !== columns.length) {
            throw new Error(`Teamarr league row ${rowIndex + 1} has ${values.length} values, expected ${columns.length}`);
        }
        return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    });
}

function buildLeagues(schema) {
    const rows = extractLeagueRows(schema);
    const tsdbRows = rows.filter(row => row.provider === 'tsdb');
    const compatibleRows = tsdbRows.filter(row => row.event_type === 'team_vs_team');

    const leagues = {};
    for (const row of compatibleRows.sort((left, right) => left.league_code.localeCompare(right.league_code))) {
        if (!row.league_code || !row.provider_league_id || !row.provider_league_name || !row.display_name) {
            throw new Error(`Teamarr TSDB league is missing required data: ${row.league_code || 'unknown'}`);
        }

        leagues[row.league_code] = {
            name: row.display_name,
            shortName: row.league_alias || row.league_code.toUpperCase(),
            providers: [
                {
                    theSportsDB: {
                        leagueId: row.provider_league_id,
                        leagueName: row.provider_league_name
                    }
                }
            ]
        };
    }

    if (Object.keys(leagues).length === 0) {
        throw new Error('Teamarr schema did not contain any compatible TSDB team leagues');
    }

    return {
        leagues,
        tsdbCount: tsdbRows.length,
        excludedCount: tsdbRows.length - compatibleRows.length
    };
}

async function downloadSchema(source) {
    const response = await fetch(source, { headers: { 'User-Agent': 'game-thumbs-teamarr-generator' } });
    if (!response.ok) throw new Error(`Failed to download Teamarr schema (${response.status} ${response.statusText})`);
    return response.text();
}

async function main() {
    const { source, output } = parseArguments(process.argv.slice(2));
    console.log(`Downloading Teamarr schema: ${source}`);
    const schema = await downloadSchema(source);
    const result = buildLeagues(schema);

    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result.leagues, null, 2)}\n`);
    console.log(`Generated ${Object.keys(result.leagues).length} Teamarr TSDB team leagues (${result.tsdbCount} TSDB rows, ${result.excludedCount} excluded) at ${output}`);
}

if (require.main === module) {
    main().catch(error => {
        console.error(`Failed to generate Teamarr leagues: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    buildLeagues,
    extractLeagueRows,
    parseArguments,
    parseValues
};
