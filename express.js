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
        origin: '*',
        optionsSuccessStatus: 200
    };

    app.use(cors(corsOptions));
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

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
        if (['thumb', 'logo', 'cover'].some(path => req.path.includes(path))) {
            return imageGenerationLimiter(req, res, next);
        }
        return generalLimiter(req, res, next);
    });

    // Log all requests that make it past rate limiting and cache
    app.use((req, res, next) => {
        // Only log if not already served from cache
        if (!res.headersSent) {
            logger.request(req, false);
        }
        next();
    });

    logger.info('Registering routes...');
    const fs = require('fs');
    const path = require('path');
    const routesPath = path.join(__dirname, 'routes');
    fs.readdirSync(routesPath).forEach(file => {
        if (file.endsWith('.js')) {
            const route = require(path.join(routesPath, file));
            if (route.paths) {
                for (const path of route.paths) {
                    registerRoute(path, route.handler, route.method);
                    logger.success(`Registered route: [${route.method.toUpperCase()}] ${path}`);
                }
            }
            else if (route.path) {
                registerRoute(route.path, route.handler, route.method);
                logger.success(`Registered route: [${route.method.toUpperCase()}] ${route.path}`);
            }
        }
    });

    app.listen(port, () => {
        logger.startup(`Server Running on Port ${port}`);
    });
}

// ------------------------------------------------------------------------------

function registerRoute(path, handler, method = 'get') {
    app[method](path, handler);
}

// ------------------------------------------------------------------------------
