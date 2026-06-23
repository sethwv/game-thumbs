// ------------------------------------------------------------------------------
// app/middleware.js
// Applies the pre-route middleware stack to the Express app, in order. Ordering
// is load-bearing (cache check before rate limiting, etc.), so keep this sequence
// intact. Extracted verbatim from express.js init().
// ------------------------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('../helpers/logger');
const { checkCacheMiddleware } = require('../helpers/imageCache');

const IMAGE_PATHS = ['thumb', 'logo', 'cover', 'teamlogo', 'leaguelogo', 'leaguethumb', 'leaguecover'];

function applyMiddleware(app) {
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

    // Collapse consecutive slashes in paths (e.g. nhl///logo.png → nhl/logo.png)
    app.use((req, res, next) => {
        const normalized = req.url.replace(/\/{2,}/g, '/');
        if (normalized !== req.url) req.url = normalized;
        next();
    });

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
    app.use((req, res, next) => {
        if (['thumb', 'logo', 'cover'].some(path => req.path.includes(path))) {
            return checkCacheMiddleware(req, res, next);
        }
        next();
    });

    // Enable request-scoped log batching for image generation endpoints
    app.use((req, res, next) => {
        const isImageEndpoint = IMAGE_PATHS.some(path => req.path.includes(path));

        if (isImageEndpoint) {
            // Log incoming request immediately (not batched)
            logger.requestStart(req);

            const requestId = `${req.method}-${req.url}-${Date.now()}`;
            const context = logger.startRequestBatching(requestId);

            // Run the rest of the request in this context
            return logger.runWithRequestContext(context, () => next());
        } else {
            next();
        }
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
        if (IMAGE_PATHS.some(path => req.path.includes(path))) {
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
        if (req.path !== '/health') {
            res.on('finish', () => {
                // Skip if already logged (e.g., by cache middleware)
                if (!req._logged) {
                    const cached = !!req._servedFromRouteCache;
                    const isError = res.statusCode >= 400;
                    logger.request(req, cached, isError);
                }
                // Flush batched logs after request logging
                logger.endRequestBatching();
            });
        }
        next();
    });
}

module.exports = { applyMiddleware };
