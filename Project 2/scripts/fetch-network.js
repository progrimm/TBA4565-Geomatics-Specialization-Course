/**
 * Download the walkable OpenStreetMap network (roads, footways, paths, steps)
 * around the Trondheim shelters from the Overpass API and write it in compact
 * form to public/data/walking-network.json. Licence: ODbL, © OpenStreetMap contributors.
 * Run with: npm run data:network
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { toWalkingNetwork } from '../src/utils/osmNetwork.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SHELTERS = new URL('../public/data/shelters.geojson', import.meta.url);
const OUTPUT = new URL('../public/data/walking-network.json', import.meta.url);
// Margin around the shelters' bounding box, in degrees (WGS84). ≈ 1.1 km north–south
// and ≈ 1 km east–west at 63.4°N, so routes may leave the box a little.
const MARGIN = { lat: 0.01, lon: 0.02 };
// OSM highway types a pedestrian can use. Motorways and trunk roads are excluded.
const HIGHWAYS = [
  'footway',
  'path',
  'pedestrian',
  'steps',
  'living_street',
  'residential',
  'service',
  'unclassified',
  'road',
  'track',
  'cycleway',
  'tertiary',
  'tertiary_link',
  'secondary',
  'secondary_link',
  'primary',
  'primary_link',
  'trunk_link',
];

const shelters = JSON.parse(await readFile(SHELTERS, 'utf8')).features.map(
  (feature) => feature.geometry.coordinates,
);
const bbox = {
  south: Math.min(...shelters.map(([, lat]) => lat)) - MARGIN.lat,
  west: Math.min(...shelters.map(([lon]) => lon)) - MARGIN.lon,
  north: Math.max(...shelters.map(([, lat]) => lat)) + MARGIN.lat,
  east: Math.max(...shelters.map(([lon]) => lon)) + MARGIN.lon,
};
const box = [bbox.south, bbox.west, bbox.north, bbox.east].map((v) => v.toFixed(4)).join(',');

// Ways where walking is not explicitly forbidden, plus all their nodes.
const query = `[out:json][timeout:180];
way["highway"~"^(${HIGHWAYS.join('|')})$"]["foot"!~"^(no|private)$"]["access"!~"^(no|private)$"](${box});
(._;>;);
out skel qt;`;

const response = await fetch(OVERPASS_URL, {
  method: 'POST',
  body: new URLSearchParams({ data: query }),
  headers: { 'User-Agent': 'trondheim-3d (NTNU TBA4565 student project)' },
});
if (!response.ok) {
  throw new Error(`Overpass request failed: ${response.status} ${response.statusText}`);
}

const overpass = await response.json();
const network = toWalkingNetwork(overpass);
if (network.ways.length === 0) {
  throw new Error('Overpass returned no ways; refusing to overwrite the dataset.');
}

const output = {
  source: 'OpenStreetMap via Overpass API (overpass-api.de)',
  licence: 'ODbL 1.0, © OpenStreetMap contributors',
  osmTimestamp: overpass.osm3s?.timestamp_osm_base,
  bbox,
  highways: HIGHWAYS,
  ...network,
};
// No indentation: the file is large and read by code, not people.
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`);
console.warn(
  `Wrote ${network.nodes.length / 2} nodes and ${network.ways.length} ways ` +
    `(OSM data of ${output.osmTimestamp}) to ${fileURLToPath(OUTPUT)}`,
);
