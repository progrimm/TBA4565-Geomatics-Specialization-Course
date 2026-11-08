/**
 * Content of the "How it works" panel (components/About.jsx): the question, the data,
 * the GIS concepts behind each step, the key results and the limitations. Kept as data
 * so tests can check that every source has a licence and every concept a reference.
 * Dates and results are not written here: they are read from the data files at run time.
 */

/** The question the app answers. */
export const QUESTION =
  'Where is the nearest public shelter on foot from a point in Trondheim, and how long is the walk, uphill and downhill? Across the city: how many residents live within walking distance of a shelter, and how many residents are there per shelter place?';

/**
 * @typedef {{name: string, url: string}} Link
 * @typedef {{name: string, provider: string, format: string, crs: string,
 *   date?: 'sheltersFetched' | 'networkTimestamp' | 'passagesTimestamp' | 'geoidFetched' |
 *   'terrainChecked' | 'coverageFetched' | 'heightsFetched', dateLabel?: string,
 *   use: string, licence: Link, source: Link}} DataSource
 *   date: key into the run-time dates (see useAboutFacts); omitted for streamed services.
 */

/** @type {DataSource[]} */
export const DATA_SOURCES = [
  {
    name: 'Public shelters (Tilfluktsrom – offentlige)',
    provider: 'DSB (Norwegian Directorate for Civil Protection)',
    format: 'OGC WFS 2.0, GML, layer_340 → GeoJSON',
    crs: 'EUREF89 / UTM 32N (EPSG:25832) → WGS84 lon/lat',
    date: 'sheltersFetched',
    dateLabel: 'fetched',
    use: 'Shelter positions, numbers, addresses and capacities.',
    licence: { name: 'NLOD 2.0', url: 'https://data.norge.no/nlod/en/2.0' },
    source: {
      name: 'DSB WFS',
      url: 'https://ogc.dsb.no/wfs.ashx?service=WFS&request=GetCapabilities',
    },
  },
  {
    name: 'Walking network',
    provider: 'OpenStreetMap contributors, via the Overpass API',
    format: 'OSM ways with a walkable highway tag → compact JSON graph',
    crs: 'WGS84 lon/lat (EPSG:4326)',
    date: 'networkTimestamp',
    dateLabel: 'OSM data of',
    use: 'The graph that routes are computed on.',
    licence: { name: 'ODbL 1.0', url: 'https://www.openstreetmap.org/copyright' },
    source: { name: 'Overpass API', url: 'https://wiki.openstreetmap.org/wiki/Overpass_API' },
  },
  {
    name: 'Building footprints',
    provider: 'OpenStreetMap contributors, via the Overpass API',
    format: 'OSM building ways and multipolygons → building passages JSON',
    crs: 'WGS84 lon/lat (EPSG:4326)',
    date: 'passagesTimestamp',
    dateLabel: 'OSM data of',
    use: 'Finding the buildings a route passes through.',
    licence: { name: 'ODbL 1.0', url: 'https://www.openstreetmap.org/copyright' },
    source: { name: 'Overpass API', url: 'https://wiki.openstreetmap.org/wiki/Overpass_API' },
  },
  {
    name: 'Population on a 250 m grid (Befolkning på rutenett 250 m), 2026',
    provider: 'Statistics Norway (SSB)',
    format: 'OGC API Features, 250 m square cells with residents',
    crs: 'EUREF89 / UTM 33N (SSB: EPSG:32633) → WGS84 lon/lat',
    date: 'coverageFetched',
    dateLabel: 'downloaded',
    use: 'Where people live: the coverage and capacity analysis.',
    licence: { name: 'NLOD', url: 'https://data.norge.no/nlod/no/1.0' },
    source: {
      name: 'SSB OGC API',
      url: 'https://kart.ssb.no/api/ogc/v1/befolkning_paa_rutenett_ogc_api/collections/befolkning_250m_2026',
    },
  },
  {
    name: 'Height reference model NN2000:2025 (HREF2025A)',
    provider: 'Kartverket',
    format: 'GeoTIFF lattice, 0.02° × 0.04°, cut to the study area',
    crs: 'EUREF89 lon/lat; N = NN2000 above the GRS80 ellipsoid',
    date: 'geoidFetched',
    dateLabel: 'downloaded',
    use: 'Converting between NN2000 and ellipsoidal heights (h = H + N).',
    licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    source: {
      name: 'Geonorge',
      url: 'https://kartkatalog.geonorge.no/metadata/uuid/384ce432-8da7-4cfa-9afa-140d2b6c29d3',
    },
  },
  {
    name: 'National terrain model (DTM), 5 m',
    provider: 'Kartverket, Nasjonal høydemodell via WCS',
    format: 'OGC WCS 1.0.0 GeoTIFF tiles, resampled from 1 m to 5 m',
    crs: 'EUREF89 / UTM 32N (EPSG:25832), NN2000 heights',
    date: 'heightsFetched',
    dateLabel: 'downloaded',
    use: 'The height of every network node, for walking times on slopes.',
    licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    source: {
      name: 'DTM WCS',
      url: 'https://kartkatalog.geonorge.no/metadata/uuid/05821c51-2f5b-411f-9098-924d13dbea9a',
    },
  },
  {
    name: 'Terrain model DTM 1',
    provider: 'Kartverket, via the height API',
    format: 'Point heights from the 1 m terrain model',
    crs: 'NN2000 heights',
    date: 'terrainChecked',
    dateLabel: 'queried',
    use: 'Ground heights of the camera targets, and the reference for checking Cesium World Terrain.',
    licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    source: { name: 'Height API', url: 'https://ws.geonorge.no/hoydedata/v1/' },
  },
  {
    name: 'Cesium OSM Buildings',
    provider: 'Cesium, from OpenStreetMap',
    format: '3D Tiles, streamed (ion asset 96188)',
    crs: 'ECEF (EPSG:4978)',
    use: 'The 3D buildings, and the building highlighted on a route.',
    licence: { name: 'ODbL 1.0', url: 'https://www.openstreetmap.org/copyright' },
    source: {
      name: 'Cesium OSM Buildings',
      url: 'https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/',
    },
  },
  {
    name: 'Cesium World Terrain',
    provider: 'Cesium',
    format: 'Quantized-mesh terrain tiles, streamed (ion asset 1)',
    crs: 'Heights above the WGS84 ellipsoid',
    use: 'The ground surface: the 3D view and the position of a click.',
    licence: { name: 'Cesium ion terms', url: 'https://cesium.com/legal/terms-of-service/' },
    source: {
      name: 'Cesium World Terrain',
      url: 'https://cesium.com/platform/cesium-ion/content/cesium-world-terrain/',
    },
  },
];

