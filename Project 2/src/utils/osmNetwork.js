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
  // Offsets are >= 0; Math.max also turns a rounded -0 at the origin into 0.
  const offset = (value, base) => Math.max(0, Math.round((value - base) * SCALE));
  const nodes = used.flatMap(({ lon, lat }) => [offset(lon, origin[0]), offset(lat, origin[1])]);
  return { origin, scale: SCALE, nodes, ways };
}
