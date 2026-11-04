import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.argv[2] || 8788);
const MIME = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.wasm': 'application/wasm',
};

function filePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = resolve(root, `.${pathname}`);
  const rel = relative(root, candidate);
  if (rel.startsWith('..') || rel.includes('..\\')) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  try {
    let target = filePath(request.url || '/');
    if (!target) { response.writeHead(403); response.end('Forbidden'); return; }
    let info;
    try { info = await stat(target); } catch { info = null; }
    if (info?.isDirectory()) target = join(target, 'index.html');
    if (!info && !extname(target)) target = join(target, 'index.html');
    const body = await readFile(target);
    response.writeHead(200, {
      'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`static server listening on http://127.0.0.1:${port}`));