/**
 * The GIS concepts behind the app, in the order a click uses them.
 * @type {{title: string, text: string, link: Link}[]}
 */
export const CONCEPTS = [
  {
    title: 'Coordinate reference systems',
    text: 'DSB publishes the shelters in EUREF89 / UTM zone 32N (EPSG:25832): projected coordinates in metres. A script converts them once to WGS84 longitude and latitude with proj4, the axis order GeoJSON requires. EUREF89 and WGS84 differ by less than a metre here, so no datum shift is applied.',
    link: { name: 'EPSG:25832', url: 'https://epsg.io/25832' },
  },
  {
    title: 'Ellipsoidal and NN2000 heights',
    text: 'Cesium measures height above the WGS84 ellipsoid (h). Norwegian maps give NN2000 heights (H), measured from a reference surface close to mean sea level. They differ by the geoid height N: h = H + N. Kartverket’s model gives N = 39.0–39.9 m across the study area; the app interpolates it bilinearly, which matches Kartverket’s transformation service to within 1 mm. It is used for the camera targets and the clicked point’s height.',
    link: {
      name: 'Kartverket: height reference model',
      url: 'https://www.kartverket.no/til-lands/posisjon/href-hoydereferansemodell',
    },
  },
  {
    title: 'Earth-centred and local frames',
    text: 'Cesium stores positions as Earth-centred, Earth-fixed (ECEF) x, y, z. Each camera view is built in the landmark’s local east-north-up frame (heading, pitch, distance) and converted to ECEF, so the landmark lands in the centre of the screen.',
    link: {
      name: 'Transforms.eastNorthUpToFixedFrame',
      url: 'https://cesium.com/learn/cesiumjs/ref-doc/Transforms.html#.eastNorthUpToFixedFrame',
    },
  },
  {
    title: 'Picking the ground',
    text: 'A click is a pixel. The app casts a ray from the camera through that pixel and intersects it with the terrain, which gives the longitude and latitude of the clicked ground point.',
    link: { name: 'Globe.pick', url: 'https://cesium.com/learn/cesiumjs/ref-doc/Globe.html#pick' },
  },
  {
    title: 'Geodesic distance',
    text: 'Straight-line distances are measured along the WGS84 ellipsoid (Vincenty’s method), not on a flat map. The tests compare them with GeographicLib (Karney’s algorithm); they agree to within 0.5 mm.',
    link: {
      name: 'EllipsoidGeodesic',
      url: 'https://cesium.com/learn/cesiumjs/ref-doc/EllipsoidGeodesic.html',
    },
  },
  {
    title: 'Network graph and Dijkstra’s algorithm',
    text: 'Every OSM node of a walkable way is a vertex and every way segment an edge, weighted by its geodesic length. Dijkstra’s algorithm searches outwards from the click and stops at the first shelter it reaches: the nearest on foot, which is not always the nearest in a straight line.',
    link: { name: 'Dijkstra (1959)', url: 'https://doi.org/10.1007/BF01386390' },
  },
  {
    title: 'Walking time on slopes',
    text: 'Each network vertex gets its height from Kartverket’s terrain model, and each edge its walking time from Tobler’s hiking function: 6 km/h on a gentle 5 % downhill, 5.04 km/h on the flat, slower uphill and on steep downhills. The same street takes longer up than down, so the graph becomes directed, and the fastest shelter is not always the nearest.',
    link: { name: 'Tobler (1993)', url: 'https://escholarship.org/uc/item/05r820mz' },
  },
  {
    title: 'Snapping and the 100 m rule',
    text: 'The click and each shelter are joined to their nearest network vertex by a straight connector. If the click’s connector is longer than 100 m (the fjord, a large field, outside the network), the app refuses it instead of drawing a long straight line.',
    link: {
      name: 'README: out of range',
      url: 'https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/tree/main/Project%202#out-of-range',
    },
  },
  {
    title: 'Service areas from one search',
    text: 'For the whole city, one Dijkstra search starts from all shelters at once. Every network vertex is reached first from its nearest shelter, which splits the network into service areas (a network Voronoi diagram) and gives each vertex its walking distance in a single pass, instead of one search per point.',
    link: {
      name: 'Erwig (2000), graph Voronoi diagrams',
      url: 'https://doi.org/10.1002/1097-0037(200010)36:3%3C156::AID-NET2%3E3.0.CO;2-L',
    },
  },
  {
    title: 'Population on a grid and its limits',
    text: 'SSB counts registered residents in 250 m squares. Each square is given the walk from its centre, so everyone in it gets the same distance. Results depend on the cell size and position (the modifiable areal unit problem), and the grid shows where people live, not where they are during the day.',
    link: {
      name: 'SSB: population on grids',
      url: 'https://kartkatalog.geonorge.no/metadata/uuid/0c0ad0ce-55e8-4d73-9c12-0eb0e2454acb',
    },
  },
  {
    title: 'Overlay: routes through buildings',
    text: 'Some footways run through buildings (passages, shopping centres, stations). A script cuts every way segment at the building outlines and tests each piece with an even–odd point-in-polygon test; at least 5 m inside counts. Those buildings are coloured with a 3D Tiles style when a route uses them.',
    link: {
      name: '3D Tiles styling',
      url: 'https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling',
    },
  },
  {
    title: '3D Tiles and level of detail',
    text: 'The buildings are split into tiles at several levels of detail. Cesium loads a more detailed tile only when the coarser one would be off by more than 16 pixels on screen (the maximum screen-space error), so distant areas cost little.',
    link: {
      name: 'maximumScreenSpaceError',
      url: 'https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html#maximumScreenSpaceError',
    },
  },
];

