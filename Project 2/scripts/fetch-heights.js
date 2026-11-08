/**
 * NN2000 heights for every node of the walking network, for walking times on slopes
 * (utils/walkingTime.js). Writes public/data/node-heights.json.
 *
 * 1. Terrain: Kartverket's national terrain model (Nasjonal høydemodell, DTM) from its
 *    WCS in EUREF89 / UTM 32N, resampled by the server (bilinear) to 5 m pixels, in
 *    tiles over the network's bounding box.
 * 2. Each node is converted to UTM 32 and sampled bilinearly (utils/raster.js).
 * 3. Bridges and tunnels: the terrain model is the ground under a bridge (often the
 *    river) and the hill above a tunnel, which would give false slopes. For walkable ways
 *    tagged bridge=* or tunnel=* (except building passages, which are at ground level) the
 *    heights of the inner nodes are interpolated linearly, by distance, between the way's
 *    two end nodes. The ways come from the Overpass API and are matched to network nodes
 *    by their exact micro-degree coordinates, as for the building passages.
 *
 * Heights are stored as integer decimetres. Licence: CC BY 4.0, © Kartverket (terrain);
 * ODbL, © OpenStreetMap contributors (bridges and tunnels).
 * Run with: npm run data:heights (after npm run data:network if the network changed).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fromArrayBuffer } from 'geotiff';
import { wgs84ToUtm32 } from '../src/utils/crs.js';
import { geodesicDistance } from '../src/utils/nearest.js';
import { toOffset, walkableWaysQuery } from '../src/utils/osmNetwork.js';
import { sampleBilinear } from '../src/utils/raster.js';
import { overpass } from './overpass.js';

const WCS = 'https://wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25832';
const COVERAGE_NAME = 'nhm_dtm_topo_25832';
const RES = 5; // metres per pixel
const TILE = 1000; // pixels per tile side (5 km)
const MARGIN = 50; // metres around the network's bounding box
const NETWORK = new URL('../public/data/walking-network.json', import.meta.url);
const OUTPUT = new URL('../public/data/node-heights.json', import.meta.url);
const TERRAIN_CHECK = new URL('../results/terrain-vs-dtm1.csv', import.meta.url);

const network = JSON.parse(readFileSync(NETWORK, 'utf8'));
const count = network.nodes.length / 2;
const lonLat = (i) => [
  network.origin[0] + network.nodes[2 * i] / network.scale,
  network.origin[1] + network.nodes[2 * i + 1] / network.scale,
];

// 1. The network's bounding box in UTM 32, on whole pixels.
const corners = [
  [network.bbox.west, network.bbox.south],
  [network.bbox.west, network.bbox.north],
  [network.bbox.east, network.bbox.south],
  [network.bbox.east, network.bbox.north],
].map(([lon, lat]) => wgs84ToUtm32(lon, lat));
const xMin = Math.floor((Math.min(...corners.map((c) => c[0])) - MARGIN) / RES) * RES;
const yMin = Math.floor((Math.min(...corners.map((c) => c[1])) - MARGIN) / RES) * RES;
const xMax = Math.ceil((Math.max(...corners.map((c) => c[0])) + MARGIN) / RES) * RES;
const yMax = Math.ceil((Math.max(...corners.map((c) => c[1])) + MARGIN) / RES) * RES;

/** One WCS 1.0.0 GetCoverage tile as a raster (see utils/raster.js). */
async function fetchTile(x0, y0, x1, y1) {
  const width = Math.round((x1 - x0) / RES);
  const height = Math.round((y1 - y0) / RES);
  const params = new URLSearchParams({
    SERVICE: 'WCS',
    VERSION: '1.0.0',
    REQUEST: 'GetCoverage',
    COVERAGE: COVERAGE_NAME,
    CRS: 'EPSG:25832',
    BBOX: [x0, y0, x1, y1].join(','),
    WIDTH: width,
    HEIGHT: height,
    FORMAT: 'GeoTIFF',
    INTERPOLATION: 'bilinear',
  });
  const response = await fetch(`${WCS}?${params}`);
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.includes('tiff')) {
    throw new Error(
      `WCS tile ${x0},${y0}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`,
    );
  }
  const image = await (await fromArrayBuffer(await response.arrayBuffer())).getImage();
  const [originX, originY] = image.getOrigin();
  const [resX] = image.getResolution();
  if (image.getGeoKeys().ProjectedCSTypeGeoKey !== 25832 || resX !== RES) {
    throw new Error('unexpected tile CRS or resolution');
  }
  const [values] = await image.readRasters();
  return {
    values,
    width: image.getWidth(),
    height: image.getHeight(),
    x0: originX,
    y0: originY,
    res: RES,
  };
}

const tiles = [];
for (let x = xMin; x < xMax; x += TILE * RES) {
  for (let y = yMin; y < yMax; y += TILE * RES) {
    // Tiles overlap by one pixel so every point between pixel centres is in some tile.
    tiles.push(
      await fetchTile(
        x,
        y,
        Math.min(x + (TILE + 1) * RES, xMax),
        Math.min(y + (TILE + 1) * RES, yMax),
      ),
    );
  }
}

