// ------------------------------------------------------------------------------
// root.js
// Route for root path that optionally redirects to documentation site
// ------------------------------------------------------------------------------

const logger = require('../helpers/logger');

module.exports = {
    path: "/",
    method: "get",
    priority: 0, // Highest priority to intercept root path early
    handler: async (req, res) => {
        const redirectUrl = process.env.ROOT_REDIRECT_URL;
        
        if (redirectUrl) {
            logger.info(`Root redirect enabled, redirecting to: ${redirectUrl}`);
            return res.redirect(301, redirectUrl);
        }
        
        // If no redirect URL is set, let the catch-all handler deal with it
        // This will result in a 444 "Route not found" response
        res.status(444).json({ 
            error: 'Route not found',
            suggestion: 'Visit https://game-thumbs-docs.swvn.io/ for API documentation'
        });
    }
};
