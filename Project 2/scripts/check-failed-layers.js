/**
 * Robustness check: open the production build with one data request blocked and
 * confirm the rest of the app still works (view buttons, other layers, the
 * nearest-shelter fallback). Prints one JSON line per case and saves screenshots.
 *
 *   npm run build && npx vite preview --port 4174
 *   node scripts/check-failed-layers.js [screenshotDir]
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const URL = process.env.APP_URL ?? 'http://localhost:4174/';
const OUT_DIR = process.argv[2] ?? 'check-screenshots';
const CASES = [
  { name: 'nothing-blocked', block: undefined },
  { name: 'shelters-blocked', block: '**/data/shelters.geojson' },
  { name: 'network-blocked', block: '**/data/walking-network.json' },
];
const VIEWPORT = { width: 1600, height: 900 };
const SETTLE_MS = 15000;

/** Read the panel and toasts as plain text. */
const readState = (page) =>
  page.evaluate(() => ({
    toasts: [...document.querySelectorAll('.message')].map((el) => el.textContent),
    layers: [...document.querySelectorAll('.layer')].map((el) => ({
      label: el.querySelector('.layer__name').textContent,
      status: el.querySelector('.layer__status')?.textContent ?? 'ready',
      enabled: !el.querySelector('input').disabled,
    })),
    nearest: document.querySelector('[aria-labelledby="nearest-heading"]').innerText,
    credits: document.querySelector('.cesium-widget-credits')?.innerText ?? '',
  }));

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
for (const { name, block } of CASES) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  if (block) await page.route(block, (route) => route.abort('failed'));

  await page.goto(URL);
  await page.waitForTimeout(SETTLE_MS);
  const loaded = await readState(page);

  // The app must stay usable: fly to a preset view, then click the ground in the centre.
  await page.getByRole('button', { name: 'Nidarosdomen' }).click();
  await page.waitForTimeout(4000);
  await page.mouse.click(1000, 450);
  await page.waitForTimeout(2000);
  const afterClick = await readState(page);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`) });

  console.warn(JSON.stringify({ name, loaded, nearestAfterClick: afterClick.nearest, pageErrors }));
  await context.close();
}
await browser.close();
