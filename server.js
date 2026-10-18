// Serves the built React app (dist/) on Render. All data lives in Supabase,
// so this server only hands out static files with security headers.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8'
};

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

function sendFile(res, filePath, status = 200) {
  fs.readFile(filePath, (error, body) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders });
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    // Vite fingerprints everything under assets/, so it can be cached forever.
    const cache = filePath.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(status, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': cache, ...securityHeaders });
    res.end(body);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', ...securityHeaders });
    return res.end();
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders });
    return res.end('Bad request');
  }

  if (pathname === '/admin' || pathname === '/admin/') return sendFile(res, path.join(DIST, 'admin.html'));

  const filePath = path.resolve(DIST, `.${pathname}`);
  if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) return sendFile(res, path.join(DIST, 'index.html'), 404);

  // Real files are served as-is; anything without an extension is a client-side route.
  if (path.extname(filePath)) return sendFile(res, filePath);
  return sendFile(res, path.join(DIST, 'index.html'));
});

server.listen(PORT, HOST, () => {
  console.log(`SahayaScribe is running on http://${HOST}:${PORT}`);
});
