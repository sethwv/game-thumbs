// ------------------------------------------------------------------------------
// featureFlags.js
// Centralized read of opt-in environment flags.
// ------------------------------------------------------------------------------

function isEnabled(name) {
    const value = process.env[name];
    if (!value) return false;
    return value.trim().toLowerCase() === 'true';
}

// Gates the league event overlay feature (title/subtitle/iconurl query params,
// custom font loading, and the alternate league image layout).
function isEventOverlaysEnabled() {
    return isEnabled('ALLOW_EVENT_OVERLAYS');
}

module.exports = {
    isEventOverlaysEnabled
};
