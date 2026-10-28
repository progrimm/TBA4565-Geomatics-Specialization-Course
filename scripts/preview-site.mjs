// Serves a built site folder under a URL prefix, the way GitHub Pages serves a
// project site (https://<user>.github.io/<repo>/). Anything that escapes the
// prefix with an absolute "/" path gets a 404 here, just as it would live.
//
// Usage: node scripts/preview-site.mjs [dir] [--prefix /repo/] [--port 4300]
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    prefix: { type: 'string', default: '/TBA4565-Geomatics-Specialization-Course/' },
    port: { type: 'string', default: '4300' },
  },
});
const root = resolve(positionals[0] ?? 'dist-site');
const prefix = values.prefix.endsWith('/') ? values.prefix : `${values.prefix}/`;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.geojson': 'application/geo+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.xml': 'application/xml',
};

function fileFor(pathname) {
  if (!pathname.startsWith(prefix)) return null;
  const relative = normalize(decodeURIComponent(pathname.slice(prefix.length)));
  const path = join(root, relative);
  if (path !== root && !path.startsWith(root + sep)) return null;
  try {
    const stats = statSync(path);
    if (stats.isFile()) return path;
    // Pages answers /dir (no slash) with a redirect; only /dir/ serves index.html.
    if (stats.isDirectory() && pathname.endsWith('/')) {
      const index = join(path, 'index.html');
      if (statSync(index).isFile()) return index;
    }
  } catch {
    return null;
  }
  return null;
}

createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  if (pathname === '/') {
    response.writeHead(302, { location: prefix }).end();
    return;
  }
  const file = fileFor(pathname);
  if (!file) {
    if (pathname.startsWith(prefix) && !pathname.endsWith('/') && !extname(pathname)) {
      response.writeHead(301, { location: `${pathname}/` }).end();
      return;
    }
    response.writeHead(404, { 'content-type': 'text/plain' }).end(`404 ${pathname}\n`);
    return;
  }
  response.writeHead(200, {
    'content-type': types[extname(file).toLowerCase()] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
}).listen(Number(values.port), () => {
  console.log(`Serving ${root} at http://localhost:${values.port}${prefix}`);
});
