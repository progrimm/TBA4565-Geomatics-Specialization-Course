/**
 * Keyboard and focus check of the control panel at desktop and mobile width.
 * Tabs through the page and records, for each focused element, its role, accessible
 * name and whether a focus outline is drawn; then operates the controls with the
 * keyboard only, including opening and closing the "How it works" dialog. Runs with
 * prefers-reduced-motion: reduce. Saves screenshots per width and exits with code 1 if
 * an expectation fails.
 *
 *   npm run build && npx vite preview --port 4174
 *   node scripts/check-accessibility.js [screenshotDir]
 */
import { join } from 'node:path';
import { expect, launchBrowser, screenshotDir } from './browser.js';

const URL = process.env.APP_URL ?? 'http://localhost:4174/';
const OUT_DIR = screenshotDir(process.argv[2]);
const WIDTHS = [
  { name: 'desktop', viewport: { width: 1600, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];
const SETTLE_MS = 10000;
const MAX_TABS = 30;

/** Role, accessible name and focus-outline state of the focused element. */
const describeFocus = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    const name =
      el.getAttribute('aria-label') ??
      el.closest('label')?.querySelector('.layer__name')?.textContent ??
      el.textContent.trim();
    return {
      inPanel: !!el.closest('.panel'),
      role: el.getAttribute('role') ?? el.tagName.toLowerCase(),
      name,
      outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
      checked: el.type === 'checkbox' ? el.checked : undefined,
      expanded: el.getAttribute('aria-expanded') ?? undefined,
    };
  });

/** Press Tab through the whole page (until focus wraps around or MAX_TABS), recording each stop. */
async function tabThrough(page) {
  const stops = [];
  for (let i = 0; i < MAX_TABS; i += 1) {
    await page.keyboard.press('Tab');
    const stop = await describeFocus(page);
    if (stop.role === 'body') break;
    stops.push(stop);
  }
  return stops;
}

const browser = await launchBrowser();
for (const { name, viewport } of WIDTHS) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(URL);
  await page.waitForTimeout(SETTLE_MS);

  // On mobile the panel starts collapsed: its first focus stops must be the homepage link
  // and "How it works", which stay outside the collapsible body, and then the expand button.
  const before = await tabThrough(page);
  const [firstPanelStop, secondPanelStop, thirdPanelStop] = before.filter((stop) => stop.inPanel);
  expect(firstPanelStop?.name === '← My GIS module', `${name}: first panel stop is the home link`);
  expect(secondPanelStop?.name === 'How it works', `${name}: second panel stop is "How it works"`);
  if (name === 'mobile') {
    expect(thirdPanelStop?.expanded === 'false', 'mobile: next panel stop is "Show controls"');
    await page.locator('.panel__toggle').focus();
    await page.keyboard.press('Enter');
  }
  await page.evaluate(() => document.activeElement.blur());
  const stops = await tabThrough(page);
  const panelStops = stops.filter((stop) => stop.inPanel).map((stop) => stop.name);
  for (const control of ['Midtbyen', 'Nidarosdomen', 'Bakklandet', 'Buildings', 'Public shelters'])
    expect(panelStops.includes(control), `${name}: "${control}" is reachable with Tab`);
  expect(
    stops.every((stop) => stop.outline),
    `${name}: every focus stop has an outline`,
  );

  // Operate controls with the keyboard: Space toggles a switch, Enter presses a button.
  await page.getByRole('switch', { name: 'Buildings' }).focus();
  const buildingsBefore = await describeFocus(page);
  await page.keyboard.press('Space');
  const buildingsAfterSpace = await describeFocus(page);
  expect(
    buildingsAfterSpace.checked !== buildingsBefore.checked,
    `${name}: Space toggles a switch`,
  );
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Nidarosdomen' }).focus();
  await page.keyboard.press('Enter');
  // With reduced motion the flight duration is 0, so the new view is there almost at once.
  await page.waitForTimeout(1500);
  await page.getByRole('switch', { name: 'Public shelters' }).focus();
  await page.screenshot({ path: join(OUT_DIR, `keyboard-${name}.png`) });

  // "How it works": Enter opens the dialog with focus inside it, Tab stays inside
  // (modal), Escape closes it and focus returns to the button.
  const aboutButton = page.getByRole('button', { name: 'How it works' });
  await aboutButton.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'How it works' });
  await dialog.waitFor();
  await page.waitForTimeout(1000); // let the results file load
  const focusInDialog = () => page.evaluate(() => !!document.activeElement.closest('dialog'));
  expect(await focusInDialog(), `${name}: focus moves into the dialog`);
  for (let i = 0; i < 8; i += 1) await page.keyboard.press('Tab');
  expect(await focusInDialog(), `${name}: Tab stays inside the dialog`);
  expect(
    (await dialog.textContent()).includes('Walk ÷ straight line'),
    `${name}: the dialog shows the key results`,
  );
  await page.screenshot({ path: join(OUT_DIR, `about-${name}.png`) });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(!(await dialog.isVisible()), `${name}: Escape closes the dialog`);
  expect(
    await aboutButton.evaluate((el) => el === document.activeElement),
    `${name}: focus returns to "How it works"`,
  );

  console.warn(
    JSON.stringify({ name, beforeExpand: before, stops, buildingsBefore, buildingsAfterSpace }),
  );
  await context.close();
}
await browser.close();
