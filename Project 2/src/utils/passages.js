/**
 * Building passages: where the walking network goes *through* a building (OSM
 * footways mapped through shopping centres, station halls, arcades and building
 * passages). scripts/fetch-passages.js finds them once with a segment–polygon
 * overlay and writes public/data/building-passages.json; the app only looks up
 * which buildings a route uses.
 *
 * @typedef {{type: 'way' | 'relation', id: number, name?: string, building: string}} PassageBuilding
 *   An OSM building; type/id match `elementType`/`elementId` in Cesium OSM Buildings.
 * @typedef {PassageBuilding & {rings: number[][][]}} BuildingPolygon
 *   rings: closed WGS84 [lon, lat] rings (outer and inner), read with the even–odd rule.
 */

/** Mean Earth radius in metres (IUGG). Only used for a local planar frame. */
const EARTH_RADIUS = 6371008.8;
/** Building values that are not walk-through buildings: canopies and "no". */
const SKIPPED_BUILDINGS = new Set(['roof', 'no']);
/** Grid cell size of the building index, in degrees (≈ 220 m north–south). */
const CELL = 0.002;

/**
 * Should this walkable way be tested against buildings? Ways in tunnels pass under
 * a footprint and bridges over it, so neither walks through the building.
 * `tunnel=building_passage` is the OSM tag for a passage through a building and is kept.
 * @param {Record<string, string>} [tags] - OSM tags.
 * @returns {boolean}
 */
export function canPassThrough(tags = {}) {
  if (['yes', 'culvert', 'flooded'].includes(tags.tunnel)) return false;
  return tags.bridge === undefined || tags.bridge === 'no';
}

/**
 * Turn Overpass `out geom` building elements (ways and multipolygon relations)
 * into polygons. Relation members that are split into several ways are joined into
 * closed rings; rings that cannot be closed are dropped.
 * @param {Array<{type: string, id: number, tags?: Record<string, string>,
 *   geometry?: Array<{lat: number, lon: number}>,
 *   members?: Array<{type: string, geometry?: Array<{lat: number, lon: number}>}>}>} elements
 * @returns {BuildingPolygon[]}
 */
export function toBuildingPolygons(elements) {
  const toLine = (geometry = []) => geometry.map(({ lon, lat }) => [lon, lat]);
  const polygons = [];
  for (const { type, id, tags = {}, geometry, members } of elements) {
    if (!tags.building || SKIPPED_BUILDINGS.has(tags.building)) continue;
    const lines =
      type === 'way'
        ? [toLine(geometry)]
        : (members ?? []).filter((m) => m.type === 'way').map((m) => toLine(m.geometry));
    const rings = assembleRings(lines.filter((line) => line.length >= 2));
    if (rings.length === 0) continue;
    polygons.push({
      type,
      id,
      ...(tags.name && { name: tags.name }),
      building: tags.building,
      rings,
    });
  }
  return polygons;
}

const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];
const isClosed = (line) => line.length >= 4 && samePoint(line[0], line.at(-1));

/** Join open lines end to end into closed rings. */
function assembleRings(lines) {
  const rings = lines.filter(isClosed);
  const open = lines.filter((line) => !isClosed(line));
  while (open.length > 0) {
    let ring = open.pop();
    let extended = true;
    while (!isClosed(ring) && extended) {
      extended = false;
      const end = ring.at(-1);
      const k = open.findIndex((line) => samePoint(line[0], end) || samePoint(line.at(-1), end));
      if (k !== -1) {
        const [line] = open.splice(k, 1);
        const next = samePoint(line[0], end) ? line : [...line].reverse();
        ring = ring.concat(next.slice(1));
        extended = true;
      }
    }
    if (isClosed(ring)) rings.push(ring);
  }
  return rings;
}

/**
 * Local planar frame (metres) around a reference latitude: equirectangular on a
 * sphere. Within a building (< ~500 m) its distance error is far below the
 * accuracy of OSM footprints (~1 m).
 * @param {number} lon0 - WGS84 degrees.
 * @param {number} lat0 - WGS84 degrees.
 * @returns {([lon, lat]: number[]) => number[]} WGS84 [lon, lat] → [x, y] metres.
 */
export function localFrame(lon0, lat0) {
  const k = (Math.PI / 180) * EARTH_RADIUS;
  const kx = k * Math.cos((lat0 * Math.PI) / 180);
  return ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * k];
}

/** Even–odd point-in-polygon test over all rings (holes are outside). */
function contains(rings, [x, y]) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Parameter t ∈ [0, 1] along p→q where it crosses segment a→b, or undefined. */
function crossing(p, q, a, b) {
  const rx = q[0] - p[0];
  const ry = q[1] - p[1];
  const sx = b[0] - a[0];
  const sy = b[1] - a[1];
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return undefined; // parallel (or collinear): no single crossing
  const t = ((a[0] - p[0]) * sy - (a[1] - p[1]) * sx) / denominator;
  const u = ((a[0] - p[0]) * ry - (a[1] - p[1]) * rx) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : undefined;
}

/**
 * Length of the part of segment p→q that lies inside a polygon (segment–polygon
 * overlay). The segment is cut where it crosses a ring; each piece is inside or
 * outside as a whole, decided by testing its midpoint.
 * @param {number[]} p - [x, y] metres (planar).
 * @param {number[]} q - [x, y] metres (planar).
 * @param {number[][][]} rings - planar rings, read with the even–odd rule.
 * @returns {number} metres.
 */
