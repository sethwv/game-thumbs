// ------------------------------------------------------------------------------
// requestConfig.js
// Shared request configuration constants
// ------------------------------------------------------------------------------

const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '10000', 10);

module.exports = { REQUEST_TIMEOUT };
