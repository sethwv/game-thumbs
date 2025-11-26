// ------------------------------------------------------------------------------
// xcproxy.js
// Route to proxy XC API with M3U and JSON logos replaced from EPG/XML
// ------------------------------------------------------------------------------

const logger = require('../helpers/logger');

// Cache EPG logos to avoid re-parsing on every request
const epgCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Check if XC proxy is enabled via environment variable
const XC_PROXY_ENABLED = process.env.XC_PROXY === 'true' || process.env.NODE_ENV === 'development';

// Map to store upstream XC API URLs by identifier
const upstreamMap = new Map();

// Parse XC_PROXY_UPSTREAM environment variable
// Format: id1=http://server1:port1,id2=http://server2:port2
if (process.env.XC_PROXY_UPSTREAM) {
    const upstreams = process.env.XC_PROXY_UPSTREAM.split(',');
    upstreams.forEach(upstream => {
        const [id, url] = upstream.split('=');
        if (id && url) {
            upstreamMap.set(id.trim(), url.trim());
        }
    });
}

module.exports = {
    paths: XC_PROXY_ENABLED ? [
        "/xc/:upstream/:file",
        "/xc/:upstream",
    ] : [],
    method: "get",
    handler: async (req, res) => {
        // Double-check if enabled (safety check)
        if (!XC_PROXY_ENABLED) {
            return res.status(404).json({ error: 'XC proxy is not enabled' });
        }

        // Extract the upstream identifier from path parameter
        const upstreamId = req.params.upstream;
        const xcapi = upstreamMap.get(upstreamId);

        if (!xcapi) {
            return res.status(400).json({ 
                error: `Unknown upstream: ${upstreamId}`,
                usage: `Configure XC_PROXY_UPSTREAM environment variable with format: id=http://server:port`,
                available: Array.from(upstreamMap.keys())
            });
        }

        try {
            // Get the path after /xcproxy/
            let proxyPath = req.params.file || '';
            
            // If no path provided, check if the query string suggests an endpoint
            // Some players might send: /xcproxy/?type=m3u_plus&username=...&xcapi=...
            if (!proxyPath && req.query.type) {
                proxyPath = 'get.php';
            }
            
            // Build the full URL to proxy
            const queryString = new URLSearchParams(req.query);
            const queryStr = queryString.toString();
            
            const targetUrl = `${xcapi}${proxyPath ? '/' + proxyPath : ''}${queryStr ? '?' + queryStr : ''}`;
            
            // Obfuscate credentials in logs
            const logUrl = targetUrl
                .replace(/username=([^&]+)/i, 'username=***')
                .replace(/password=([^&]+)/i, 'password=***');
            
            logger.info('Proxying XC API request', {
                Path: proxyPath,
                TargetURL: logUrl
            });

            // Fetch from the XC API
            const response = await fetchWithTimeout(targetUrl);
            const contentType = response.headers.get('content-type') || '';
            
            // Check if this is an M3U playlist request
            const isM3U = contentType.includes('mpegurl') || 
                         contentType.includes('m3u') ||
                         contentType.includes('audio/x-mpegurl') ||
                         (proxyPath.includes('get.php') && queryStr.includes('type=m3u')) ||
                         queryStr.includes('output=m3u8');

            // Check if this is JSON that might contain channel info with logos
            const isJSON = contentType.includes('application/json') || contentType.includes('text/json');
            const isLiveStreamsAPI = proxyPath.includes('player_api.php') && queryStr.includes('get_live_streams');

            if (isM3U) {
                // This is an M3U playlist - we need to replace logos
                const m3uContent = await response.text();
                
                // Get EPG logos (cached if available)
                const epgLogos = await getEPGLogos(xcapi, queryString);
                
                // Replace logos in M3U
                const modifiedM3U = replaceM3ULogos(m3uContent, epgLogos);
                
                // Return modified playlist
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.setHeader('Content-Disposition', 'inline; filename="playlist.m3u"');
                res.send(modifiedM3U);
                
                logger.info('M3U proxy successful', {
                    LogosReplaced: countReplacements(m3uContent, modifiedM3U)
                });
            } else if (isJSON && isLiveStreamsAPI) {
                // This is a live streams JSON API response - replace logos in channel data
                const jsonContent = await response.text();
                
                try {
                    const data = JSON.parse(jsonContent);
                    
                    // Get EPG logos (cached if available)
                    const epgLogos = await getEPGLogos(xcapi, queryString);
                    
                    // Replace logos in JSON channel data
                    const modifiedData = replaceJSONLogos(data, epgLogos);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.json(modifiedData);
                    
                    logger.info('JSON API proxy successful with logo replacement');
                } catch (error) {
                    logger.error('Failed to parse/modify JSON', { Error: error.message });
                    // Return original if parsing fails
                    res.setHeader('Content-Type', contentType);
                    res.send(jsonContent);
                }
            } else {
                // Pass through other responses unchanged
                res.setHeader('Content-Type', contentType);
                
                // Copy other relevant headers
                ['content-length', 'content-encoding', 'cache-control', 'expires'].forEach(header => {
                    const value = response.headers.get(header);
                    if (value) res.setHeader(header, value);
                });
                
                const body = await response.arrayBuffer();
                res.send(Buffer.from(body));
            }

        } catch (error) {
            logger.error('XC API proxy error', {
                Error: error.message,
                XCAPI: xcapi,
                Path: req.path
            }, error);
            res.status(500).json({ error: `Failed to proxy XC API: ${error.message}` });
        }
    }
};

