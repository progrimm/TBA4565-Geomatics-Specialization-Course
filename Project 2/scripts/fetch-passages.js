/**
 * Find where the walking network goes through a building, and write the result to
 * public/data/building-passages.json. Downloads the walkable ways (with tags and
 * geometry) and the building footprints in the network's bounding box from the
 * Overpass API, overlays them (utils/passages.js), and maps the segments inside
 * buildings back to node indices of the committed walking-network.json.
 * Licence: ODbL, © OpenStreetMap contributors.
 * Run with: npm run data:passages (after npm run data:network if the network changed).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { toOffset, walkableWaysQuery } from '../src/utils/osmNetwork.js';
import { findPassages, toBuildingPolygons } from '../src/utils/passages.js';
import { overpass } from './overpass.js';

const NETWORK = new URL('../public/data/walking-network.json', import.meta.url);
const OUTPUT = new URL('../public/data/building-passages.json', import.meta.url);
// Metres of a way that must lie inside a footprint before it counts as going through
// the building. OSM footprints and footways are accurate to about 1–2 m, so a footway
// along a wall can cut a corner by a metre or two without entering the building.
const MIN_INSIDE = 5;

const started = performance.now();
const network = JSON.parse(await readFile(NETWORK, 'utf8'));
const { bbox, origin } = network;
const box = [bbox.south, bbox.west, bbox.north, bbox.east].map((v) => v.toFixed(4)).join(',');

const walkable = await overpass(`[out:json][timeout:180];
${walkableWaysQuery(box)}
out tags geom qt;`);
const footprints = await overpass(`[out:json][timeout:180];
(
  way["building"](${box});
  relation["building"]["type"="multipolygon"](${box});
);
out tags geom qt;`);
const downloaded = performance.now();

const ways = walkable.elements
  .filter((element) => element.type === 'way' && element.geometry)
  .map(({ tags, geometry }) => ({ tags, coordinates: geometry.map(({ lon, lat }) => [lon, lat]) }));
const buildings = toBuildingPolygons(footprints.elements);
if (ways.length === 0 || buildings.length === 0) {
  throw new Error('Overpass returned no ways or no buildings; refusing to overwrite the dataset.');
}
const passages = findPassages(ways, buildings, { minInside: MIN_INSIDE });
const overlaid = performance.now();

// Map segments to walking-network node indices by their exact micro-degree offsets.
// A segment is kept only if it is an edge of the committed network (OSM may have
// changed since the network snapshot was taken).
const nodeIndex = new Map();
for (let i = 0; i < network.nodes.length / 2; i += 1) {
  nodeIndex.set(`${network.nodes[2 * i]},${network.nodes[2 * i + 1]}`, i);
}
const edgeSet = new Set();
for (const way of network.ways) {
  for (let k = 1; k < way.length; k += 1) edgeSet.add(`${way[k - 1]}-${way[k]}`);
}
const toNode = ([lon, lat]) =>
  nodeIndex.get(`${toOffset(lon, origin[0])},${toOffset(lat, origin[1])}`);
const isEdge = (a, b) => edgeSet.has(`${a}-${b}`) || edgeSet.has(`${b}-${a}`);

let segmentCount = 0;
let unmatched = 0;
const output = passages
  .map(({ segments, ...building }) => {
    const edges = [];
    for (const [a, b] of segments) {
      segmentCount += 1;
      const [i, j] = [toNode(a), toNode(b)];
      if (i !== undefined && j !== undefined && isEdge(i, j)) edges.push(i, j);
      else unmatched += 1;
    }
    return { ...building, edges };
  })
  .filter(({ edges }) => edges.length > 0)
  .sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id);

await writeFile(
  OUTPUT,
  `${JSON.stringify(
    {
      source: 'OpenStreetMap via Overpass API (overpass-api.de)',
      licence: 'ODbL 1.0, © OpenStreetMap contributors',
      osmTimestamp: footprints.osm3s?.timestamp_osm_base,
      // The node indices in `edges` refer to this walking-network.json snapshot.
      networkTimestamp: network.osmTimestamp,
      minInside: MIN_INSIDE,
      buildings: output,
    },
    null,
    1,
  )}\n`,
);
console.warn(
  [
    `Walkable ways: ${ways.length}; buildings: ${buildings.length} (OSM data of ${footprints.osm3s?.timestamp_osm_base})`,
    `Buildings passed through: ${passages.length} (${segmentCount} segments); ` +
      `${output.length} matched to the network snapshot of ${network.osmTimestamp}, ` +
      `${unmatched} segments not in the snapshot`,
    `Download ${Math.round(downloaded - started)} ms, overlay ${Math.round(overlaid - downloaded)} ms`,
    `Wrote ${fileURLToPath(OUTPUT)}`,
  ].join('\n'),
);
