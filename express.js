// ------------------------------------------------------------------------------
// express.js
// This file sets up and starts the Express server
// ------------------------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./helpers/logger');

const app = express();
let server = null; // Store server instance for graceful shutdown

module.exports = { init };

// ------------------------------------------------------------------------------

function init(port) {
    logger.startup('Game Thumbs API - Starting Server');

    // Trust proxy - required when running behind reverse proxy (nginx, load balancer, etc.)
    // Set to number of proxy hops to trust (e.g., 2 for Cloudflare + Nginx)
    // Set to 0 for local development (no proxies)
    const trustProxyHops = parseInt(process.env.TRUST_PROXY || '2', 10);
    app.set('trust proxy', trustProxyHops);
    logger.info(`Trust proxy set to: ${trustProxyHops} hop(s)`);

    const corsOptions = {
        origin: process.env.CORS_ORIGIN || '*',
        optionsSuccessStatus: 200,
        credentials: false,
        methods: ['GET', 'HEAD', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['Content-Type', 'Content-Length'],
        maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
    };

    app.use(cors(corsOptions));
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request-level timeout to prevent hanging requests
    const OVERALL_REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10) * 2; // 2x the external request timeout
    app.use((req, res, next) => {
        // Set a timeout for the entire request
        req.setTimeout(OVERALL_REQUEST_TIMEOUT, () => {
            logger.error('Request timeout exceeded', {
                URL: req.url,
                IP: req.ip,
                Timeout: `${OVERALL_REQUEST_TIMEOUT}ms`
            });
            if (!res.headersSent) {
                res.status(408).json({ error: 'Request timeout' });
            }
        });
        
        // Also set response timeout
        res.setTimeout(OVERALL_REQUEST_TIMEOUT, () => {
            logger.error('Response timeout exceeded', {
                URL: req.url,
                IP: req.ip,
                Timeout: `${OVERALL_REQUEST_TIMEOUT}ms`
            });
            if (!res.headersSent) {
                res.status(408).json({ error: 'Response timeout' });
            }
        });
        
        next();
    });

    // Get real IP from proxy headers and log requests
    app.use((req, res, next) => {
        // Get real IP from proxy headers (nginx X-Real-IP)
        const realIp = req.headers['x-real-ip'] || req.ip;
        req.ip = realIp;
        
        // Log the request (will be updated if cached)
        req._startTime = Date.now();
        
        next();
    });

    // Check cache first to determine if we need strict rate limiting
    const { checkCacheMiddleware } = require('./helpers/imageCache');
    app.use((req, res, next) => {
        if (['thumb', 'logo', 'cover'].some(path => req.path.includes(path))) {
            return checkCacheMiddleware(req, res, next);
        }
        next();
    });

    // Rate limiting configuration
    const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '30', 10);
    const RATE_LIMIT_ENABLED = RATE_LIMIT_PER_MINUTE > 0;
    
    logger.info(`Rate limiting: ${RATE_LIMIT_ENABLED ? `enabled (${RATE_LIMIT_PER_MINUTE} requests/min)` : 'disabled'}`);
    
    // Stricter limit for image generation endpoints
    const imageGenerationLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: RATE_LIMIT_PER_MINUTE,
        message: { error: 'Too many image generation requests. Please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
        skip: () => !RATE_LIMIT_ENABLED,
        handler: (req, res) => {
            logger.rate('Image generation blocked', {
                IP: req.ip,
                Method: req.method,
                URL: req.url
            });
            res.status(429).json({ error: 'Too many image generation requests. Please try again later.' });
        }
    });

    // General API rate limiter
    const generalLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: RATE_LIMIT_ENABLED ? RATE_LIMIT_PER_MINUTE * 3 : 0,
        message: { error: 'Too many requests. Please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
        skip: () => !RATE_LIMIT_ENABLED,
        handler: (req, res) => {
            logger.rate('API request blocked', {
                IP: req.ip,
                Method: req.method,
                URL: req.url
            });
            res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
    });

    // Apply rate limiting
    app.use((req, res, next) => {
        if (['thumb', 'logo', 'cover', 'teamlogo', 'leaguelogo', 'leaguethumb', 'leaguecover'].some(path => req.path.includes(path))) {
            return imageGenerationLimiter(req, res, next);
        }
        return generalLimiter(req, res, next);
    });

    // Ignore browser icon requests early (before logging)
    const ignoredPaths = ['/favicon.ico', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png'];
    app.use((req, res, next) => {
        if (ignoredPaths.includes(req.path)) {
            return res.status(204).end();
        }
        next();
    });

    // Log all requests that make it past rate limiting and cache
    app.use((req, res, next) => {
        // Only log if not already served from cache and not a health check
        if (!res.headersSent && req.path !== '/health') {
            logger.request(req, false);
        }
        next();
    });

    logger.info('Registering routes...');
    
    // Health check endpoint (before loading other routes)
    app.get('/health', (req, res) => {
        res.status(200).json({ 
            status: 'ok', 
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    });
    
    const fs = require('fs');
    const path = require('path');
    const routesPath = path.join(__dirname, 'routes');
    const APP_MODE = process.env.APP_MODE || 'standard';
    
    if (APP_MODE === 'xcproxy') {
        logger.info('XC Proxy mode - loading only xcproxy route');
        // Auto-enable XC_PROXY when in xcproxy mode
        process.env.XC_PROXY = 'true';
    }
    
    // Load route files and sort by priority (lower numbers first), then alphabetically
    const routeFiles = fs.readdirSync(routesPath)
        .filter(file => file.endsWith('.js'))
        .filter(file => {
            // In xcproxy mode, only load xcproxy.js
            if (APP_MODE === 'xcproxy' && file !== 'xcproxy.js') {
                return false;
            }
            return true;
        })
        .map(file => ({
            file,
            route: require(path.join(routesPath, file))
        }))
        .sort((a, b) => {
            // Sort by priority first (lower numbers first, undefined = Infinity)
            const priorityA = a.route.priority ?? Infinity;
            const priorityB = b.route.priority ?? Infinity;
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            // Then sort alphabetically by filename
            return a.file.localeCompare(b.file);
        });
    
    // Register routes in sorted order
    routeFiles.forEach(({ file, route }) => {
        if (route.paths) {
            for (const path of route.paths) {
                registerRoute(path, route.handler, route.method);
                logger.info(`Registered route: [${route.method.toUpperCase()}] ${path}${route.priority ? ` (priority: ${route.priority})` : ''}`);
            }
        }
        else if (route.path) {
            registerRoute(route.path, route.handler, route.method);
            logger.info(`Registered route: [${route.method.toUpperCase()}] ${route.path}${route.priority ? ` (priority: ${route.priority})` : ''}`);
        }
    });

    // Global error handler for uncaught route errors
    app.use((err, req, res, next) => {
        logger.error('Unhandled route error', {
            Error: err.message,
            URL: req.url,
            IP: req.ip
        }, err);
        
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Catch-all handler for non-registered routes (must be last)
    app.use((req, res) => {
        logger.warn('Route not found', {
            Method: req.method,
            URL: req.url,
            IP: req.ip
        });
        res.status(444).json({ error: 'Route not found' });
    });

    server = app.listen(port, () => {
        logger.startup(`Server Running on Port ${port}`);
    });
    
    // Set server timeout to prevent hanging connections
    const SERVER_TIMEOUT = parseInt(process.env.SERVER_TIMEOUT || '30000', 10);
    server.timeout = SERVER_TIMEOUT;
    server.keepAliveTimeout = SERVER_TIMEOUT;
    server.headersTimeout = SERVER_TIMEOUT + 5000;
    
    logger.info(`Server timeout set to: ${SERVER_TIMEOUT}ms`);
    
    // Monitor active connections and log periodically
    let activeConnections = 0;
    
    server.on('connection', (socket) => {
        activeConnections++;
        
        // Set socket timeout to prevent zombie connections
        socket.setTimeout(SERVER_TIMEOUT);
        
        socket.on('timeout', () => {
            // logger.warn('Socket timeout - destroying connection', {
            //     RemoteAddress: socket.remoteAddress,
            //     ActiveConnections: activeConnections
            // });
            socket.destroy();
        });
        
        socket.on('close', () => {
            activeConnections--;
        });
        
        socket.on('error', (err) => {
            // logger.error('Socket error', {
            //     Error: err.message,
            //     RemoteAddress: socket.remoteAddress
            // });
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
        const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        
        logger.info(`Memory usage: ${memUsedMB}MB / ${memTotalMB}MB heap (RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB)`);
        
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
}

// ------------------------------------------------------------------------------

function registerRoute(path, handler, method = 'get') {
    app[method](path, handler);
}

// ------------------------------------------------------------------------------

function setupGracefulShutdown() {
    let isShuttingDown = false;
    
    const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        
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
    
    logger.info('Graceful shutdown handlers registered');
}

// ------------------------------------------------------------------------------