// ------------------------------------------------------------------------------

/**
 * Get EPG logos for the XC API (with caching)
 */
async function getEPGLogos(xcapi, queryParams) {
    const cacheKey = xcapi;
    const now = Date.now();
    
    // Check if we have cached EPG data
    const cached = epgCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
        logger.info('Using cached EPG logos', { CacheAge: `${Math.round((now - cached.timestamp) / 1000)}s` });
        return cached.logos;
    }
    
    try {
        // Build EPG/XMLTV URL for XC API
        // XC API format: http://domain:port/xmltv.php?username=xxx&password=xxx
        const username = queryParams.get('username');
        const password = queryParams.get('password');
        
        if (!username || !password) {
            logger.warn('No credentials found for EPG fetch, cannot replace logos');
            return { byId: new Map(), byNumber: new Map(), byName: new Map() };
        }
        
        const epgUrl = `${xcapi}/xmltv.php?username=${username}&password=${password}`;
        
        logger.info('Fetching EPG for logo extraction', { 
            URL: `${xcapi}/xmltv.php?username=***&password=***` 
        });
        
        const epgResponse = await fetchWithTimeout(epgUrl, 30000); // 30s timeout for EPG
        const epgContent = await epgResponse.text();
        
        // Parse EPG to extract logos
        const logos = parseEPGLogos(epgContent);
        
        // Cache the result
        epgCache.set(cacheKey, {
            logos,
            timestamp: now
        });
        
        logger.info('EPG logos cached', { 
            ByID: logos.byId.size,
            ByNumber: logos.byNumber.size,
            ByName: logos.byName.size
        });
        
        return logos;
        
    } catch (error) {
        logger.error('Failed to fetch EPG', { Error: error.message }, error);
        // Return empty maps on error, don't fail the whole request
        return { byId: new Map(), byNumber: new Map(), byName: new Map() };
    }
}

// ------------------------------------------------------------------------------

/**
 * Fetch URL with timeout
 */
async function fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'User-Agent': 'game-thumbs-m3u-proxy/1.0'
            }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

// ------------------------------------------------------------------------------

/**
 * Parse EPG XML to extract channel logos
 * Returns maps for ID, channel number, and channel name lookups
 */
function parseEPGLogos(epgContent) {
    const byId = new Map();
    const byNumber = new Map();
    const byName = new Map();
    
    // Match channel tags with id and optional icon/logo
    // EPG format: <channel id="..."><icon src="..."/></channel>
    const channelRegex = /<channel[^>]+id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/channel>/gi;
    
    let match;
    while ((match = channelRegex.exec(epgContent)) !== null) {
        const channelId = match[1];
        const channelContent = match[2];
        
        // Extract icon src from channel content
        const iconMatch = channelContent.match(/<icon[^>]+src=["']([^"']+)["']/i);
        if (!iconMatch) continue;
        
        const logo = iconMatch[1];
        
        // Store by ID
        byId.set(channelId, logo);
        
        // Extract and store by channel number (tvg-chno or similar)
        const chnoMatch = channelId.match(/^(\d+)$/);
        if (chnoMatch) {
            byNumber.set(chnoMatch[1], logo);
        }
        
        // Extract and store by display name
        const nameMatch = channelContent.match(/<display-name[^>]*>([^<]+)<\/display-name>/i);
        if (nameMatch) {
            const name = nameMatch[1].trim().toLowerCase();
            byName.set(name, logo);
        }
    }
    
    return { byId, byNumber, byName };
}

