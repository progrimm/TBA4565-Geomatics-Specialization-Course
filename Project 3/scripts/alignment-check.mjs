// Alignment check: nadir screenshots of a splat with and without the splat, and
// horizontal offsets between picked feature pairs. Needs the dev server
// (`npm run dev`), which exposes window.cesiumViewer.
//
//   node scripts/alignment-check.mjs shots <splat> <lon> <lat> <heightAboveGround>
//   node scripts/alignment-check.mjs pick  <splat> <lon> <lat> <heightAboveGround> <feature> sx sy rx ry
//
// <splat> is the gallery label (regex), lon/lat are WGS84 degrees. `shots` writes
// results/alignment/<name>-splat.png and -reference.png from the same nadir camera.
// APPLY_OFFSET=1 first switches on the splat's suggested offset (file names get -offset).
// `pick` hides the splat and picks the terrain under the splat feature pixel (sx, sy)
// and under the same feature in the reference imagery (rx, ry). Seen from straight
// above, both picks give the feature's horizontal position. Results are appended
// to results/alignment/offsets.csv.
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { Cartesian3, Math as CesiumMath } from 'cesium';
import { ecefToEnu } from '../src/utils/georef.js';

const URL = process.env.APP_URL ?? 'http://localhost:5173/';
const OUT = 'results/alignment';
const VIEWPORT = { width: 1600, height: 900 };
const [mode, splat, lon, lat, aboveGround, feature, ...pixels] = process.argv.slice(2);

mkdirSync(OUT, { recursive: true });
const name =
  splat.toLowerCase().replace(/\W+/g, '-') + (process.env.APPLY_OFFSET === '1' ? '-offset' : '');

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: VIEWPORT });
await page.goto(URL);
await page.waitForFunction(() => window.cesiumViewer);
await page.waitForTimeout(3000);
await page
  .getByRole('button', { name: new RegExp(splat) })
  .first()
  .click();
await page.waitForTimeout(15000);
// APPLY_OFFSET=1 switches on the splat's suggested offset (the dam's Sandcastle shift).
if (process.env.APPLY_OFFSET === '1') {
  await page.locator('summary', { hasText: 'Alignment check' }).click();
  await page.getByRole('switch', { name: /offset/ }).click();
}
await page.getByRole('button', { name: 'Hide controls' }).click();

// Nadir camera: heading 0 (image up = north), pitch -90°, at ground height + aboveGround.
const ground = await page.evaluate(
  ({ longitude, latitude }) =>
    window.cesiumViewer.scene.globe.getHeight({ longitude, latitude, height: 0 }),
  { longitude: CesiumMath.toRadians(Number(lon)), latitude: CesiumMath.toRadians(Number(lat)) },
);
const eye = Cartesian3.fromDegrees(Number(lon), Number(lat), ground + Number(aboveGround));
await page.evaluate(
  ({ x, y, z }) => {
    const viewer = window.cesiumViewer;
    viewer.camera.setView({
      destination: { x, y, z },
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    });
  },
  { x: eye.x, y: eye.y, z: eye.z },
);
await keepRendering();

/**
 * Request frames for a few seconds. A programmatic setView renders a single frame
 * in requestRenderMode, which is not enough for the splat depth sort to finish.
 */
async function keepRendering(ms = 5000) {
  await page.evaluate(async (duration) => {
    const end = performance.now() + duration;
    while (performance.now() < end) {
      window.cesiumViewer.scene.requestRender();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }, ms);
}

/** Show or hide every gallery tileset that is currently shown (the selected splat). */
async function setSplatVisible(visible) {
  await page.evaluate((show) => {
    const viewer = window.cesiumViewer;
    const primitives = viewer.scene.primitives;
    for (let i = 0; i < primitives.length; i += 1) {
      const primitive = primitives.get(i);
      if (primitive.isCesium3DTileset) {
        primitive._alignmentShown ??= primitive.show;
        if (primitive._alignmentShown) primitive.show = show;
      }
    }
  }, visible);
  await keepRendering();
}

if (mode === 'shots') {
  await page.waitForTimeout(10000);
  await page.screenshot({ path: `${OUT}/${name}-splat.png` });
  await setSplatVisible(false);
  await page.screenshot({ path: `${OUT}/${name}-reference.png` });
  console.log(`ground ${ground.toFixed(2)} m (ellipsoidal), camera ${aboveGround} m above it`);
} else if (mode === 'pick') {
  await setSplatVisible(false);
  const [sx, sy, rx, ry] = pixels.map(Number);
  const picks = await page.evaluate(
    (points) =>
      points.map(([x, y]) => {
        // Scene caches pickPosition results by windowPosition.toString(), so a plain
        // object (always "[object Object]") needs a Cartesian2-like toString.
        const p = window.cesiumViewer.scene.pickPosition({ x, y, toString: () => `(${x}, ${y})` });
        return p && { x: p.x, y: p.y, z: p.z };
      }),
    [
      [sx, sy],
      [rx, ry],
    ],
  );
  if (!picks[0] || !picks[1]) throw new Error('Pick failed (no depth under a pixel).');
  const [inSplat, inReference] = picks.map((p) => new Cartesian3(p.x, p.y, p.z));
  // Offset of the splat relative to the reference, in metres East/North.
  const delta = Cartesian3.subtract(inSplat, inReference, new Cartesian3());
  const { east, north } = ecefToEnu(delta, inReference);
  const row = [
    name,
    feature,
    east.toFixed(2),
    north.toFixed(2),
    Math.hypot(east, north).toFixed(2),
  ];
  const file = `${OUT}/offsets.csv`;
  if (!existsSync(file)) appendFileSync(file, 'splat,feature,east_m,north_m,horizontal_m\n');
  appendFileSync(file, `${row.join(',')}\n`);
  console.log(row.join(','));
}
await browser.close();
