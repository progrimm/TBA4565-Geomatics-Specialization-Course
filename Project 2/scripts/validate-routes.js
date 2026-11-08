/**
 * External check of the app's walking routes: compare the shortest walk the app finds
 * (findWalkInRange, by distance) with an independent router, OSRM with its foot profile
 * on FOSSGIS's public server (routing.openstreetmap.de), from the same start to the same
 * shelter.
 *
 * Points: every 4th routed point of the 30 × 30 grid of scripts/analyse-grid.js. OSRM's
 * distance is taken end to end like the app's: its route plus the straight snapping
 * distances of both waypoints (OSRM snaps to the nearest edge, the app to the nearest node).
 *
 * Usage policy (https://routing.openstreetmap.de/about.html): at most one request per
 * second, no heavy use, a valid User-Agent. This script sends about 210 requests, one every
 * 1.1 s. Routes © OpenStreetMap contributors (ODbL), routing by FOSSGIS e.V. (OSRM).
 * Writes results/route-validation.csv and `routeValidation` in
 * public/data/analysis-summary.json. Run with: node scripts/validate-routes.js
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { NEAREST } from '../src/config.js';
import { gridPoints, quantile } from '../src/utils/grid.js';
import { buildGraph, findWalkInRange, snapShelters } from '../src/utils/network.js';

const OSRM = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';
const USER_AGENT = 'trondheim-shelter-analysis (NTNU TBA4565 student project)';
const GRID_SIZE = 30; // as in analyse-grid.js
const EVERY = 4;
const WAIT_MS = 1100;
const DATA = new URL('../public/data/', import.meta.url);
const readJson = (name) => JSON.parse(readFileSync(new URL(name, DATA), 'utf8'));
const round = (value, decimals) => Number(value.toFixed(decimals));

const shelterFile = readJson('shelters.geojson');
const network = readJson('walking-network.json');
const shelters = shelterFile.features.map(({ geometry, properties }) => ({
  longitude: geometry.coordinates[0],
  latitude: geometry.coordinates[1],
  ...properties,
}));
const bbox = {
  west: Math.min(...shelters.map((s) => s.longitude)),
  south: Math.min(...shelters.map((s) => s.latitude)),
  east: Math.max(...shelters.map((s) => s.longitude)),
  north: Math.max(...shelters.map((s) => s.latitude)),
};
const graph = buildGraph(network);
const shelterNodes = snapShelters(graph, shelters);

// The routed grid points, in grid order, and every EVERY-th of them.
const routed = [];
for (const point of gridPoints(bbox, GRID_SIZE)) {
  const { nearest } = findWalkInRange(point, graph, shelterNodes, NEAREST.maxConnector);
  if (nearest) routed.push({ point, nearest });
}
const sample = routed.filter((_, i) => i % EVERY === 0);

/** OSRM foot route between two WGS84 points: route metres and the two snapping distances. */
async function osrm(from, to) {
  const coordinates = [from, to].map((p) => `${p.longitude},${p.latitude}`).join(';');
  const response = await fetch(`${OSRM}/${coordinates}?overview=false&steps=false`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!response.ok) throw new Error(`OSRM: HTTP ${response.status}`);
  const body = await response.json();
  if (body.code !== 'Ok') return undefined;
  return {
    route: body.routes[0].distance,
    snapping: body.waypoints.reduce((sum, waypoint) => sum + waypoint.distance, 0),
  };
}

const rows = [];
for (const { point, nearest } of sample) {
  const result = await osrm(point, nearest.shelter);
  await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  if (!result) continue;
  const osrmTotal = result.route + result.snapping;
  rows.push({
    latitude: point.latitude,
    longitude: point.longitude,
    romnr: nearest.shelter.romnr,
    app: nearest.walk.distance,
    osrmRoute: result.route,
    osrmSnapping: result.snapping,
    osrmTotal,
    differencePercent: ((osrmTotal - nearest.walk.distance) / nearest.walk.distance) * 100,
  });
}

mkdirSync('results', { recursive: true });
const columns = Object.keys(rows[0]);
writeFileSync(
  'results/route-validation.csv',
  [
    columns.join(','),
    ...rows.map((row) =>
      columns
        .map((key) => (key === 'latitude' || key === 'longitude' ? row[key].toFixed(5) : row[key]))
        .map((value) => (typeof value === 'number' ? round(value, 1) : value))
        .join(','),
    ),
  ].join('\n') + '\n',
);

const sorted = (values) => [...values].sort((a, b) => a - b);
const signed = sorted(rows.map((row) => row.differencePercent));
const absolute = sorted(signed.map(Math.abs));
const within = (percent) => round(absolute.filter((d) => d <= percent).length / rows.length, 4);
const routeValidation = {
  date: new Date().toISOString().slice(0, 10),
  router: 'OSRM foot profile, routing.openstreetmap.de (FOSSGIS e.V.)',
  points: rows.length,
  sampled: sample.length,
  medianDifferencePercent: round(quantile(signed, 0.5), 2),
  medianAbsDifferencePercent: round(quantile(absolute, 0.5), 2),
  p90AbsDifferencePercent: round(quantile(absolute, 0.9), 2),
  within5Percent: within(5),
  within10Percent: within(10),
  definition:
    'OSRM (route + both snapping distances) minus the app’s shortest walk, in % of the app’s walk, from every 4th routed grid point to the shelter the app chose.',
};
const summaryUrl = new URL('analysis-summary.json', DATA);
const previous = JSON.parse(readFileSync(summaryUrl, 'utf8'));
writeFileSync(summaryUrl, `${JSON.stringify({ ...previous, routeValidation }, null, 2)}\n`);
console.warn(JSON.stringify(routeValidation, null, 2));
const worst = [...rows].sort(
  (a, b) => Math.abs(b.differencePercent) - Math.abs(a.differencePercent),
);
console.warn('Largest differences:');
for (const row of worst.slice(0, 5)) console.warn(JSON.stringify(row));
