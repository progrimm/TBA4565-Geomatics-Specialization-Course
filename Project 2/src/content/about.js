/**
 * Content of the "How it works" panel (components/About.jsx): the question, the data,
 * the GIS concepts behind each step, the key results and the limitations. Kept as data
 * so tests can check that every source has a licence and every concept a reference.
 * Dates and results are not written here: they are read from the data files at run time.
 */

/** The question the app answers. */
export const QUESTION =
  'Where is the nearest public shelter on foot from a point in Trondheim, how far is the walk, and how much longer is it than a straight line?';

/**
 * @typedef {{name: string, url: string}} Link
 * @typedef {{name: string, provider: string, format: string, crs: string,
 *   date?: 'sheltersFetched' | 'networkTimestamp' | 'passagesTimestamp', dateLabel?: string,
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
    text: 'Cesium measures height above the WGS84 ellipsoid (h). Norwegian maps give height above the geoid in NN2000 (H). They differ by the geoid height N, h = H + N, which is about 40 m in Trondheim. The camera views use a constant 40 m, not a geoid model.',
    link: { name: 'NN2000 height (EPSG:5941)', url: 'https://epsg.io/5941' },
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
    title: 'Snapping and the 100 m rule',
    text: 'The click and each shelter are joined to their nearest network vertex by a straight connector. If the click’s connector is longer than 100 m (the fjord, a large field, outside the network), the app refuses it instead of drawing a long straight line.',
    link: {
      name: 'README: out of range',
      url: 'https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/tree/main/Project%202#out-of-range',
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
  'Distance, not time: slopes are ignored, so an uphill walk counts the same as a flat one.',
  'Snapping uses the nearest vertex, not the nearest point on a street, and the connectors are straight lines.',
  'Heights are ellipsoidal; the camera views use a constant geoid height of 40 m.',
  'The routes cover the shelters’ area plus about 1 km. Clicks outside it are refused.',
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
  ];
}

/**
 * A date from a data file as YYYY-MM-DD (UTC), or undefined.
 * @param {string | undefined} value - a date or an ISO timestamp.
 */
export const formatDate = (value) =>
  /^\d{4}-\d{2}-\d{2}/.test(value ?? '') ? value.slice(0, 10) : undefined;
