// ------------------------------------------------------------------------------
// urlValidator.js
// Validates user-supplied URLs before they are fetched server-side. Rejects
// non-http(s) schemes, IP literals in private/loopback/link-local ranges, and
// hostnames that are obviously not on the public internet.
// ------------------------------------------------------------------------------

const net = require('net');

function isPrivateIPv4(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return false;
    if (parts[0] === 10) return true;                                       // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;  // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true;                  // 192.168.0.0/16
    if (parts[0] === 127) return true;                                      // loopback
    if (parts[0] === 169 && parts[1] === 254) return true;                  // link-local (incl. 169.254.169.254)
    if (parts[0] === 0) return true;                                        // 0.0.0.0/8
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT
    return false;
}

function isPrivateIPv6(ip) {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;      // unique local
    if (lower.startsWith('fe80')) return true;                              // link-local
    // IPv4-mapped IPv6 in dotted form (::ffff:127.0.0.1)
    const mappedDotted = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mappedDotted && isPrivateIPv4(mappedDotted[1])) return true;
    // IPv4-mapped IPv6 in hex form (::ffff:7f00:1) — node's URL normalizes to this
    const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
        const high = parseInt(mappedHex[1], 16);
        const low = parseInt(mappedHex[2], 16);
        const dotted = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
        if (isPrivateIPv4(dotted)) return true;
    }
    return false;
}

// Validates that a URL is safe to fetch from a public-facing server.
// allowedHosts: string[] of hostnames that may bypass the private-IP check.
// Returns the normalized URL string on success, throws on failure.
function validatePublicImageUrl(input, { allowedHosts = [] } = {}) {
    if (!input || typeof input !== 'string') {
        throw new Error('URL must be a non-empty string');
    }

    let parsed;
    try {
        parsed = new URL(input);
    } catch {
        throw new Error('URL is not a valid absolute URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`URL protocol '${parsed.protocol}' is not allowed (use http or https)`);
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
    if (!hostname) {
        throw new Error('URL is missing a hostname');
    }

    if (allowedHosts.includes(hostname.toLowerCase())) {
        return parsed.toString();
    }

    if (net.isIP(hostname)) {
        const blocked = (net.isIPv4(hostname) && isPrivateIPv4(hostname)) ||
                        (net.isIPv6(hostname) && isPrivateIPv6(hostname));
        if (blocked) {
            throw new Error('URL points to a private or reserved address');
        }
    } else {
        const lower = hostname.toLowerCase();
        if (lower === 'localhost' ||
            lower.endsWith('.localhost') ||
            lower.endsWith('.local') ||
            lower.endsWith('.internal')) {
            throw new Error('URL points to a private or reserved hostname');
        }
    }

    return parsed.toString();
}

module.exports = {
    validatePublicImageUrl
};
