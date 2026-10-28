/**
 * OSM Buildings performance at the Midtbyen start view for several values of
 * maximumScreenSpaceError (SSE). For each value: build the app with
 * VITE_BENCHMARK=true and VITE_BUILDINGS_SSE=<value> into dist/bench-sse-<value>,
 * serve it with `vite preview`, and run Chromium (GPU on) RUNS times, each in a
 * fresh context (empty cache). Per run it records:
 *   - first_load_ms: navigation start → terrain and buildings fully loaded for the view
 *   - mean_fps, p5_fps, worst_frame_ms: during a scripted 10 s 360° orbit
 *   - tileset_mib: memory held by the loaded building tiles after the orbit
 *   - js_heap_mib: used JS heap after the orbit
 * Writes results/buildings-benchmark.csv and a screenshot per value, and prints medians.
 * Needs VITE_CESIUM_TOKEN in .env (Vite reads it at build time).
 *
 *   node scripts/benchmark-buildings.js [runs=3] [sse values, default 16,32]
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const RUNS = Number(process.argv[2] ?? 3);
const SSE_VALUES = (process.argv[3] ?? '16,32').split(',').map(Number);
const PORT = 4175;
const VIEWPORT = { width: 1600, height: 900 };
const ORBIT_MS = 10000;
const LOAD_TIMEOUT_MS = 120000;
const SETTLE_MS = 2000;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Run vite (build or preview) through npx; shell is needed for npx on Windows. */
const vite = (args, env) => ({ command: `npx vite ${args}`, options: { env, shell: true } });

/** Start `vite preview` for one build and resolve once it accepts requests. */
async function startPreview(outDir) {
  const { command, options } = vite(`preview --outDir ${outDir} --port ${PORT} --strictPort`);
  const server = spawn(command, { ...options, stdio: 'ignore' });
  const url = `http://localhost:${PORT}/`;
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(url)).ok) return { server, url };
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`vite preview did not start on port ${PORT}`);
}

/** Stop the preview server (and its child processes on Windows). */
function stopPreview(server) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']);
  else server.kill();
}

mkdirSync('results', { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const rows = [];
let renderer;
for (const sse of SSE_VALUES) {
  const outDir = `dist/bench-sse-${sse}`;
  const env = { ...process.env, VITE_BENCHMARK: 'true', VITE_BUILDINGS_SSE: String(sse) };
  const build = vite(`build --outDir ${outDir} --emptyOutDir --logLevel error`, env);
  const built = spawnSync(build.command, { ...build.options, stdio: 'inherit' });
  if (built.status !== 0) throw new Error(`build for SSE ${sse} failed`);
  const { server, url } = await startPreview(outDir);

  try {
    for (let run = 1; run <= RUNS; run += 1) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();
      await page.goto(url);
      renderer ??= await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2');
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
      });
      await page.waitForFunction(() => window.__benchmark?.firstLoadMs() !== undefined, null, {
        timeout: LOAD_TIMEOUT_MS,
        polling: 100,
      });
      const firstLoadMs = await page.evaluate(() => window.__benchmark.firstLoadMs());
      if (run === 1) await page.screenshot({ path: `results/buildings-sse-${sse}.png` });
      await page.waitForTimeout(SETTLE_MS);
      const orbit = await page.evaluate((ms) => window.__benchmark.orbit(ms), ORBIT_MS);
      const memory = await page.evaluate(() => ({
        tileset: window.__benchmark.tilesetBytes(),
        heap: performance.memory?.usedJSHeapSize ?? NaN,
      }));
      const row = {
        sse,
        run,
        first_load_ms: firstLoadMs,
        mean_fps: orbit.meanFps,
        p5_fps: orbit.p5Fps,
        worst_frame_ms: orbit.worstFrameMs,
        frames: orbit.frames,
        tileset_mib: memory.tileset / 1024 ** 2,
        js_heap_mib: memory.heap / 1024 ** 2,
      };
      rows.push(row);
      console.warn(JSON.stringify(row));
      await context.close();
    }
  } finally {
    stopPreview(server);
  }
}
const browserVersion = browser.version();
await browser.close();

const header = Object.keys(rows[0]);
const csv = [
  header.join(','),
  ...rows.map((row) =>
    header.map((key) => (Number.isInteger(row[key]) ? row[key] : row[key].toFixed(2))).join(','),
  ),
];
writeFileSync('results/buildings-benchmark.csv', `${csv.join('\n')}\n`);
console.warn(`renderer: ${renderer}; browser: Chromium ${browserVersion}`);
for (const sse of SSE_VALUES) {
  const runs = rows.filter((row) => row.sse === sse);
  const pick = (key) => median(runs.map((row) => row[key])).toFixed(2);
  console.warn(
    `SSE ${sse}: first load ${pick('first_load_ms')} ms, mean ${pick('mean_fps')} fps, p5 ${pick('p5_fps')} fps, worst frame ${pick('worst_frame_ms')} ms, tiles ${pick('tileset_mib')} MiB, heap ${pick('js_heap_mib')} MiB`,
  );
}
