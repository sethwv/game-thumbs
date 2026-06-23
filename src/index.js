// ------------------------------------------------------------------------------
// index.js
// Application entry point: builds the Express app, wires the focused setup
// modules under app/ (middleware, route loader, server lifecycle), and starts
// the server. Requiring this module boots the server (used by the test suite);
// running it directly (node src/index.js) does the same.
// ------------------------------------------------------------------------------

const express = require('express');
const logger = require('./helpers/logger');
const { applyMiddleware } = require('./app/middleware');
const { registerRoutes } = require('./app/routeLoader');
const { startServer } = require('./app/lifecycle');

const app = express();

function init(port) {
    logger.startup('Game Thumbs API - Starting Server');

    applyMiddleware(app);

    // Preload team overrides to show configuration at startup
    require('./helpers/teamUtils');

    registerRoutes(app);

    registerDefaultFonts();

    startServer(app, port);
}

// Register default fonts (only when event overlays are enabled)
function registerDefaultFonts() {
    const { isEventOverlaysEnabled } = require('./helpers/featureFlags');
    if (isEventOverlaysEnabled()) {
        const { loadFont } = require('./helpers/fontRegistry');
        loadFont('default_title.ttf', 'default_title');
        loadFont('default_subtitle.ttf', 'default_subtitle');
    }
}

const PORT = process.env.PORT || 3000;
init(PORT);
