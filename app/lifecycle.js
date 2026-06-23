// ------------------------------------------------------------------------------
// app/lifecycle.js
// Server lifecycle: starts listening, kicks off provider cache warm-up, sets
// connection timeouts, runs connection/memory/GC monitoring, and wires graceful
// shutdown. Owns the mutable server + provider references it needs at shutdown.
// Extracted verbatim from express.js init() / setupGracefulShutdown().
// ------------------------------------------------------------------------------

const logger = require('../helpers/logger');

let server = null;             // server instance for graceful shutdown
let espnAthleteProvider = null; // ESPN athlete provider instance for cleanup
let hockeyTechProvider = null;  // HockeyTech provider instance for cleanup
let mlbStatsProvider = null;    // MLBStats provider instance for cleanup

function startServer(app, port) {
    server = app.listen(port, () => {
        // Initialize provider caches in parallel (non-blocking)
        Promise.all([
            (async () => {
                try {
                    espnAthleteProvider = require('../providers/ESPNAthleteProvider');
                    await espnAthleteProvider.initializeCache();
                } catch (error) {
                    logger.error('Failed to initialize ESPN Athlete cache', { error: error.message });
                }
            })(),
            (async () => {
                try {
                    hockeyTechProvider = require('../providers/HockeyTechProvider');
                    await hockeyTechProvider.initializeCache();
                } catch (error) {
                    logger.error('Failed to initialize HockeyTech config cache', { error: error.message });
                }
            })(),
            (async () => {
                try {
                    mlbStatsProvider = require('../providers/MLBStatsProvider');
                    await mlbStatsProvider.initializeCache();
                } catch (error) {
                    logger.error('Failed to initialize MLBStats cache', { error: error.message });
                }
            })(),
            (async () => {
                try {
                    const espnProvider = require('../providers/ESPNProvider');
                    await espnProvider.initializeSportLeagueCache();
                } catch (error) {
                    logger.error('Failed to initialize ESPN sport/league cache', { error: error.message });
                }
            })()
        ]).catch(err => {
            logger.error('Unexpected error during provider initialization', { error: err.message });
        });

        logger.startup(`Server Running on Port ${port}`);
    });

    // Set server timeout to prevent hanging connections
    const SERVER_TIMEOUT = parseInt(process.env.SERVER_TIMEOUT || '30000', 10);
    server.timeout = SERVER_TIMEOUT;
    server.keepAliveTimeout = SERVER_TIMEOUT;
    server.headersTimeout = SERVER_TIMEOUT + 5000;

    // Monitor active connections
    let activeConnections = 0;

    server.on('connection', (socket) => {
        activeConnections++;

        // Set socket timeout to prevent zombie connections
        socket.setTimeout(SERVER_TIMEOUT);

        socket.on('timeout', () => {
            socket.destroy();
        });

        socket.on('close', () => {
            activeConnections--;
        });

        socket.on('error', () => {
            // Silent error handling - these are expected for aborted connections
        });
    });

    // Log connection count every 5 minutes
    setInterval(() => {
        if (activeConnections > 0) {
            logger.info(`Active connections: ${activeConnections}`);
        }
    }, 5 * 60 * 1000);

    // Monitor memory usage every 10 minutes
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        // Warning if memory usage is high
        if (memUsedMB > 800) {
            logger.warn(`High memory usage detected: ${memUsedMB}MB`);
        }
    }, 10 * 60 * 1000);

    // Force garbage collection every hour if available
    if (global.gc) {
        setInterval(() => {
            logger.info('Running manual garbage collection');
            global.gc();
        }, 60 * 60 * 1000);
    }

    // Graceful shutdown handlers
    setupGracefulShutdown();

    return server;
}

function setupGracefulShutdown() {
    let isShuttingDown = false;

    const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        logger.info(`Received ${signal}, starting graceful shutdown...`);

        // Stop ESPN Athlete provider refresh timers
        if (espnAthleteProvider) {
            espnAthleteProvider.stopAllRefreshes();
        }

        // Stop HockeyTech provider refresh timers
        if (hockeyTechProvider) {
            hockeyTechProvider.stopAllRefreshes();
        }

        // Stop accepting new connections
        if (server) {
            server.close(() => {
                logger.info('Server closed, all connections ended');
                process.exit(0);
            });

            // Force close after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        } else {
            process.exit(0);
        }
    };

    // Handle various termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception', {
            Error: err.message
        }, err);
        // Don't exit immediately, let the process continue
        // but log it for debugging
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        // Create an error object if reason is not already an error
        const err = reason instanceof Error ? reason : new Error(String(reason));
        logger.error('Unhandled Promise Rejection', {
            Reason: String(reason),
            Promise: String(promise)
        }, err);
        // Don't exit immediately, let the process continue
        // but log it for debugging
    });
}

module.exports = { startServer };
