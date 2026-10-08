const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { handleApi } = require('./api');
const { dbPath } = require('./db');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const normalized = path.normalize(decoded);
  const relative = normalized.startsWith(path.sep) ? normalized.slice(1) : normalized;
  const candidate = path.join(ROOT, relative || 'index.html');
  if (!candidate.startsWith(ROOT)) return null;
  return candidate;
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname.startsWith('/api/')) {
    return handleApi(req, res, requestUrl.pathname, requestUrl.searchParams);
  }

  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = safePath(pathname);
  if (!filePath) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not found');
      }
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Internal server error');
    }

    const fileName = path.basename(filePath);
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': fileName === 'admin.html' || fileName === 'login.html' ? 'no-store' : 'no-cache'
    });
    res.end(data);
  });
});

const shutdown = (signal) => {
  console.log(`${signal} recebido. Encerrando Boss67 Agendamento...`);
  server.close(() => {
    try { require('./db').db.close(); } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, () => {
  console.log(`Boss67 app: http://localhost:${PORT}`);
  console.log(`SQLite DB: ${dbPath}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