// ------------------------------------------------------------------------------

/**
 * Replace M3U logos with EPG logos with fallback matching:
 * 1. Try tvg-id
 * 2. Try tvg-chno (channel number)
 * 3. Try channel name
 */
function replaceM3ULogos(m3uContent, epgLogos) {
    const lines = m3uContent.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this is an EXTINF line (channel definition)
        if (line.startsWith('#EXTINF:')) {
            let epgLogo = null;
            
            // Try 1: Match by tvg-id
            const tvgIdMatch = line.match(/tvg-id=["']([^"']+)["']/i);
            if (tvgIdMatch) {
                const tvgId = tvgIdMatch[1];
                epgLogo = epgLogos.byId.get(tvgId);
            }
            
            // Try 2: Match by channel number (tvg-chno)
            if (!epgLogo) {
                const chnoMatch = line.match(/tvg-chno=["']([^"']+)["']/i);
                if (chnoMatch) {
                    const chno = chnoMatch[1];
                    epgLogo = epgLogos.byNumber.get(chno);
                }
            }
            
            // Try 3: Match by channel name (extract from end of EXTINF line)
            if (!epgLogo) {
                const nameMatch = line.match(/,([^,]+)$/);  // Get text after last comma
                if (nameMatch) {
                    const name = nameMatch[1].trim().toLowerCase();
                    epgLogo = epgLogos.byName.get(name);
                }
            }
            
            // If we found a logo, replace it
            if (epgLogo) {
                let modifiedLine = line;
                
                const tvgLogoMatch = line.match(/tvg-logo=["']([^"']+)["']/i);
                if (tvgLogoMatch) {
                    // Replace existing logo
                    modifiedLine = line.replace(
                        /tvg-logo=["'][^"']*["']/i,
                        `tvg-logo="${epgLogo}"`
                    );
                } else {
                    // Add logo after tvg-id or at the beginning of attributes
                    if (tvgIdMatch) {
                        modifiedLine = line.replace(
                            /tvg-id=["']([^"']+)["']/i,
                            `tvg-id="$1" tvg-logo="${epgLogo}"`
                        );
                    } else {
                        // Insert after #EXTINF:-1
                        modifiedLine = line.replace(
                            /#EXTINF:-?\d+/i,
                            `$& tvg-logo="${epgLogo}"`
                        );
                    }
                }
                
                result.push(modifiedLine);
                continue;
            }
        }
        
        // Keep line unchanged if no replacement was made
        result.push(line);
    }
    
    return result.join('\n');
}

// ------------------------------------------------------------------------------

/**
 * Replace logos in JSON API response (for player_api.php?action=get_live_streams)
 */
function replaceJSONLogos(data, epgLogos) {
    // XC API returns an array or object of channel data
    let channels = Array.isArray(data) ? data : (data.data || data);
    
    if (!Array.isArray(channels)) {
        return data;
    }
    
    let replacedCount = 0;
    
    channels.forEach(channel => {
        if (!channel) return;
        
        let epgLogo = null;
        
        // Try matching by epg_channel_id
        if (channel.epg_channel_id) {
            epgLogo = epgLogos.byId.get(channel.epg_channel_id);
        }
        
        // Try matching by stream_id (as number)
        if (!epgLogo && channel.stream_id) {
            epgLogo = epgLogos.byNumber.get(String(channel.stream_id));
        }
        
        // Try matching by num (channel number)
        if (!epgLogo && channel.num) {
            epgLogo = epgLogos.byNumber.get(String(channel.num));
        }
        
        // Try matching by name
        if (!epgLogo && channel.name) {
            const name = channel.name.trim().toLowerCase();
            epgLogo = epgLogos.byName.get(name);
        }
        
        // Replace logo if found
        if (epgLogo) {
            channel.stream_icon = epgLogo;
            replacedCount++;
        }
    });
    
    logger.info(`Replaced ${replacedCount} logos in JSON API response`);
    
    return data;
}

// ------------------------------------------------------------------------------

/**
 * Count how many logos were replaced
 */
function countReplacements(original, modified) {
    const originalLogos = (original.match(/tvg-logo=/gi) || []).length;
    const modifiedLogos = (modified.match(/tvg-logo=/gi) || []).length;
    
    // Count lines that changed
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    let changes = 0;
    for (let i = 0; i < Math.min(originalLines.length, modifiedLines.length); i++) {
        if (originalLines[i] !== modifiedLines[i]) {
            changes++;
        }
    }
    
    return changes;
}

// ------------------------------------------------------------------------------
