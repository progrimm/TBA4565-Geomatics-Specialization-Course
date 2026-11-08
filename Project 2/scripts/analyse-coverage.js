/**
 * Coverage and capacity: how far do Trondheim's residents live from a public shelter on
 * foot, and how many residents does each shelter's catchment hold per place?
 *
 * 1. Downloads Statistics Norway's population grid (250 m cells, 2026 edition) for the
 *    walking network's bounding box from SSB's OGC API Features service. The cells are
 *    squares in EUREF89 / UTM 33N; their corners and centres are converted to WGS84.
 * 2. Runs one multi-source Dijkstra from all shelters over the walking network, which
 *    gives every network node its distance to the nearest shelter and which shelter
 *    that is (the shelters' service areas).
 * 3. Gives each cell the walk from its centre: straight connector to the nearest network
 *    node + network distance + connector from the shelter's node to the shelter, the same
 *    walk a click on the cell centre gets (checked below against findNearestByWalking).
 *
 * Writes public/data/coverage.json (the map layer), results/coverage-catchments.csv and
 * the summary to public/data/analysis-summary.json (`coverage`).
 * Licence of the grid: NLOD, © Statistisk sentralbyrå. Run with: npm run analysis:coverage
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { COVERAGE, NEAREST } from '../src/config.js';
import { distanceClass, summarizeCoverage } from '../src/utils/coverage.js';
import { utm33ToWgs84 } from '../src/utils/crs.js';
import { geodesicDistance } from '../src/utils/nearest.js';
import {
  buildGraph,
  byTime,
  findNearestByWalking,
  multiSourceDijkstra,
  nearestNode,
  snapShelters,
  withHeights,
} from '../src/utils/network.js';
import { flatSeconds } from '../src/utils/walkingTime.js';

const COLLECTION = 'befolkning_250m_2026';
const API = `https://kart.ssb.no/api/ogc/v1/befolkning_paa_rutenett_ogc_api/collections/${COLLECTION}`;
const PAGE_SIZE = 1000; // the service's maximum
const THRESHOLDS = [500, 1000, 2000];
const MINUTE_THRESHOLDS = [10, 20, 30];
const CHECK_EVERY = 20; // compare every 20th cell with a single nearest-shelter search
const DATA = new URL('../public/data/', import.meta.url);
const readJson = (name) => JSON.parse(readFileSync(new URL(name, DATA), 'utf8'));
const round = (value, decimals) => Number(value.toFixed(decimals));

const network = readJson('walking-network.json');
const shelterFile = readJson('shelters.geojson');
const shelters = shelterFile.features.map(({ geometry, properties }) => ({
  longitude: geometry.coordinates[0],
  latitude: geometry.coordinates[1],
  ...properties,
}));

// 1. SSB grid cells intersecting the network's bounding box (bbox in CRS84 lon/lat).
const { west, south, east, north } = network.bbox;
const features = [];
let url = `${API}/items?bbox=${[west, south, east, north].join(',')}&limit=${PAGE_SIZE}`;
while (url) {
  const response = await fetch(url, { headers: { Accept: 'application/geo+json' } });
  if (!response.ok) throw new Error(`SSB API: HTTP ${response.status}`);
  const page = await response.json();
  features.push(...page.features);
  url = page.links?.find((link) => link.rel === 'next')?.href;
}
if (features.length === 0) throw new Error('SSB API returned no cells');
const crsName = features[0].geometry.crs?.properties?.name;
if (crsName !== 'EPSG:32633') throw new Error(`unexpected CRS ${crsName}`);

// 2. Service areas: one search from all shelters, by distance and by walking time
//    (Tobler on node heights; the cost is for walking towards the shelter).
const graph = withHeights(buildGraph(network), network, readJson('node-heights.json'));
if (!graph.heights) throw new Error('node-heights.json does not match the network');
const shelterNodes = snapShelters(graph, shelters);
const { distance, source } = multiSourceDijkstra(graph, shelterNodes.keys());
const timed = multiSourceDijkstra(graph, shelterNodes.keys(), byTime(graph));
const nodeLonLat = (node) => ({ longitude: graph.lon[node], latitude: graph.lat[node] });

// 3. Each cell: corners and centre in WGS84, and the walk from the centre.
const inside = ({ longitude, latitude }) =>
  longitude >= west && longitude <= east && latitude >= south && latitude <= north;
let outside = { cells: 0, residents: 0 };
const cells = [];
for (const { geometry, properties } of features) {
  // A square ring in UTM 33: four corners plus the closing point.
  const corners = geometry.coordinates[0][0].slice(0, 4);
  const centreUtm = [0, 1].map((axis) => corners.reduce((sum, c) => sum + c[axis], 0) / 4);
  const [cLon, cLat] = utm33ToWgs84(...centreUtm);
  const centre = { longitude: cLon, latitude: cLat };
  if (!inside(centre)) {
    outside = { cells: outside.cells + 1, residents: outside.residents + properties.pop_tot };
    continue;
  }
  const node = nearestNode(graph, centre);
  const connector = geodesicDistance(centre, nodeLonLat(node));
  const shelter = shelterNodes.get(source[node]);
  const walk = shelter
    ? connector + distance[node] + geodesicDistance(nodeLonLat(source[node]), shelter)
    : null;
  // The fastest walk; the straight connectors are walked at the flat-ground speed.
  const fastShelter = shelterNodes.get(timed.source[node]);
  const seconds = fastShelter
    ? flatSeconds(connector) +
      timed.distance[node] +
      flatSeconds(geodesicDistance(nodeLonLat(timed.source[node]), fastShelter))
    : null;
  cells.push({
    id: properties.ssbid250m,
    corners: corners.map(([x, y]) => utm33ToWgs84(x, y)),
    centre,
    population: properties.pop_tot,
    walk,
    romnr: shelter?.romnr ?? null,
    seconds,
    fastRomnr: fastShelter?.romnr ?? null,
    connector,
  });
}

// Check: the multi-source result equals the app's own single search from the cell centre.
let checked = 0;
for (let i = 0; i < cells.length; i += CHECK_EVERY) {
  const { centre, walk, romnr } = cells[i];
  const single = findNearestByWalking(centre, graph, shelterNodes);
  const same = single
    ? Math.abs(single.walk.distance - walk) < 1e-6 && single.shelter.romnr === romnr
    : walk === null;
  if (!same) throw new Error(`cell ${cells[i].id}: multi-source and single search differ`);
  const fast = findNearestByWalking(centre, graph, shelterNodes, { by: 'time' });
  const sameTime = fast
    ? Math.abs(fast.walk.seconds - cells[i].seconds) < 1e-6 &&
      fast.shelter.romnr === cells[i].fastRomnr
    : cells[i].seconds === null;
  if (!sameTime) throw new Error(`cell ${cells[i].id}: fastest walks differ`);
  checked += 1;
}

const summary = summarizeCoverage(cells, shelters, THRESHOLDS, NEAREST.maxConnector);
const classResidents = COVERAGE.classes.map((_, k) =>
  cells
    .filter((cell) => distanceClass(cell.walk, COVERAGE.classes) === k)
    .reduce((s, c) => s + c.population, 0),
);
const fetched = new Date().toISOString().slice(0, 10);

const coverage = {
  description:
    'SSB 250 m population cells with the walk from the cell centre to the nearest public shelter. Written by scripts/analyse-coverage.js.',
  source: `${API}/items`,
  dataset: 'Befolkning på rutenett 250 m (Statistisk sentralbyrå), 2026 edition',
  licence: 'NLOD, © Statistisk sentralbyrå',
  fetched,
  networkTimestamp: network.osmTimestamp,
  sheltersFetched: shelterFile.metadata?.fetched,
  cellFormat:
    '[corners: [lon, lat] × 4 (WGS84, from EUREF89 / UTM 33N), residents, shortest walk metres or null, its shelter romnr or null, fastest walk minutes or null, its shelter romnr or null]',
  cells: cells.map(({ corners, population, walk, romnr, seconds, fastRomnr }) => [
    corners.map(([lon, lat]) => [round(lon, 6), round(lat, 6)]),
    population,
    walk === null ? null : Math.round(walk),
    romnr,
    seconds === null ? null : round(seconds / 60, 1),
    fastRomnr,
  ]),
};
writeFileSync(new URL('coverage.json', DATA), `${JSON.stringify(coverage)}\n`);

mkdirSync('results', { recursive: true });
writeFileSync(
  'results/coverage-catchments.csv',
  [
    'romnr,adresse,places,residents,residents_per_place',
    ...summary.catchments.map((c) =>
      [c.romnr, `"${c.adresse}"`, c.places, c.residents, c.residentsPerPlace.toFixed(2)].join(','),
    ),
  ].join('\n') + '\n',
);

const coverageSummary = {
  date: fetched,
  dataset: coverage.dataset,
  cells: cells.length,
  cellsOutsideNetworkBox: outside.cells,
  residentsOutsideNetworkBox: outside.residents,
  residents: summary.residents,
  places: summary.places,
  residentsPerPlace: round(summary.residentsPerPlace, 2),
  within: summary.within.map((w) => ({ ...w, share: round(w.share, 4) })),
  classes: COVERAGE.classes.map(({ label }, k) => ({ label, residents: classResidents[k] })),
  noRoute: summary.noRoute,
  farFromNetwork: summary.farFromNetwork,
  catchments: summary.catchments.map((c) => ({
    ...c,
    residentsPerPlace: round(c.residentsPerPlace, 2),
  })),
  checkedAgainstSingleSearch: checked,
  walkingTime: {
    method: "Tobler's hiking function on node heights (node-heights.json); connectors at 5.04 km/h",
    withinMinutes: MINUTE_THRESHOLDS.map((minutes) => {
      const count = cells
        .filter((cell) => cell.seconds !== null && cell.seconds <= minutes * 60)
        .reduce((s, c) => s + c.population, 0);
      return { minutes, residents: count, share: round(count / summary.residents, 4) };
    }),
    fastestShelterDiffers: {
      cells: cells.filter((cell) => cell.fastRomnr !== cell.romnr).length,
      residents: cells
        .filter((cell) => cell.fastRomnr !== cell.romnr)
        .reduce((s, c) => s + c.population, 0),
    },
  },
};
const summaryUrl = new URL('analysis-summary.json', DATA);
const previous = JSON.parse(readFileSync(summaryUrl, 'utf8'));
writeFileSync(
  summaryUrl,
  `${JSON.stringify({ ...previous, coverage: coverageSummary }, null, 2)}\n`,
);
console.warn(JSON.stringify(coverageSummary, null, 2));
