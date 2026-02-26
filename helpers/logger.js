// ------------------------------------------------------------------------------
// logger.js
// Centralized logging utility with colored output and optional file logging
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

let chalk;

// Dynamically import chalk (ESM module)
(async () => {
    chalk = (await import('chalk')).default;
})();

// Check if colors should be forced (for Docker/CI environments)
const forceColor = process.env.FORCE_COLOR === '1' || process.env.FORCE_COLOR === 'true';

// File logging configuration
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true' || process.env.LOG_TO_FILE === '1';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const LOG_ROTATION_SIZE = parseInt(process.env.LOG_ROTATION_SIZE || '102400', 10); // 100KB default
const MAX_LOG_FILES = parseInt(process.env.MAX_LOG_FILES || '10', 10); // Keep last 10 files

let currentLogFile = null;
let currentLogSize = 0;
let fileLoggingStatusShown = false; // Track if we've shown the file logging status

// Initialize log directory if file logging is enabled
if (LOG_TO_FILE) {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    
    // Initialize first log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    currentLogFile = path.join(LOG_DIR, `app-${timestamp}-001.log`);
    
    // Find next available log file number for today
    let fileNumber = 1;
    while (fs.existsSync(currentLogFile)) {
        fileNumber++;
        currentLogFile = path.join(LOG_DIR, `app-${timestamp}-${String(fileNumber).padStart(3, '0')}.log`);
    }
    
    // Get current size if file exists
    if (fs.existsSync(currentLogFile)) {
        const stats = fs.statSync(currentLogFile);
        currentLogSize = stats.size;
    }
}

// Synchronous fallback colors (ANSI codes)
const colors = {
    blue: (text) => {
        if (chalk) return chalk.blue(text);
        return forceColor || process.stdout.isTTY ? `\x1b[34m${text}\x1b[0m` : text;
    },
    green: (text) => {
        if (chalk) return chalk.green(text);
        return forceColor || process.stdout.isTTY ? `\x1b[32m${text}\x1b[0m` : text;
    },
    yellow: (text) => {
        if (chalk) return chalk.yellow(text);
        return forceColor || process.stdout.isTTY ? `\x1b[33m${text}\x1b[0m` : text;
    },
    red: (text) => {
        if (chalk) return chalk.red(text);
        return forceColor || process.stdout.isTTY ? `\x1b[31m${text}\x1b[0m` : text;
    },
    cyan: (text) => {
        if (chalk) return chalk.cyan(text);
        return forceColor || process.stdout.isTTY ? `\x1b[36m${text}\x1b[0m` : text;
    },
    magenta: (text) => {
        if (chalk) return chalk.magenta(text);
        return forceColor || process.stdout.isTTY ? `\x1b[35m${text}\x1b[0m` : text;
    },
    gray: (text) => {
        if (chalk) return chalk.gray(text);
        return forceColor || process.stdout.isTTY ? `\x1b[90m${text}\x1b[0m` : text;
    },
    dim: (text) => {
        if (chalk) return chalk.dim(text);
        return forceColor || process.stdout.isTTY ? `\x1b[2m${text}\x1b[0m` : text;
    },
    bold: (text) => {
        if (chalk) return chalk.bold(text);
        return forceColor || process.stdout.isTTY ? `\x1b[1m${text}\x1b[0m` : text;
    }
};

// Log levels with colors
const levels = {
    info: { color: colors.blue, prefix: 'INFO' },
    success: { color: colors.green, prefix: 'SUCCESS' },
    warn: { color: colors.yellow, prefix: 'WARN' },
    error: { color: colors.red, prefix: 'ERROR' },
    cache: { color: colors.cyan, prefix: 'CACHE' },
    rate: { color: colors.magenta, prefix: 'RATE LIMIT' },
    api: { color: colors.gray, prefix: 'API' }
};

// Format timestamp for console
function timestamp() {
    // Check if timestamps should be shown (default: true, set SHOW_TIMESTAMP=false to disable)
    const showTimestamp = process.env.SHOW_TIMESTAMP !== 'false';
    return showTimestamp ? colors.gray(`[${new Date().toLocaleTimeString()}]`) : '';
}

// Format timestamp for file (always included)
function fileTimestamp() {
    return new Date().toISOString();
}

