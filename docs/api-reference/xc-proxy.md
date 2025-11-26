---
layout: default
title: XC API Proxy
parent: API Reference
nav_order: 11
---

# XC API Proxy

{: .warning }
**Optional Feature**: This endpoint is disabled by default in production. Set `XC_PROXY=true` environment variable to enable.

{: .note }
**Disclaimer**: This software does not host, provide, or distribute any IPTV content or XC API services. It only provides the ability to proxy existing XC API instances that you already have valid credentials for. Users must provide their own credentials for each request - no credentials are stored by this application. This tool simply enhances existing services by replacing channel logos with EPG data.

The XC API Proxy wraps an Xtream Codes (XC) API and automatically replaces channel logos with logos from the EPG/XML guide in both M3U playlists and JSON API responses.

---

## Security Considerations

{: .warning }
**Intended for local network use only**:
- Proxies external API requests through your server
- XC API credentials are passed through URL parameters (obfuscated in logs)
- No authentication/authorization built in - anyone with access can use your configured upstreams
- Not designed or recommended for internet-facing deployments

---

## Player Compatibility

| Player | Status | Notes |
|--------|--------|-------|
| UHF | ✅ Compatible | Fully working |
| SWIPTV | ❌ Not Compatible | Rejects URLs with path parameters - expects base URL format without routes |

---

## Endpoint

```
GET /xc/:upstream/:endpoint
GET /xc/:upstream
```

---

## Configuration

### Environment Variables

- **`APP_MODE`** - Server mode selector
  - **Values**: `standard` (default) or `xcproxy`
  - `standard` - Full game-thumbs API (requires `XC_PROXY=true` to enable XC proxy alongside other features)
  - `xcproxy` - XC proxy only mode (automatically enables proxy, disables all other routes)
  
- **`XC_PROXY`** - Enable XC proxy in standard mode
  - **Only needed when `APP_MODE=standard`** (or not set)
  - **Default**: Enabled in development (`NODE_ENV=development`), disabled in production
  - **Not needed in `xcproxy` mode** - automatically enabled
  
- **`XC_PROXY_UPSTREAM`** - Define upstream XC API servers (required)
  - **Format**: `id1=http://server1:port1,id2=http://server2:port2`
  - **Example**: `local=http://100.65.236.1:9191,remote=http://example.com:8080`

### Standard Mode with XC Proxy

Run the full API with XC proxy enabled alongside other features:

```bash
XC_PROXY=true XC_PROXY_UPSTREAM='local=http://example.com:8080' node index.js
```

### XC Proxy Only Mode

Run only the XC proxy (no image generation or other routes):

```bash
npm run xcproxy
```

Or manually:

```bash
APP_MODE=xcproxy XC_PROXY_UPSTREAM='local=http://example.com:8080' node index.js
```

### Docker Usage

**XC Proxy only mode (recommended if not using game-thumbs for thumbnails/logos):**
```bash
docker run \
  -e APP_MODE=xcproxy \
  -e XC_PROXY_UPSTREAM='local=http://100.65.236.1:9191' \
  -p 3000:3000 \
  game-thumbs
```

**Standard mode (use if you also need thumbnail/logo generation):**
```bash
docker run \
  -e XC_PROXY=true \
  -e XC_PROXY_UPSTREAM='local=http://100.65.236.1:9191' \
  -p 3000:3000 \
  game-thumbs
```

---

## How It Works

1. **Proxies all XC API requests** - Acts as a transparent proxy for the entire XC API
2. **Detects content types** - Automatically identifies M3U playlists and JSON API responses
3. **Fetches EPG data** - Retrieves the XMLTV/EPG guide from the same XC API (cached for 30 min)
4. **Matches channels** - Uses 3-tier matching: tvg-id → channel number → channel name
5. **Replaces logos** - Updates logos in M3U playlists and JSON API responses
6. **Pass-through** - All other requests (streams, images, etc.) are proxied unchanged

---

## Usage

### Basic Format

```
http://your-server.com/xc/:upstream/[xc-endpoint]
```

