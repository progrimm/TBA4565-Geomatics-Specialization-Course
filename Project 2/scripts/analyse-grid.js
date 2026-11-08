/**
 * Grid analysis of the nearest-shelter search: run the same search the app runs on a
 * click (findWalkInRange) from a 30 × 30 grid of points over the shelters' bounding
 * box, and write summary statistics to public/data/analysis-summary.json. The
 * "How it works" panel reads its key results from that file, so every number it
 * shows comes from this script.
 * Run with: npm run analysis:grid (after any change to the data files).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { NEAREST } from '../src/config.js';
import { gridPoints, quantile } from '../src/utils/grid.js';
import { findNearest } from '../src/utils/nearest.js';
import { buildGraph, findWalkInRange, snapShelters } from '../src/utils/network.js';
import { buildingsOnPath, passageIndexFor } from '../src/utils/passages.js';

const DATA = new URL('../public/data/', import.meta.url);
const OUTPUT = new URL('analysis-summary.json', DATA);
const GRID_SIZE = 30;

const readJson = async (name) => JSON.parse(await readFile(new URL(name, DATA), 'utf8'));
const round = (value, decimals) => Number(value.toFixed(decimals));

const [shelterFile, network, passages] = await Promise.all([
  readJson('shelters.geojson'),
  readJson('walking-network.json'),
  readJson('building-passages.json'),
]);

// Shelter records as in layers/shelters.js: WGS84 lon/lat in degrees plus attributes.
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
const passageIndex = passageIndexFor(network, passages);

const counts = { routed: 0, far: 0, unreachable: 0, differentShelter: 0, throughBuildings: 0 };
const detourRatios = [];
const connectors = [];
const walks = [];
for (const point of gridPoints(bbox, GRID_SIZE)) {
  const { nearest, outOfRange } = findWalkInRange(point, graph, shelterNodes, NEAREST.maxConnector);
  if (!nearest) {
    counts[outOfRange.reason] += 1;
    continue;
  }
  counts.routed += 1;
  // Detour ratio (circuity): walk length / geodesic distance to the same shelter.
  if (nearest.distance > 0) detourRatios.push(nearest.walk.distance / nearest.distance);
  connectors.push(nearest.walk.toNetwork);
  walks.push(nearest.walk.distance);
  if (findNearest(point, shelters).shelter !== nearest.shelter) counts.differentShelter += 1;
  if (passageIndex && buildingsOnPath(nearest.walk.nodes, passageIndex).length > 0)
    counts.throughBuildings += 1;
}

const ascending = (values) => [...values].sort((a, b) => a - b);
const summary = (values, decimals) => {
  const sorted = ascending(values);
  return {
    median: round(quantile(sorted, 0.5), decimals),
    p90: round(quantile(sorted, 0.9), decimals),
  };
};

const result = {
  description:
    'Nearest-shelter search (findWalkInRange) from a grid of points over the shelters’ bounding box. Written by scripts/analyse-grid.js.',
  generated: new Date().toISOString().slice(0, 10),
  inputs: {
    sheltersFetched: shelterFile.metadata?.fetched,
    networkTimestamp: network.osmTimestamp,
    passagesTimestamp: passages.osmTimestamp,
    maxConnectorMetres: NEAREST.maxConnector,
  },
  grid: {
    size: GRID_SIZE,
    points: GRID_SIZE * GRID_SIZE,
    bbox: Object.fromEntries(Object.entries(bbox).map(([k, v]) => [k, round(v, 7)])),
  },
  routed: counts.routed,
  refusedFar: counts.far,
  refusedUnreachable: counts.unreachable,
  differentShelter: {
    count: counts.differentShelter,
    share: round(counts.differentShelter / counts.routed, 4),
  },
  throughBuildings: {
    count: counts.throughBuildings,
    share: round(counts.throughBuildings / counts.routed, 4),
  },
  detourRatio: summary(detourRatios, 2),
  walkMetres: summary(walks, 0),
  connectorMetres: summary(connectors, 1),
};

// Keep results that other scripts add to the same file (terrainCheck, coverage).
const previous = await readFile(OUTPUT, 'utf8').then(JSON.parse, () => ({}));
const merged = { ...previous, ...result };
await writeFile(OUTPUT, `${JSON.stringify(merged, null, 2)}\n`);
console.warn(JSON.stringify(merged, null, 2));
