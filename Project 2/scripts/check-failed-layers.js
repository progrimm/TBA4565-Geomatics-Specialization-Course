/**
 * Robustness check: open the production build with one data request blocked and
 * confirm the rest of the app still works (view buttons, other layers, the
 * nearest-shelter fallback). Prints one JSON line per case, saves screenshots and
 * exits with code 1 if an expectation fails.
 *
 *   npm run build && npx vite preview --port 4174
 *   node scripts/check-failed-layers.js [screenshotDir]
 */
import { join } from 'node:path';
import { expect, launchBrowser, screenshotDir } from './browser.js';

const URL = process.env.APP_URL ?? 'http://localhost:4174/';
const OUT_DIR = screenshotDir(process.argv[2]);
const CASES = [
  { name: 'nothing-blocked', block: undefined, shelters: true, walk: true },
  { name: 'shelters-blocked', block: '**/data/shelters.geojson', shelters: false, walk: false },
  { name: 'network-blocked', block: '**/data/walking-network.json', shelters: true, walk: false },
];
const VIEWPORT = { width: 1600, height: 900 };
// A ground point in the Nidarosdomen view, right of the panel.
const CLICK = { x: 1000, y: 450 };
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
  }));

const browser = await launchBrowser();
for (const { name, block, shelters, walk } of CASES) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  if (block) await page.route(block, (route) => route.abort('failed'));

  await page.goto(URL);
  await page.waitForTimeout(SETTLE_MS);
  const loaded = await readState(page);

  // The app must stay usable: fly to a preset view, then click the ground.
  await page.getByRole('button', { name: 'Nidarosdomen' }).click();
  await page.waitForTimeout(4000);
  await page.mouse.click(CLICK.x, CLICK.y);
  await page.waitForTimeout(2000);
  const { nearest } = await readState(page);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`) });

  const layer = (label) => loaded.layers.find((entry) => entry.label === label);
  expect(pageErrors.length === 0, `${name}: page errors ${pageErrors.join('; ')}`);
  expect(layer('Buildings').enabled, `${name}: buildings switch should be enabled`);
  expect(layer('Public shelters').enabled === shelters, `${name}: shelter switch state`);
  expect(nearest.includes('Straight') === shelters, `${name}: nearest result after click`);
  expect(nearest.includes('Walk\n') === walk, `${name}: walking distance shown`);
  if (block) expect(loaded.toasts.length > 0, `${name}: an error message should be shown`);

  console.warn(JSON.stringify({ name, loaded, nearestAfterClick: nearest, pageErrors }));
  await context.close();
}
await browser.close();