### Path Parameters

- **`:upstream`** - The upstream identifier configured in `XC_PROXY_UPSTREAM` (e.g., `local`, `remote`)

### IPTV Player Configuration

Configure your IPTV player with the base proxy URL:

```
Server: http://your-server.com/xc/local
Username: YOUR_USERNAME
Password: YOUR_PASSWORD
```

The player will automatically construct the full URLs:

```
http://your-server.com/xc/local/player_api.php?username=YOUR_USERNAME&password=YOUR_PASSWORD
http://your-server.com/xc/local/get.php?username=YOUR_USERNAME&password=YOUR_PASSWORD&type=m3u_plus&output=ts
```

### Example: M3U Playlist Request

```
GET /xc/local/get.php?username=user&password=pass&type=m3u_plus&output=ts
```

This will:
1. Fetch the M3U playlist from the configured upstream XC API
2. Fetch the EPG from `xmltv.php` using the same credentials
3. Match channels using 3-tier fallback (ID → number → name)
4. Replace `tvg-logo` attributes with EPG logos
5. Return the modified playlist

### Example: JSON API with Logo Replacement

```
GET /xc/local/player_api.php?username=user&password=pass&action=get_live_streams
```

This will:
1. Fetch the live streams list from the upstream
2. Fetch and parse the EPG for logo matching
3. Replace `stream_icon` URLs in the JSON response
4. Return the modified JSON with EPG logos

### Example: Pass-through Requests

Other endpoints are proxied unchanged:

```
# Player API info (JSON - no logo replacement)
GET /xc/local/player_api.php?username=user&password=pass

# Stream URLs (video - passed through)
GET /xc/local/live/user/pass/12345.ts

# VOD streams (video - passed through)
GET /xc/local/movie/user/pass/12345.mkv
```

---

## Response Format

### M3U Playlist

Content-Type: `application/vnd.apple.mpegurl`

Modified M3U playlist with logos replaced from EPG:

```m3u
#EXTM3U
#EXTINF:-1 tvg-id="channel1" tvg-logo="http://epg-logo.com/channel1.png" group-title="Sports",Channel Name
http://stream-url/channel1.ts
```

### Other Responses

All non-M3U responses are proxied unchanged with original content-type and headers.

---

## Features

### EPG Logo Matching

The proxy uses a three-tier fallback system to match channels:

1. **Primary: tvg-id** - Matches by `tvg-id` attribute (most reliable)
2. **Fallback 1: Channel number** - Matches by `tvg-chno` attribute
3. **Fallback 2: Channel name** - Matches by channel display name (case-insensitive)

For each channel in the M3U:
- Replaces existing `tvg-logo` values if a match is found
- Adds `tvg-logo` if missing but a match is found
- Leaves channels unchanged if no EPG match found at any tier

### Caching

- EPG data is cached for 30 minutes per XC API base URL
- Reduces load on upstream XC API
- Improves response time for subsequent M3U requests

### Automatic Detection

- Automatically detects M3U playlists by:
  - Content-Type headers (`mpegurl`, `m3u`)
  - Request parameters (`type=m3u`)
  - File paths (`get.php`)

---

## Examples

### Multiple Upstreams

Configure multiple XC APIs:

```bash
XC_PROXY_UPSTREAM='primary=http://server1.com:8080,backup=http://server2.com:8080'
```

Then use them:

```
http://your-server.com/xc/primary/get.php?username=user&password=pass&type=m3u_plus
http://your-server.com/xc/backup/get.php?username=user&password=pass&type=m3u_plus
```

### Testing

```bash
# Test M3U proxy with logo replacement
curl "http://localhost:3000/xc/local/get.php?username=user&password=pass&type=m3u_plus&output=ts"

# Test JSON API with logo replacement
curl "http://localhost:3000/xc/local/player_api.php?username=user&password=pass&action=get_live_streams"

# Test basic player API (pass-through)
curl "http://localhost:3000/xc/local/player_api.php?username=user&password=pass"
```