// 2. Sample every node.
const heights = new Float64Array(count).fill(NaN);
for (let i = 0; i < count; i += 1) {
  const [x, y] = wgs84ToUtm32(...lonLat(i));
  for (const tile of tiles) {
    const value = sampleBilinear(tile, x, y);
    if (!Number.isNaN(value)) {
      heights[i] = value;
      break;
    }
  }
}
// Nodes with no terrain value (no-data pixels, e.g. at the end of a pier): average of their
// network neighbours with a value, repeated until nothing changes.
const neighbours = Array.from({ length: count }, () => []);
for (const way of network.ways) {
  for (let k = 1; k < way.length; k += 1) {
    neighbours[way[k - 1]].push(way[k]);
    neighbours[way[k]].push(way[k - 1]);
  }
}
const missing = heights.filter(Number.isNaN).length;
for (let changed = true; changed;) {
  changed = false;
  for (let i = 0; i < count; i += 1) {
    if (!Number.isNaN(heights[i])) continue;
    const known = neighbours[i].map((n) => heights[n]).filter((h) => !Number.isNaN(h));
    if (known.length > 0) {
      heights[i] = known.reduce((a, b) => a + b, 0) / known.length;
      changed = true;
    }
  }
}
const stillMissing = heights.filter(Number.isNaN).length;
if (stillMissing > 0) throw new Error(`${stillMissing} nodes have no height`);

// 3. Bridges and tunnels: interpolate between the way's end nodes.
const box = [network.bbox.south, network.bbox.west, network.bbox.north, network.bbox.east]
  .map((v) => v.toFixed(4))
  .join(',');
const osm = await overpass(`[out:json][timeout:180];
${walkableWaysQuery(box)}
out tags geom qt;`);
const nodeIndex = new Map();
for (let i = 0; i < count; i += 1)
  nodeIndex.set(`${network.nodes[2 * i]},${network.nodes[2 * i + 1]}`, i);
const toNode = ({ lon, lat }) =>
  nodeIndex.get(`${toOffset(lon, network.origin[0])},${toOffset(lat, network.origin[1])}`);
const lifted = (tags = {}) =>
  (tags.bridge && tags.bridge !== 'no') ||
  (tags.tunnel && tags.tunnel !== 'no' && tags.tunnel !== 'building_passage');

const structures = { ways: 0, matched: 0, nodes: 0 };
for (const way of osm.elements) {
  if (way.type !== 'way' || !way.geometry || !lifted(way.tags)) continue;
  structures.ways += 1;
  const nodes = way.geometry.map(toNode);
  if (nodes.some((node) => node === undefined)) continue; // changed since the snapshot
  structures.matched += 1;
  const lengths = [0];
  for (let k = 1; k < nodes.length; k += 1) {
    const [a, b] = [lonLat(nodes[k - 1]), lonLat(nodes[k])];
    lengths.push(
      lengths[k - 1] +
        geodesicDistance({ longitude: a[0], latitude: a[1] }, { longitude: b[0], latitude: b[1] }),
    );
  }
  const [start, end] = [heights[nodes[0]], heights[nodes.at(-1)]];
  const total = lengths.at(-1);
  for (let k = 1; k < nodes.length - 1; k += 1) {
    heights[nodes[k]] = total > 0 ? start + ((end - start) * lengths[k]) / total : start;
    structures.nodes += 1;
  }
}

// Check: the resampled 5 m terrain against DTM 1 point heights from the height API at the
// network nodes of the terrain check (results/terrain-vs-dtm1.csv, check-terrain.js).
const checkRows = readFileSync(TERRAIN_CHECK, 'utf8').trim().split('\n').slice(1);
const differences = [];
for (const row of checkRows) {
  const [lon, lat, dtm1] = row.split(',').map(Number);
  const node = toNode({ lon, lat });
  if (node !== undefined) differences.push(heights[node] - dtm1);
}
const round = (value, decimals) => Number(value.toFixed(decimals));
const dtmCheck = {
  points: differences.length,
  meanDifferenceMetres: round(differences.reduce((a, b) => a + b, 0) / differences.length, 2),
  maxAbsDifferenceMetres: round(Math.max(...differences.map(Math.abs)), 2),
};

const output = {
  source: `${WCS} (${COVERAGE_NAME}), WCS 1.0.0 GetCoverage, ${RES} m, bilinear`,
  dataset: 'Nasjonal høydemodell, digital terrengmodell (DTM), Kartverket',
  licence: 'CC BY 4.0, © Kartverket; bridges and tunnels: ODbL, © OpenStreetMap contributors',
  heightSystem: 'NN2000',
  fetched: new Date().toISOString().slice(0, 10),
  networkTimestamp: network.osmTimestamp,
  bridgesAndTunnelsTimestamp: osm.osm3s?.timestamp_osm_base,
  nodesWithoutTerrain: missing,
  structures,
  dtmCheck,
  unit: 'decimetres',
  heights: Array.from(heights, (h) => Math.round(h * 10)),
};
writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`);
console.warn(JSON.stringify({ tiles: tiles.length, ...output, heights: undefined }, null, 2));
