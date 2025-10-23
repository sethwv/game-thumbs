// ------------------------------------------------------------------------------
// express.js
// This file sets up and starts the Express server
// ------------------------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

module.exports = { init };

// ------------------------------------------------------------------------------

function init(port) {
    console.log(`Starting server on port ${port}...`);

    const corsOptions = {
        origin: '*',
        optionsSuccessStatus: 200
    };

    app.use(cors(corsOptions));
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use((req, _, next) => {
        // Get real IP from proxy headers (nginx X-Real-IP)
        // Priority: X-Real-IP > X-Forwarded-For > req.ip
        const realIp = req.headers['x-real-ip'] || 
                       req.ip;
        req.ip = realIp;
        console.info(`${req.method} ${req.url}\n\t${realIp}\n\t${req.headers['user-agent']}`);
        next();
    });

    const { checkCacheMiddleware } = require('./helpers/imageCache');
    app.use((req, res, next) => {
        if (req.path.includes('thumb') || req.path.includes('logo')) {
            return checkCacheMiddleware(req, res, next);
        }
        next();
    });

    console.log('Registering routes...');
    const fs = require('fs');
    const path = require('path');
    const routesPath = path.join(__dirname, 'routes');
    fs.readdirSync(routesPath).forEach(file => {
        if (file.endsWith('.js')) {
            const route = require(path.join(routesPath, file));
            registerRoute(route.path, route.handler, route.method);
            console.log(`Registered route: [${route.method.toUpperCase()}] ${route.path}`);
        }
    });

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

// ------------------------------------------------------------------------------

function registerRoute(path, handler, method = 'get') {
    app[method](path, handler);
}

// ------------------------------------------------------------------------------
