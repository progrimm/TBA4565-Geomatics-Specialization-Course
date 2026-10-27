// Viewer lab static metrics: gzipped size of what each viewer page loads up front,
// and lines of integration code per viewer module.
//
//   npm run build
//   node scripts/lab-static-metrics.mjs
//
// Bundle size = the page's entry chunk, its static imports and their CSS from the
// Vite manifest, each gzipped (zlib default level, like a typical web server).
// Lazily loaded chunks, workers and files fetched at runtime (e.g. ArcGIS assets
// from Esri's CDN) are not included. Writes results/viewer-static.csv.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { VIEWERS } from '../src/lab/config.js';
import { toCsv } from '../src/utils/csv.js';
import { countCodeLines, initialFiles } from '../src/utils/labMetrics.js';

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));

const rows = VIEWERS.map((viewer) => {
  const files = initialFiles(manifest, `lab/${viewer.page}`);
  const sizes = files.map((file) => {
    const bytes = readFileSync(`dist/${file}`);
    return { raw: bytes.length, gzip: gzipSync(bytes).length };
  });
  return {
    viewer: viewer.name,
    files: files.length,
    bundle_raw_kib: sizes.reduce((sum, s) => sum + s.raw, 0) / 1024,
    bundle_gzip_kib: sizes.reduce((sum, s) => sum + s.gzip, 0) / 1024,
    integration_lines: countCodeLines(readFileSync(`src/lab/${viewer.id}.js`, 'utf8')),
  };
});

mkdirSync('results', { recursive: true });
writeFileSync('results/viewer-static.csv', toCsv(rows, 1));
console.table(rows);
