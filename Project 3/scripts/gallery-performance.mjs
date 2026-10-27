// Gallery performance: for each splat, open it in the production build, wait until
// its first view has loaded, then read the in-app Performance panel once per second.
// The panel is open from 2 s after selection, so rendering is continuous during
// loading too (the same for every splat).
//
//   npm run build && npx vite preview --port 4173
//   node scripts/gallery-performance.mjs [runs=3]
//
// Each run is a fresh page (empty cache). The camera stays at the view the app
// flies to after selection, so the frame rate is for a static camera. Writes
// results/gallery-performance.csv (one row per run) and prints medians.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const URL = process.env.APP_URL ?? 'http://localhost:4173/';
const RUNS = Number(process.argv[2] ?? 3);
const SPLATS = ['Microsoft campus', 'Hines Rowing Center', 'RTE substation', "O'Shaughnessy Dam"];
const LOAD_TIMEOUT_MS = 120000;
const SAMPLES = 10;
const VIEWPORT = { width: 1600, height: 900 };

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Parse "1.2 GiB" / "47.8 MiB" / "512 B" into bytes. */
const toBytes = (text) => {
  const [value, unit] = text.split(' ');
  return Number(value) * 1024 ** ['B', 'KiB', 'MiB', 'GiB'].indexOf(unit);
};

/** Read the Performance panel's definition list into an object. */
async function readPanel(page) {
  return page.evaluate(() => {
    const details = [...document.querySelectorAll('details')].find((element) =>
      element.querySelector('summary')?.textContent.includes('Performance'),
    );
    const entries = {};
    for (const dt of details.querySelectorAll('dt'))
      entries[dt.textContent] = dt.nextSibling.textContent;
    return entries;
  });
}

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const rows = [];
let renderer;
for (const splat of SPLATS) {
  for (let run = 1; run <= RUNS; run += 1) {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.goto(URL);
    await page.waitForTimeout(3000);
    renderer ??= await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    await page
      .getByRole('button', { name: new RegExp(splat) })
      .first()
      .click();
    // Open the panel right away, wait until the first view has loaded (one dam tile
    // can take > 30 s to download), then 3 s more to settle.
    await page.waitForTimeout(2000);
    await page.locator('summary', { hasText: 'Performance' }).click();
    const start = Date.now();
    while (Date.now() - start < LOAD_TIMEOUT_MS) {
      const panel = await readPanel(page);
      if (panel['First view'] && panel['First view'] !== '…') break;
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(3000);
    const samples = [];
    for (let i = 0; i < SAMPLES; i += 1) {
      await page.waitForTimeout(1000);
      samples.push(await readPanel(page));
    }
    const last = samples.at(-1);
    const row = {
      splat,
      run,
      fps: median(samples.map((s) => parseFloat(s['Frame rate']))),
      worst_frame_ms: Math.max(
        ...samples.map((s) => parseFloat(s['Frame rate'].split('worst frame ')[1])),
      ),
      tileset_json_s: parseFloat(last['tileset.json']),
      first_view_s: parseFloat(last['First view']),
      tiles_loaded: Number(last['Tiles loaded']),
      tileset_memory_mib: toBytes(last.Memory.replace(' (tileset)', '')) / 1024 ** 2,
      js_heap_mib: toBytes(last['JS heap']) / 1024 ** 2,
    };
    rows.push(row);
    console.log(JSON.stringify(row));
    await context.close();
  }
}
await browser.close();

mkdirSync('results', { recursive: true });
const header = Object.keys(rows[0]);
const csv = [
  header.join(','),
  ...rows.map((row) =>
    header
      .map((key) => (typeof row[key] === 'number' ? row[key].toFixed(2) : `"${row[key]}"`))
      .join(','),
  ),
];
writeFileSync('results/gallery-performance.csv', `${csv.join('\n')}\n`);
console.log(`renderer: ${renderer}; browser: Chromium ${browser.version()}`);
for (const splat of SPLATS) {
  const runs = rows.filter((row) => row.splat === splat);
  const pick = (key) => median(runs.map((row) => row[key])).toFixed(2);
  console.log(
    `${splat}: fps ${pick('fps')}, first view ${pick('first_view_s')} s, tileset.json ${pick('tileset_json_s')} s, tiles ${pick('tiles_loaded')}, memory ${pick('tileset_memory_mib')} MiB, heap ${pick('js_heap_mib')} MiB`,
  );
}
