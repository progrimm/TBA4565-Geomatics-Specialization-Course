/**
 * How well does Cesium World Terrain match Kartverket's 1 m terrain model (DTM 1) in
 * Trondheim? Compares heights at points on the walking network:
 *
 *   - Cesium World Terrain: sampleTerrainMostDetailed in the app (benchmark build),
 *     an ellipsoidal height h, converted to NN2000 with the geoid model: H = h − N;
 *   - DTM 1: Kartverket's height API (ws.geonorge.no/hoydedata, source dtm1), NN2000.
 *
 * Points: an 8 × 8 grid over the shelters' bounding box, each moved to its nearest
 * walking-network node (so the points are on streets and paths, not in the fjord); grid
 * points more than 100 m from the network are dropped. Writes every point to
 * results/terrain-vs-dtm1.csv and the summary to public/data/analysis-summary.json
 * (`terrainCheck`). Needs VITE_CESIUM_TOKEN in .env.
 *
 *   node scripts/check-terrain.js
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launchBrowser, startPreview, stopPreview, vite } from './browser.js';
import { NEAREST } from '../src/config.js';
import { geoidHeight } from '../src/utils/geoid.js';
import { GEOID_GRID } from '../src/utils/geoidGrid.js';
import { gridPoints, quantile } from '../src/utils/grid.js';
import { geodesicDistance } from '../src/utils/nearest.js';
import { buildGraph, nearestNode } from '../src/utils/network.js';

const GRID_SIZE = 8;
const PORT = 4176;
const OUT_DIR = 'dist/bench-terrain';
const HEIGHT_API = 'https://ws.geonorge.no/hoydedata/v1/datakilder/dtm1/punkt';
const API_BATCH = 50;
const SUMMARY = new URL('../public/data/analysis-summary.json', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const round = (value, decimals) => Number(value.toFixed(decimals));

// 1. Points on the walking network.
const shelters = readJson('../public/data/shelters.geojson').features.map(({ geometry }) => ({
  longitude: geometry.coordinates[0],
  latitude: geometry.coordinates[1],
}));
const bbox = {
  west: Math.min(...shelters.map((s) => s.longitude)),
  south: Math.min(...shelters.map((s) => s.latitude)),
  east: Math.max(...shelters.map((s) => s.longitude)),
  north: Math.max(...shelters.map((s) => s.latitude)),
};
const graph = buildGraph(readJson('../public/data/walking-network.json'));
const nodes = new Set();
for (const point of gridPoints(bbox, GRID_SIZE)) {
  const node = nearestNode(graph, point);
  const lonLat = { longitude: graph.lon[node], latitude: graph.lat[node] };
  if (geodesicDistance(point, lonLat) <= NEAREST.maxConnector) nodes.add(node);
}
const points = [...nodes].map((node) => [graph.lon[node], graph.lat[node]]);

// 2. DTM 1 heights (NN2000) from Kartverket's height API, in batches.
const dtm1 = [];
for (let i = 0; i < points.length; i += API_BATCH) {
  const batch = points.slice(i, i + API_BATCH);
  const url = `${HEIGHT_API}?koordsys=4258&punkter=${encodeURIComponent(JSON.stringify(batch))}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`height API: HTTP ${response.status}`);
  dtm1.push(...(await response.json()).punkter.map(({ z }) => z));
}

// 3. Cesium World Terrain heights (ellipsoidal) from a benchmark build of the app.
const env = { ...process.env, VITE_BENCHMARK: 'true' };
const build = vite(`build --outDir ${OUT_DIR} --emptyOutDir --logLevel error`, env);
if (spawnSync(build.command, { ...build.options, stdio: 'inherit' }).status !== 0) {
  throw new Error('build failed');
}
const { server, url } = await startPreview(OUT_DIR, PORT);
let cesium;
try {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__benchmark?.firstLoadMs() !== undefined, null, {
    timeout: 120000,
  });
  cesium = await page.evaluate((lonLats) => window.__benchmark.sampleTerrain(lonLats), points);
  await browser.close();
} finally {
  stopPreview(server);
}

// 4. Compare in NN2000: Cesium h − N against DTM 1.
const rows = points
  .map(([longitude, latitude], i) => {
    const n = geoidHeight({ longitude, latitude }, GEOID_GRID);
    const cesiumNN2000 = cesium[i] === null ? null : cesium[i] - n;
    return {
      longitude,
      latitude,
      dtm1: dtm1[i],
      cesiumEllipsoidal: cesium[i],
      geoid: n,
      cesiumNN2000,
    };
  })
  .filter((row) => row.dtm1 !== null && row.cesiumNN2000 !== null)
  .map((row) => ({ ...row, difference: row.cesiumNN2000 - row.dtm1 }));

const differences = rows.map((row) => row.difference);
const absolute = differences.map(Math.abs).sort((a, b) => a - b);
const terrainCheck = {
  date: new Date().toISOString().slice(0, 10),
  points: rows.length,
  meanDifferenceMetres: round(differences.reduce((a, b) => a + b, 0) / rows.length, 2),
  rmseMetres: round(Math.sqrt(differences.reduce((a, b) => a + b * b, 0) / rows.length), 2),
  medianAbsDifferenceMetres: round(quantile(absolute, 0.5), 2),
  p90AbsDifferenceMetres: round(quantile(absolute, 0.9), 2),
  maxAbsDifferenceMetres: round(absolute.at(-1), 2),
  geoidModel: GEOID_GRID.model,
  definition:
    'Cesium World Terrain (sampleTerrainMostDetailed, h − N) minus Kartverket DTM 1 (NN2000) at walking-network nodes near an 8 × 8 grid over the shelters’ bounding box.',
};

mkdirSync('results', { recursive: true });
const columns = [
  'longitude',
  'latitude',
  'dtm1',
  'cesiumEllipsoidal',
  'geoid',
  'cesiumNN2000',
  'difference',
];
writeFileSync(
  'results/terrain-vs-dtm1.csv',
  [
    columns.join(','),
    ...rows.map((row) =>
      columns
        .map((key) =>
          key === 'longitude' || key === 'latitude' ? row[key].toFixed(7) : row[key].toFixed(3),
        )
        .join(','),
    ),
  ].join('\n') + '\n',
);
const summary = JSON.parse(readFileSync(SUMMARY, 'utf8'));
writeFileSync(SUMMARY, `${JSON.stringify({ ...summary, terrainCheck }, null, 2)}\n`);
console.warn(JSON.stringify(terrainCheck, null, 2));