// Strip ANSI color codes from text
function stripColors(text) {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

// Write to log file with rotation
function writeToFile(prefix, message, details = null, error = null) {
    if (!LOG_TO_FILE || !currentLogFile) return;
    
    try {
        // Build log line with timestamp and stripped colors
        const ts = fileTimestamp();
        const plainPrefix = stripColors(prefix);
        const plainMessage = stripColors(message);
        
        let logLine = `[${ts}] ${plainPrefix} ${plainMessage}\n`;
        
        // Add details if present
        if (details) {
            if (typeof details === 'object' && !Array.isArray(details)) {
                Object.entries(details).forEach(([key, value]) => {
                    logLine += `[${ts}]        │ ${key}: ${stripColors(String(value))}\n`;
                });
            } else {
                logLine += `[${ts}]        │ ${stripColors(String(details))}\n`;
            }
        }
        
        // Always include full stack trace in file logs for errors
        if (error && error.stack) {
            logLine += `[${ts}]        │ Stack Trace:\n`;
            const stackLines = error.stack.split('\n');
            stackLines.forEach(line => {
                logLine += `[${ts}]        │   ${line.trim()}\n`;
            });
        }
        
        const lineSize = Buffer.byteLength(logLine, 'utf8');
        
        // Check if we need to rotate
        if (currentLogSize + lineSize > LOG_ROTATION_SIZE) {
            rotateLogFile();
        }
        
        // Append to current log file
        fs.appendFileSync(currentLogFile, logLine, 'utf8');
        currentLogSize += lineSize;
    } catch (err) {
        console.error('Failed to write to log file:', err.message);
    }
}

// Rotate log file
function rotateLogFile() {
    try {
        // Get current date for filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        
        // Find next available file number
        let fileNumber = 1;
        let newLogFile;
        do {
            newLogFile = path.join(LOG_DIR, `app-${timestamp}-${String(fileNumber).padStart(3, '0')}.log`);
            fileNumber++;
        } while (fs.existsSync(newLogFile));
        
        // Update current log file
        currentLogFile = newLogFile;
        currentLogSize = 0;
        
        // Cleanup old log files (keep only MAX_LOG_FILES)
        cleanupOldLogs();
    } catch (error) {
        console.error('Failed to rotate log file:', error.message);
    }
}

// Clean up old log files
function cleanupOldLogs() {
    try {
        const files = fs.readdirSync(LOG_DIR)
            .filter(file => file.startsWith('app-') && file.endsWith('.log'))
            .map(file => ({
                name: file,
                path: path.join(LOG_DIR, file),
                time: fs.statSync(path.join(LOG_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort by time, newest first
        
        // Remove old files beyond MAX_LOG_FILES
        if (files.length > MAX_LOG_FILES) {
            files.slice(MAX_LOG_FILES).forEach(file => {
                fs.unlinkSync(file.path);
            });
        }
    } catch (error) {
        console.error('Failed to cleanup old logs:', error.message);
    }
}

// Generic log function
function log(level, message, details = null, error = null) {
    const { color, prefix } = levels[level] || levels.info;
    const prefixStr = color(`[${prefix}]`);
    const ts = timestamp();
    
    const logMessage = `${ts}${ts ? ' ' : ''}${prefixStr} ${message}`;
    console.log(logMessage);
    
    // Check if we should show details in console (based on environment and level)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const showDetailsInConsole = isDevelopment;
    
    // Write to file with separate formatting (always includes all details + stack)
    writeToFile(prefixStr, message, details, error);
    
    if (details) {
        if (typeof details === 'object' && !Array.isArray(details)) {
            Object.entries(details).forEach(([key, value]) => {
                const detailLine = `       ${colors.gray('│')} ${colors.dim(key)}: ${value}`;
                // Only show in console if development or not an error
                if (showDetailsInConsole) {
                    console.log(detailLine);
                }
            });
        } else {
            const detailLine = `       ${colors.gray('│')} ${details}`;
            if (showDetailsInConsole) {
                console.log(detailLine);
            }
        }
    }
    
    // Show stack trace in console only in development mode
    if (error && error.stack && isDevelopment) {
        const stackLines = error.stack.split('\n');
        stackLines.forEach(line => {
            console.log(`       ${colors.gray('│')} ${colors.dim(line.trim())}`);
        });
    }
}

// Convenience methods
const logger = {
    info: (message, details) => log('info', message, details),
    success: (message, details) => log('success', message, details),
    warn: (message, details) => log('warn', message, details),
    error: (message, details, error) => log('error', message, details, error),
    cache: (message, details) => log('cache', message, details),
    rate: (message, details) => log('rate', message, details),
    api: (message, details) => log('api', message, details),
    
    // Team resolution logger
    teamResolved: (providerName, leagueName, teamName, isFallback = false) => {
        const label = isFallback 
            ? `${colors.yellow('Team found in fallback')}` 
            : `${colors.green('Team found')}`;
        console.log(`       ${colors.gray('│')} ${label}: ${providerName} ${colors.dim('-')} ${leagueName} ${colors.dim('-')} ${teamName}`);
        
        // Write to file
        if (LOG_TO_FILE) {
            const fileLabel = isFallback ? 'Team found in fallback' : 'Team found';
            writeToFile('[INFO]', `${fileLabel}: ${providerName} - ${leagueName} - ${teamName}`);
        }
    },
    
    // Team not found logger (greyscale placeholder)
    teamNotFound: (teamIdentifier, leagueName) => {
        console.log(`       ${colors.gray('│')} ${colors.yellow('Team not found')}: ${leagueName} ${colors.dim('-')} ${teamIdentifier}`);

        // Write to file
        if (LOG_TO_FILE) {
            writeToFile('[WARN]', `Team not found: ${leagueName} - ${teamIdentifier}`);
        }
    },

    // Winner effect logger
    winnerApplied: (winnerIdentifier, loserName) => {
        console.log(`       ${colors.gray('│')} ${colors.cyan('Winner')}: ${winnerIdentifier} ${colors.dim('>')} ${loserName}`);

        // Write to file
        if (LOG_TO_FILE) {
            writeToFile('[INFO]', `Winner: ${winnerIdentifier} > ${loserName}`);
        }
    },

    // Unconfigured league fallback logger
    unconfiguredLeague: (providerName, leagueName, sport) => {
        console.log(`       ${colors.gray('│')} ${colors.dim('Unconfigured league fallback')}: ${providerName} ${colors.dim('-')} ${leagueName} ${colors.dim('(')}${sport}${colors.dim(')')}`);
        
        // Write to file
        if (LOG_TO_FILE) {
            writeToFile('[INFO]', `Unconfigured league fallback: ${providerName} - ${leagueName} (${sport})`);
        }
    },
    
    // Special request logger
    request: (req, cached = false) => {
        const method = colors.bold(req.method);
        const url = req.url;
        const ip = req.headers['x-real-ip'] || req.ip;
        const rawUserAgent = req.headers['user-agent'] || 'Unknown';
        
        // Condense user agent: extract browser/client and version, or truncate
        let userAgent = rawUserAgent;
        if (rawUserAgent.length > 80) {
            // Try to extract meaningful parts (browser/client name)
            const patterns = [
                /^(curl\/[\d.]+)/i,
                /^(PostmanRuntime\/[\d.]+)/i,
                /^(axios\/[\d.]+)/i,
                /(Chrome\/[\d.]+)/,
                /(Firefox\/[\d.]+)/,
                /(Safari\/[\d.]+)/,
                /(Edge\/[\d.]+)/,
                /(Opera\/[\d.]+)/,
                /(OPR\/[\d.]+)/,
            ];
            
            for (const pattern of patterns) {
                const match = rawUserAgent.match(pattern);
                if (match) {
                    userAgent = match[1];
                    break;
                }
            }
            
            // If no pattern matched, just truncate
            if (userAgent === rawUserAgent) {
                userAgent = rawUserAgent.substring(0, 77) + '...';
            }
        }
        
        const status = cached ? colors.cyan('[CACHED]') : colors.green('[OK]');
        const statusPlain = cached ? '[CACHED]' : '[OK]';
        const ts = timestamp();
        
        // Build the entire log message as a single string to prevent interleaving
        const logMessage = [
            `${ts}${ts ? ' ' : ''}${colors.gray('[API]')} ${method} ${url} ${status}`,
            `       ${colors.gray('│')} ${colors.dim('IP')}: ${ip}`,
            `       ${colors.gray('│')} ${colors.dim('User-Agent')}: ${userAgent}`
        ].join('\n');
        
        console.log(logMessage);
        
        // Write to file with timestamp and details
        writeToFile('[API]', `${stripColors(method)} ${url} ${statusPlain}`, {
            IP: ip,
            'User-Agent': userAgent
        });
    },
    
    // Special startup message
    startup: (message) => {
        const line = '═'.repeat(60);
        const startupMessage = '\n' + colors.blue(colors.bold(line)) + '\n' + 
                               colors.blue(colors.bold(`  ${message}`)) + '\n' + 
                               colors.blue(colors.bold(line)) + '\n';
        console.log(startupMessage);
        
        // Write to file (startup messages as INFO)
        writeToFile('[INFO]', `${'═'.repeat(60)}`);
        writeToFile('[INFO]', message);
        writeToFile('[INFO]', `${'═'.repeat(60)}`);
        
        // Log file logging status (console only, show only once)
        if (LOG_TO_FILE && !fileLoggingStatusShown) {
            const fileInfo = `File logging enabled: ${currentLogFile} (rotate at ${Math.round(LOG_ROTATION_SIZE / 1024)}KB)`;
            logger.info(fileInfo);
            fileLoggingStatusShown = true;
        }
    }
};

// Export logger and colors for use in other modules
module.exports = logger;
module.exports.colors = colors;