export function insideLength(p, q, rings) {
  const cuts = [0, 1];
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i += 1) {
      const t = crossing(p, q, ring[i - 1], ring[i]);
      if (t !== undefined) cuts.push(t);
    }
  }
  cuts.sort((a, b) => a - b);
  const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
  let inside = 0;
  for (let k = 1; k < cuts.length; k += 1) {
    const t = (cuts[k - 1] + cuts[k]) / 2;
    const mid = [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
    if (contains(rings, mid)) inside += (cuts[k] - cuts[k - 1]) * length;
  }
  return inside;
}

/** Grid index of building bounding boxes (degrees), for candidate lookup. */
function buildIndex(buildings) {
  const cells = new Map();
  const cellOf = (lon, lat) => [Math.floor(lon / CELL), Math.floor(lat / CELL)];
  buildings.forEach((building, b) => {
    const points = building.rings.flat();
    const [x0, y0] = cellOf(
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
    );
    const [x1, y1] = cellOf(
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])),
    );
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        const key = `${x},${y}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(b);
      }
    }
  });
  return (a, b) => {
    const [x0, y0] = cellOf(Math.min(a[0], b[0]), Math.min(a[1], b[1]));
    const [x1, y1] = cellOf(Math.max(a[0], b[0]), Math.max(a[1], b[1]));
    const found = new Set();
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) for (const i of cells.get(`${x},${y}`) ?? []) found.add(i);
    }
    return found;
  };
}

/**
 * Find the buildings that walkable ways pass through. A building counts for a
 * way if at least `minInside` metres of the way lie inside its footprint; this
 * drops footways that only graze a wall because of mapping inaccuracy.
 * @param {Array<{tags?: Record<string, string>, coordinates: number[][]}>} ways -
 *   walkable OSM ways, WGS84 [lon, lat] vertices.
 * @param {BuildingPolygon[]} buildings
 * @param {{minInside: number}} options - metres.
 * @returns {Array<PassageBuilding & {segments: number[][][]}>} each building with
 *   the way segments (pairs of WGS84 [lon, lat]) that run inside it.
 */
export function findPassages(ways, buildings, { minInside }) {
  const candidates = buildIndex(buildings);
  const found = new Map(); // building index → segments
  for (const { tags, coordinates } of ways) {
    if (!canPassThrough(tags)) continue;
    const perBuilding = new Map(); // building index → {length, segments}
    for (let k = 1; k < coordinates.length; k += 1) {
      const a = coordinates[k - 1];
      const b = coordinates[k];
      for (const i of candidates(a, b)) {
        const toPlane = localFrame(a[0], a[1]);
        const rings = buildings[i].rings.map((ring) => ring.map(toPlane));
        const length = insideLength(toPlane(a), toPlane(b), rings);
        if (length === 0) continue;
        const entry = perBuilding.get(i) ?? { length: 0, segments: [] };
        entry.length += length;
        entry.segments.push([a, b]);
        perBuilding.set(i, entry);
      }
    }
    for (const [i, { length, segments }] of perBuilding) {
      if (length >= minInside) found.set(i, [...(found.get(i) ?? []), ...segments]);
    }
  }
  return [...found].map(([i, segments]) => {
    const { type, id, name, building } = buildings[i];
    return { type, id, ...(name && { name }), building, segments };
  });
}

/** Order-independent key of the undirected edge between two node indices. */
const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/**
 * Index the passage file for route lookups.
 * @param {{buildings: Array<PassageBuilding & {edges: number[]}>}} passages -
 *   building-passages.json; edges: flat pairs of network node indices [a, b, a, b, …].
 * @returns {Map<string, PassageBuilding[]>} edge key → buildings (usually one; a
 *   segment can run through two adjoining buildings).
 */
export function toPassageIndex({ buildings }) {
  const index = new Map();
  for (const { edges, ...building } of buildings) {
    for (let k = 0; k < edges.length; k += 2) {
      const key = edgeKey(edges[k], edges[k + 1]);
      index.set(key, [...(index.get(key) ?? []), building]);
    }
  }
  return index;
}

/**
 * Index the passage file, but only if it was made for this walking-network file:
 * its edges are node indices, which change whenever the network is regenerated.
 * @param {{osmTimestamp?: string}} network - walking-network.json.
 * @param {{networkTimestamp?: string, buildings: Array<PassageBuilding & {edges: number[]}>} | undefined} passages
 * @returns {Map<string, PassageBuilding[]> | undefined} undefined if missing or stale.
 */
export function passageIndexFor(network, passages) {
  if (!passages) return undefined;
  if (passages.networkTimestamp !== network.osmTimestamp) {
    console.warn(
      `Building passages were made for the network of ${passages.networkTimestamp}, ` +
        `not ${network.osmTimestamp}; run npm run data:passages. Passages are ignored.`,
    );
    return undefined;
  }
  return toPassageIndex(passages);
}

/**
 * The buildings a route passes through, in route order, each once.
 * @param {number[]} nodes - network node indices along the route.
 * @param {Map<string, PassageBuilding[]>} index - from toPassageIndex.
 * @returns {PassageBuilding[]}
 */
export function buildingsOnPath(nodes, index) {
  const buildings = new Set();
  for (let k = 1; k < nodes.length; k += 1) {
    for (const building of index.get(edgeKey(nodes[k - 1], nodes[k])) ?? []) {
      buildings.add(building);
    }
  }
  return [...buildings];
}
