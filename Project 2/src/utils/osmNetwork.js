/**
 * Convert OpenStreetMap ways (Overpass API JSON) into the compact walking-network
 * format stored in public/data/walking-network.json. Used by scripts/fetch-network.js.
 *
 * Format: node coordinates are integers in micro-degrees (1e-6°, ≈ 0.1 m) relative
 * to `origin`, flattened as [dLon0, dLat0, dLon1, dLat1, …]; each way is a list of
 * node indices. This roughly halves the file size compared with decimal degrees.
 */

/** Micro-degrees per degree. */
export const SCALE = 1e6;

/** OSM highway types a pedestrian can use. Motorways and trunk roads are excluded. */
export const WALKABLE_HIGHWAYS = [
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

/**
 * Overpass QL statement for the walkable ways in a bounding box: a walkable
 * highway type where walking is not explicitly forbidden. Shared by
 * scripts/fetch-network.js and scripts/fetch-passages.js so both use the same ways.
 * @param {string} box - "south,west,north,east" in WGS84 degrees.
 * @returns {string}
 */
export function walkableWaysQuery(box) {
  return `way["highway"~"^(${WALKABLE_HIGHWAYS.join('|')})$"]["foot"!~"^(no|private)$"]["access"!~"^(no|private)$"](${box});`;
}

/**
 * A WGS84 coordinate as an integer micro-degree offset from an origin, exactly as
 * stored in the walking-network file.
 * @param {number} value - degrees.
 * @param {number} base - origin, degrees.
 * @returns {number}
 */
export function toOffset(value, base) {
  // Offsets are >= 0; Math.max also turns a rounded -0 at the origin into 0.
  return Math.max(0, Math.round((value - base) * SCALE));
}

/**
 * @typedef {{origin: [number, number], scale: number, nodes: number[], ways: number[][]}} WalkingNetwork
 *   origin: WGS84 [lon, lat] in degrees.
 */

/**
 * @param {{elements: Array<{type: string, id: number, lat?: number, lon?: number, nodes?: number[]}>}} overpass
 *   Overpass JSON with ways and their nodes (`out skel` is enough).
 * @returns {WalkingNetwork}
 */
export function toWalkingNetwork(overpass) {
  const osmNodes = new Map();
  const osmWays = [];
  for (const element of overpass.elements) {
    if (element.type === 'node') osmNodes.set(element.id, element);
    else if (element.type === 'way') osmWays.push(element);
  }

  // Keep only nodes used by ways, in first-use order.
  const index = new Map();
  const used = [];
  const ways = osmWays
    .map((way) =>
      way.nodes
        .filter((id) => osmNodes.has(id))
        .map((id) => {
          if (!index.has(id)) {
            index.set(id, used.length);
            used.push(osmNodes.get(id));
          }
          return index.get(id);
        }),
    )
    .filter((way) => way.length >= 2);

  // South-west corner, rounded to whole micro-degrees.
  // (reduce, not Math.min(...): spreading 100k+ arguments can overflow the stack.)
  const min = (key) => used.reduce((value, node) => Math.min(value, node[key]), Infinity);
  const origin = [Math.round(min('lon') * SCALE) / SCALE, Math.round(min('lat') * SCALE) / SCALE];
  const nodes = used.flatMap(({ lon, lat }) => [
    toOffset(lon, origin[0]),
    toOffset(lat, origin[1]),
  ]);
  return { origin, scale: SCALE, nodes, ways };
}