/** Short versions of the limitations in the README. */
export const LIMITATIONS = [
  'The network is an OpenStreetMap snapshot: missing or wrongly tagged paths change the result. Stairs, barriers and opening hours are not considered.',
  'Walking times use Tobler’s average hiker on the terrain under the path, with heights interpolated across bridges and tunnels; stairs, crowds, age and fitness are not modelled.',
  'Snapping uses the nearest vertex, not the nearest point on a street, and the connectors are straight lines.',
  'The network is a snapshot from 2026-10-27. An independent router on newer OpenStreetMap data finds walks of about the same length for most points, but not for all (see the route check).',
  'Cesium World Terrain is much coarser than Kartverket’s 1 m terrain model (see the terrain check), so a clicked ground height is approximate, and so is how the 3D view drapes routes.',
  'The routes cover the shelters’ area plus about 1 km. Clicks outside it are refused, and the coverage analysis only counts residents inside it.',
  'Coverage uses where people live (registered residents in 250 m cells), not where they are during the day, and gives everyone in a cell the walk from its centre.',
];

const percent = (share) => `${(share * 100).toFixed(1)} %`;
const integer = new Intl.NumberFormat('en-GB');

/**
 * Key results as label/value rows, from scripts/analyse-grid.js's summary file.
 * @param {object} summary - public/data/analysis-summary.json.
 * @returns {{label: string, value: string}[]}
 */
