// ------------------------------------------------------------------------------
// app/routeLoader.js
// Registers the routing layer on the Express app: the /health endpoint, the
// auto-loaded route files (sorted by priority then name), the global error
// handler, and the catch-all 404. Order matters: health first, routes next,
// error handler + catch-all last. Extracted verbatim from express.js init().
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');

function registerRoute(app, routePath, handler, method = 'get') {
    app[method](routePath, handler);
}

function registerRoutes(app) {
    // Health check endpoint (before loading other routes)
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    });

    const routesPath = path.join(__dirname, '..', 'routes');

    // Load route files and sort by priority (lower numbers first), then alphabetically
    const routeFiles = fs.readdirSync(routesPath)
        .filter(file => file.endsWith('.js'))
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
            for (const routePath of route.paths) {
                registerRoute(app, routePath, route.handler, route.method);
                logger.info(`Registered route: [${route.method.toUpperCase()}] ${routePath}${route.priority ? ` (priority: ${route.priority})` : ''}`);
            }
        }
        else if (route.path) {
            registerRoute(app, route.path, route.handler, route.method);
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
}

module.exports = { registerRoutes };
