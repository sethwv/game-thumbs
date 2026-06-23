// ------------------------------------------------------------------------------
// express.js
// Thin orchestrator: builds the Express app and wires together the focused setup
// modules under app/ (middleware, route loader, server lifecycle).
// ------------------------------------------------------------------------------

const express = require('express');
const logger = require('./helpers/logger');
const { applyMiddleware } = require('./app/middleware');
const { registerRoutes } = require('./app/routeLoader');
const { startServer } = require('./app/lifecycle');

const app = express();

module.exports = { init };

// ------------------------------------------------------------------------------

function init(port) {
    logger.startup('Game Thumbs API - Starting Server');

    applyMiddleware(app);

    // Preload team overrides to show configuration at startup
    require('./helpers/teamUtils');

    registerRoutes(app);

    registerDefaultFonts();

    startServer(app, port);
}

// ------------------------------------------------------------------------------

// Register default fonts (only when event overlays are enabled)
function registerDefaultFonts() {
    const { isEventOverlaysEnabled } = require('./helpers/featureFlags');
    if (isEventOverlaysEnabled()) {
        const { loadFont } = require('./helpers/fontRegistry');
        loadFont('default_title.ttf', 'default_title');
        loadFont('default_subtitle.ttf', 'default_subtitle');
    }
}
