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

// Returns the insecure overlay URL config:
//   null           → validate all (flag unset or false)
//   true           → skip validation entirely (ALLOW_INSECURE_OVERLAY_URLS=true)
//   string[]       → skip validation only for these hostnames (comma-separated list)
//
// Example values for ALLOW_INSECURE_OVERLAY_URLS:
//   true                          → allow all private/local URLs
//   192.168.1.5,printer.local     → allow only those two hosts
function getInsecureOverlayConfig() {
    const raw = process.env.ALLOW_INSECURE_OVERLAY_URLS;
    if (!raw) return null;
    const v = raw.trim().toLowerCase();
    if (v === 'false' || v === '0') return null;
    if (v === 'true' || v === '1') return true;
    return v.split(',').map(h => h.trim()).filter(Boolean);
}

module.exports = {
    isEventOverlaysEnabled,
    getInsecureOverlayConfig
};
