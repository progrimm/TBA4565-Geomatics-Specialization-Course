// Viewer lab benchmark: each benchmarked viewer page, RUNS times, in headed
// Chromium on the real GPU. Each run is a fresh browser context (empty cache).
//
//   npm run build
//   node scripts/viewer-benchmark.mjs [runs=3]
//
// The script serves dist/ itself with a plain static server WITHOUT compression.
// (`vite preview` gzips responses on the fly, which made the 47 MB PLY take
// ~3 s instead of ~0.2 s to arrive on localhost.) Vsync stays on, so frame rates
// are capped at the display's refresh rate, which is measured and recorded.
// (Switching vsync and the frame-rate limit off made requestAnimationFrame fire
// without new frames being shown, so its timestamps no longer measured rendering.)
// Each viewer runs at 1280 × 720 and at 2560 × 1440 (SCALES=1,2).
//
// Per run, from the page (?bench mode, see src/lab/harness.js):
// - first frame: navigation start -> second animation frame after the engine
//   reports the splat as loaded
// - mean and 5th-percentile FPS over the scripted 10 s orbit
// from the Chrome DevTools Protocol:
// - JS heap after a forced garbage collection (Runtime.getHeapUsage)
// and from the static server:
// - network bytes: response bodies sent during the run. Counted on the server,
//   because Spark fetches the splat in a Web Worker, which the page's CDP
//   session does not see. External requests (none for these pages) are not counted.
// Writes results/viewer-benchmark.csv (one row per run) and
// results/viewer-benchmark-env.json (browser, GPU, OS), and prints medians.
import { createReadStream, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { VIEWERS } from '../src/lab/config.js';
import { median } from '../src/utils/benchmark.js';
import { toCsv } from '../src/utils/csv.js';

const RUNS = Number(process.argv[2] ?? 3);
// Drawing-buffer scales: 1 = 1280 × 720, 2 = 2560 × 1440 (four times the pixels).
const SCALES = (process.env.SCALES ?? '1,2').split(',').map(Number);
const RESULT_TIMEOUT_MS = 120000;
const VIEWPORT = { width: 1600, height: 1000 };
const MIB = 1024 ** 2;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Bytes the static server has sent since the last reset (all requests, workers included). */
const served = { bytes: 0 };

/** Serve dist/ on a free port, uncompressed. */
function serveDist() {
  const root = normalize('dist');
  const server = createServer((request, response) => {
    let path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, normalize(path));
    if (!file.startsWith(root)) return response.writeHead(403).end();
    try {
      const { size } = statSync(file);
      response.writeHead(200, {
        'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
        'Content-Length': size,
        'Cache-Control': 'no-cache',
      });
      served.bytes += size;
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const server = await serveDist();
const base = `http://127.0.0.1:${server.address().port}/lab/`;
const browser = await chromium.launch({
  headless: false,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});

// Read the GPU name on a blank page, so no viewer page gets a second WebGL context.
const probe = await browser.newPage();
const gpu = await probe.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
// Display refresh rate: median requestAnimationFrame interval over 2 s.
const refreshHz = await probe.evaluate(async () => {
  const times = [];
  const start = performance.now();
  while (performance.now() - start < 2000) {
    times.push(await new Promise((resolve) => requestAnimationFrame(resolve)));
  }
  const gaps = times
    .slice(1)
    .map((t, i) => t - times[i])
    .sort((a, b) => a - b);
  return 1000 / gaps[Math.floor(gaps.length / 2)];
});
await probe.close();

const rows = [];
for (const scale of SCALES) {
  for (const viewer of VIEWERS.filter((v) => v.benchmarked)) {
    for (let run = 1; run <= RUNS; run += 1) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      served.bytes = 0;

      await page.goto(`${base}${viewer.page}?bench&scale=${scale}`);
      await page.bringToFront();
      await page.waitForFunction(() => window.__labResult, null, { timeout: RESULT_TIMEOUT_MS });
      const result = await page.evaluate(() => window.__labResult);
      if (result.error) throw new Error(`${viewer.name} run ${run}: ${result.error}`);
      await cdp.send('HeapProfiler.enable');
      await cdp.send('HeapProfiler.collectGarbage');
      const { usedSize } = await cdp.send('Runtime.getHeapUsage');

      const row = {
        viewer: viewer.name,
        resolution: `${1280 * scale}x${720 * scale}`,
        run,
        first_frame_s: result.firstFrameMs / 1000,
        mean_fps: result.meanFps,
        p5_fps: result.p5Fps,
        frames: result.frames,
        js_heap_mib: usedSize / MIB,
        network_mib: served.bytes / MIB,
      };
      rows.push(row);
      console.log(JSON.stringify(row));
      await context.close();
    }
  }
}

const environment = {
  date: new Date().toISOString(),
  browser: `Chromium ${browser.version()} (Playwright, headed)`,
  gpu,
  display_refresh_hz: Math.round(refreshHz),
  os: `${os.version()} ${os.release()} (${os.arch()})`,
  cpu: os.cpus()[0]?.model,
  runs_per_viewer: RUNS,
  viewport: VIEWPORT,
};
await browser.close();
server.close();

mkdirSync('results', { recursive: true });
writeFileSync('results/viewer-benchmark.csv', toCsv(rows, 3));
writeFileSync('results/viewer-benchmark-env.json', `${JSON.stringify(environment, null, 2)}\n`);
console.log(environment);
for (const resolution of new Set(rows.map((row) => row.resolution)))
  for (const viewer of VIEWERS.filter((v) => v.benchmarked)) {
    const own = rows.filter((row) => row.viewer === viewer.name && row.resolution === resolution);
    const pick = (key, digits) => median(own.map((row) => row[key])).toFixed(digits);
    console.log(
      `${viewer.name} ${resolution}: first frame ${pick('first_frame_s', 2)} s, mean ${pick('mean_fps', 1)} fps, p5 ${pick('p5_fps', 1)} fps, heap ${pick('js_heap_mib', 1)} MiB, network ${pick('network_mib', 1)} MiB`,
    );
  }
