// ------------------------------------------------------------------------------
// logger.js
// Centralized logging utility with colored output
// ------------------------------------------------------------------------------

let chalk;

// Dynamically import chalk (ESM module)
(async () => {
    chalk = (await import('chalk')).default;
})();

// Check if colors should be forced (for Docker/CI environments)
const forceColor = process.env.FORCE_COLOR === '1' || process.env.FORCE_COLOR === 'true';

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

// Format timestamp
function timestamp() {
    // Check if timestamps should be shown (default: true, set SHOW_TIMESTAMP=false to disable)
    const showTimestamp = process.env.SHOW_TIMESTAMP !== 'false';
    return showTimestamp ? colors.gray(`[${new Date().toLocaleTimeString()}]`) : '';
}

// Generic log function
function log(level, message, details = null) {
    const { color, prefix } = levels[level] || levels.info;
    const prefixStr = color(`[${prefix}]`);
    const ts = timestamp();
    
    console.log(`${ts}${ts ? ' ' : ''}${prefixStr} ${message}`);
    
    if (details) {
        if (typeof details === 'object' && !Array.isArray(details)) {
            Object.entries(details).forEach(([key, value]) => {
                console.log(`       ${colors.gray('│')} ${colors.dim(key)}: ${value}`);
            });
        } else {
            console.log(`       ${colors.gray('│')} ${details}`);
        }
    }
}

// Convenience methods
const logger = {
    info: (message, details) => log('info', message, details),
    success: (message, details) => log('success', message, details),
    warn: (message, details) => log('warn', message, details),
    error: (message, details) => log('error', message, details),
    cache: (message, details) => log('cache', message, details),
    rate: (message, details) => log('rate', message, details),
    api: (message, details) => log('api', message, details),
    
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
        const ts = timestamp();
        
        // Build the entire log message as a single string to prevent interleaving
        const logMessage = [
            `${ts}${ts ? ' ' : ''}${colors.gray('[API]')} ${method} ${url} ${status}`,
            `       ${colors.gray('│')} ${colors.dim('IP')}: ${ip}`,
            `       ${colors.gray('│')} ${colors.dim('User-Agent')}: ${userAgent}`
        ].join('\n');
        
        console.log(logMessage);
    },
    
    // Special startup message
    startup: (message) => {
        const line = '═'.repeat(60);
        console.log('\n' + colors.blue(colors.bold(line)));
        console.log(colors.blue(colors.bold(`  ${message}`)));
        console.log(colors.blue(colors.bold(line)) + '\n');
    }
};

module.exports = logger;