export function keyResults(summary) {
  const { grid, routed, refusedFar, refusedUnreachable, differentShelter, detourRatio } = summary;
  return [
    {
      label: 'Test points',
      value: `${grid.size} × ${grid.size} grid over the shelters’ area: ${integer.format(routed)} routed, ${refusedFar} too far from a path, ${refusedUnreachable} with no path to a shelter`,
    },
    {
      label: 'Walk ÷ straight line',
      value: `median ${detourRatio.median.toFixed(2)}, 90th percentile ${detourRatio.p90.toFixed(2)}`,
    },
    {
      label: 'Different shelter',
      value: `${percent(differentShelter.share)} of routed points (${differentShelter.count}): the nearest on foot is not the nearest in a straight line`,
    },
    {
      label: 'Through a building',
      value: `${percent(summary.throughBuildings.share)} of routes (${summary.throughBuildings.count})`,
    },
    ...(summary.coverage ? coverageRows(summary.coverage) : []),
    ...(summary.walkingTime ? walkingTimeRows(summary.walkingTime, summary.coverage) : []),
    ...(summary.routeValidation ? [routeRow(summary.routeValidation)] : []),
    ...(summary.terrainCheck ? [terrainRow(summary.terrainCheck)] : []),
  ];
}

/** The coverage analysis (scripts/analyse-coverage.js) as result rows. */
function coverageRows({ residents, places, within, catchments }) {
  // From the counts, not the rounded ratio in the file (34.65 would print as 34.6).
  const residentsPerPlace = residents / places;
  const shares = within
    .map(
      ({ metres, share }) =>
        `${percent(share)} within ${metres < 1000 ? `${metres} m` : `${metres / 1000} km`}`,
    )
    .join(', ');
  const most = catchments[0];
  const least = catchments.at(-1);
  return [
    {
      label: 'Residents covered',
      value: `Of ${integer.format(residents)} residents in the study area (SSB 2026): ${shares} on foot`,
    },
    {
      label: 'Capacity',
      value: `${residentsPerPlace.toFixed(1)} residents per shelter place; by catchment from ${least.residentsPerPlace.toFixed(1)} (no. ${least.romnr}) to ${most.residentsPerPlace.toFixed(1)} (no. ${most.romnr})`,
    },
  ];
}

/** The walking-time results (Tobler, analyse-grid.js and analyse-coverage.js) as rows. */
function walkingTimeRows({ fastestDifferentFromShortest, shortestWalkSlopeFactor }, coverage) {
  const rows = [
    {
      label: 'Slopes',
      value: `make the shortest walk ${percent(shortestWalkSlopeFactor.median - 1)} slower than on the flat (median; 90th percentile ${percent(shortestWalkSlopeFactor.p90 - 1)}); the fastest shelter differs from the nearest at ${percent(fastestDifferentFromShortest.share)} of the test points`,
    },
  ];
  const timed = coverage?.walkingTime;
  if (timed) {
    rows.push({
      label: 'Residents by time',
      value: timed.withinMinutes
        .map(({ minutes, share }) => `${percent(share)} within ${minutes} min`)
        .join(', '),
    });
  }
  return rows;
}

/** The external route check (scripts/validate-routes.js) as a result row. */
function routeRow({ points, medianAbsDifferencePercent, p90AbsDifferencePercent, within5Percent }) {
  return {
    label: 'Route check',
    value: `against OSRM (foot, FOSSGIS) at ${points} test points: median difference ${medianAbsDifferencePercent.toFixed(1)} %, 90th percentile ${p90AbsDifferencePercent.toFixed(1)} %; ${percent(within5Percent)} within 5 %`,
  };
}

/** The terrain check (scripts/check-terrain.js) as a result row. */
function terrainRow({ points, meanDifferenceMetres, rmseMetres, maxAbsDifferenceMetres }) {
  const metres = (value) => `${value.toFixed(1)} m`;
  return {
    label: 'Terrain check',
    value: `Cesium World Terrain − Kartverket DTM 1 at ${points} points on the network: mean ${metres(meanDifferenceMetres)}, RMSE ${metres(rmseMetres)}, largest ${metres(maxAbsDifferenceMetres)}`,
  };
}

/**
 * A date from a data file as YYYY-MM-DD (UTC), or undefined.
 * @param {string | undefined} value - a date or an ISO timestamp.
 */
export const formatDate = (value) =>
  /^\d{4}-\d{2}-\d{2}/.test(value ?? '') ? value.slice(0, 10) : undefined;
