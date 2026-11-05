const assert = require('node:assert/strict');
const http = require('node:http');
const { brotliCompressSync } = require('node:zlib');
const express = require('express');
const { applyMiddleware } = require('../src/app/middleware');

// No route consumes a request body. Keep the global stack free of automatic
// decompression, including for Brotli-encoded JSON or URL-encoded requests.
process.env.TRUST_PROXY = '0';
process.env.RATE_LIMIT_PER_MINUTE = '1';
const app = express();
applyMiddleware(app);
const names = app.router.stack.map(layer => layer.name);
assert(!names.includes('jsonParser'), 'global JSON parser must not be installed');
assert(!names.includes('urlencodedParser'), 'global URL-encoded parser must not be installed');
app.all('/probe', (req, res) => res.json({ bodyParsed: req.body !== undefined }));

const server = http.createServer(app);
server.listen(0, '127.0.0.1', async () => {
    const request = (headers = {}, body = '') => new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: server.address().port, path: '/probe', method: 'POST', headers }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
        });
        req.on('error', reject);
        req.end(body);
    });

    try {
        const headers = { 'content-type': 'application/json', 'content-encoding': 'br' };
        const compressed = await request(headers, brotliCompressSync(Buffer.from('{"ok":true}')));
        assert.equal(compressed.status, 200);
        assert.deepEqual(JSON.parse(compressed.body), { bodyParsed: false });
        const malformed = await request(headers, 'not a Brotli stream');
        assert.equal(malformed.status, 200);
        assert.deepEqual(JSON.parse(malformed.body), { bodyParsed: false });
        assert.equal((await request()).status, 200);
        assert.equal((await request()).status, 429);
        console.log('Request bodies are not parsed and rate limiting remains active');
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    } finally {
        server.close();
    }
});
