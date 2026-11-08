import { Cartographic, Ellipsoid, EllipsoidGeodesic } from 'cesium';
import { geodesicDistance } from './nearest.js';
import { flatSeconds, segmentSeconds } from './walkingTime.js';

/**
 * Walking-network analysis on the OpenStreetMap graph (see utils/osmNetwork.js
 * for the file format). Every OSM node is a graph node and every way segment an
 * undirected edge weighted by its geodesic length: pedestrians may walk both
 * ways along one-way streets.
 *
 * @typedef {{lon: Float64Array, lat: Float64Array, adjacency: number[][],
 *   heights?: Float64Array}} Graph
 *   lon/lat: WGS84 degrees per node. adjacency[i] = [neighbour, metres, neighbour, metres, …].
 *   heights: NN2000 metres per node (public/data/node-heights.json), if loaded.
 * @typedef {(from: number, to: number, metres: number) => number} EdgeCost
 *   Cost of walking the edge from `from` to `to` (in that direction), e.g. metres or
 *   seconds.
 * @typedef {{distance: number, networkDistance: number, toNetwork: number,
 *   seconds?: number, nodes: number[], coordinates: number[][]}} Walk
 *   distance: total metres (click → network → shelter); networkDistance: the part
 *   along the network; toNetwork: the straight connector from the click to the
 *   network; nodes: the network path as node indices; coordinates: WGS84 [lon, lat]
 *   from the click to the shelter.
 */

/**
 * Decode the walking network and build its graph.
 * @param {import('./osmNetwork.js').WalkingNetwork} network
 * @returns {Graph}
 */
export function buildGraph({ origin, scale, nodes, ways }) {
  const count = nodes.length / 2;
  const lon = new Float64Array(count);
  const lat = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    lon[i] = origin[0] + nodes[2 * i] / scale;
    lat[i] = origin[1] + nodes[2 * i + 1] / scale;
  }

  // One reused EllipsoidGeodesic: ~180k segments, so avoid allocating per segment.
  const geodesic = new EllipsoidGeodesic(undefined, undefined, Ellipsoid.WGS84);
  const start = new Cartographic();
  const end = new Cartographic();
  const adjacency = Array.from({ length: count }, () => []);
  for (const way of ways) {
    for (let k = 1; k < way.length; k += 1) {
      const a = way[k - 1];
      const b = way[k];
      if (a === b) continue;
      geodesic.setEndPoints(
        Cartographic.fromDegrees(lon[a], lat[a], 0, start),
        Cartographic.fromDegrees(lon[b], lat[b], 0, end),
      );
      const metres = geodesic.surfaceDistance;
      adjacency[a].push(b, metres);
      adjacency[b].push(a, metres);
    }
  }
  return { lon, lat, adjacency };
}

/**
 * Index of the graph node closest to a point (snapping). Uses a local planar
 * approximation (longitude scaled by cos(latitude)) for speed; exact enough to
 * rank nodes within a city.
 * @param {Graph} graph
 * @param {import('./nearest.js').LonLat} point
 * @returns {number} node index, or -1 if the graph is empty.
 */
export function nearestNode({ lon, lat }, { longitude, latitude }) {
  const kx = Math.cos((latitude * Math.PI) / 180);
  let best = -1;
  let bestSquared = Infinity;
  for (let i = 0; i < lon.length; i += 1) {
    const dx = (lon[i] - longitude) * kx;
    const dy = lat[i] - latitude;
    const squared = dx * dx + dy * dy;
    if (squared < bestSquared) {
      bestSquared = squared;
      best = i;
    }
  }
  return best;
}

/** Edge cost = length in metres: the shortest walk. */
export const byDistance = (_from, _to, metres) => metres;

/**
 * Edge cost = walking time in seconds from Tobler's hiking function, using the nodes'
 * heights: the fastest walk. Directed, because uphill is slower than downhill.
 * @param {Graph} graph - with heights.
 * @returns {EdgeCost}
 */
export const byTime =
  ({ heights }) =>
  (from, to, metres) =>
    segmentSeconds(metres, heights[to] - heights[from]);

/** Binary min-heap of [priority, node] pairs for Dijkstra. */
class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(priority, node) {
    const { items } = this;
    items.push([priority, node]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent][0] <= items[i][0]) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop() {
    const { items } = this;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && items[left][0] < items[smallest][0]) smallest = left;
        if (right < items.length && items[right][0] < items[smallest][0]) smallest = right;
        if (smallest === i) break;
        [items[smallest], items[i]] = [items[i], items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

/**
 * Dijkstra's shortest path from one node to the nearest of several target nodes.
 * Stops as soon as the first target is reached, so it is fast for nearby targets.
 * @param {Graph} graph
 * @param {number} start - node index.
 * @param {Set<number>} targets - node indices.
 * @param {EdgeCost} [cost] - default: metres.
 * @returns {{node: number, distance: number, path: number[]} | undefined}
 *   the reached target, the total cost (metres by default) and the node path
 *   (start … target); undefined if no target is connected to the start.
 */
export function shortestPathToAny({ adjacency }, start, targets, cost = byDistance) {
  const distance = new Float64Array(adjacency.length).fill(Infinity);
  const previous = new Int32Array(adjacency.length).fill(-1);
  const heap = new MinHeap();
  distance[start] = 0;
  heap.push(0, start);

  while (heap.size > 0) {
    const [d, node] = heap.pop();
    if (d > distance[node]) continue; // stale heap entry
    if (targets.has(node)) {
      const path = [node];
      while (previous[path.at(-1)] !== -1) path.push(previous[path.at(-1)]);
      return { node, distance: d, path: path.reverse() };
    }
    const edges = adjacency[node];
    for (let k = 0; k < edges.length; k += 2) {
      const next = edges[k];
      const candidate = d + cost(node, next, edges[k + 1]);
      if (candidate < distance[next]) {
        distance[next] = candidate;
        previous[next] = node;
        heap.push(candidate, next);
      }
    }
  }
  return undefined;
}

/**
 * Attach node heights to a graph, if they were made for this network snapshot (they are
 * listed by node index, which changes whenever the network is regenerated).
 * @param {Graph} graph
 * @param {{osmTimestamp?: string, nodes: number[]}} network - walking-network.json.
 * @param {{networkTimestamp?: string, heights: number[]} | undefined} file - node-heights.json
 *   (heights in decimetres).
 * @returns {Graph} the graph with `heights` in metres, or unchanged if the file is missing
 *   or made for another snapshot.
 */
export function withHeights(graph, network, file) {
  if (!file) return graph;
  if (file.networkTimestamp !== network.osmTimestamp || file.heights.length !== graph.lon.length) {
    console.warn(
      `Node heights were made for the network of ${file.networkTimestamp}, not ` +
        `${network.osmTimestamp}; run npm run data:heights. Walking times are not shown.`,
    );
    return graph;
  }
  return { ...graph, heights: Float64Array.from(file.heights, (dm) => dm / 10) };
}

/**
 * Multi-source Dijkstra: the network distance from every node to its nearest source,
 * in one search. All sources start at distance 0 and grow together, so each node is
 * reached first from its nearest source; labelling nodes by that source splits the
 * network into service areas (a network Voronoi diagram). Edges are undirected, so the
 * distance from a source to a node equals the distance from the node to the source.
 * @param {Graph} graph
 * @param {Iterable<number>} sources - node indices (e.g. the shelters' nodes).
 * @param {EdgeCost} [cost] - cost of walking an edge *towards* the source: the search runs
 *   outwards from the sources, so for directed costs (time) the walk is reversed. Default:
 *   metres, which are the same both ways.
 * @returns {{distance: Float64Array, source: Int32Array}} per node: the cost to the nearest
 *   source (Infinity if none is connected) and that source's node index (-1 if none).
 */
export function multiSourceDijkstra({ adjacency }, sources, cost = byDistance) {
  const distance = new Float64Array(adjacency.length).fill(Infinity);
  const source = new Int32Array(adjacency.length).fill(-1);
  const heap = new MinHeap();
  for (const node of sources) {
    distance[node] = 0;
    source[node] = node;
    heap.push(0, node);
  }
  while (heap.size > 0) {
    const [d, node] = heap.pop();
    if (d > distance[node]) continue; // stale heap entry
    const edges = adjacency[node];
    for (let k = 0; k < edges.length; k += 2) {
      const next = edges[k];
      // The walker goes next → node, towards the source.
      const candidate = d + cost(next, node, edges[k + 1]);
      if (candidate < distance[next]) {
        distance[next] = candidate;
        source[next] = source[node];
        heap.push(candidate, next);
      }
    }
  }
  return { distance, source };
}

/**
 * Snap every shelter to its nearest network node. Do this once per graph.
 * @param {Graph} graph
 * @param {import('./nearest.js').Shelter[]} shelters
 * @returns {Map<number, import('./nearest.js').Shelter>} node index → shelter.
 */
export function snapShelters(graph, shelters) {
  // If two shelters share a node, either is equally near by network; keep the first.
  const byNode = new Map();
  for (const shelter of shelters) {
    const node = nearestNode(graph, shelter);
    if (node !== -1 && !byNode.has(node)) byNode.set(node, shelter);
  }
  return byNode;
}

/** WGS84 degrees of a graph node. */
const nodeLonLat = ({ lon, lat }, i) => ({ longitude: lon[i], latitude: lat[i] });

/** Length in metres of the edge a → b (the shortest, if two ways join the same nodes). */
function edgeMetres({ adjacency }, a, b) {
  let best = Infinity;
  const edges = adjacency[a];
  for (let k = 0; k < edges.length; k += 2) if (edges[k] === b) best = Math.min(best, edges[k + 1]);
  return best;
}

/**
 * Walking time in seconds of a node path (Tobler, using the nodes' heights).
 * @param {Graph} graph - with heights.
 * @param {number[]} path - node indices.
 */
export function pathSeconds(graph, path) {
  const time = byTime(graph);
  let seconds = 0;
  for (let k = 1; k < path.length; k += 1) {
    seconds += time(path[k - 1], path[k], edgeMetres(graph, path[k - 1], path[k]));
  }
  return seconds;
}

/**
 * @typedef {{by?: 'distance' | 'time'}} WalkOptions
 *   by: what "nearest" means: the shortest walk (default) or the fastest one (needs
 *   graph.heights; falls back to distance without them).
 */

/**
 * The walk from a point that is already snapped to `start`.
 * @param {WalkOptions} options
 * @returns {{shelter: import('./nearest.js').Shelter, distance: number, walk: Walk} | undefined}
 */
function walkFrom(point, start, graph, shelterNodes, { by = 'distance' } = {}) {
  const cost = by === 'time' && graph.heights ? byTime(graph) : byDistance;
  const result = shortestPathToAny(graph, start, new Set(shelterNodes.keys()), cost);
  if (!result) return undefined;

  const shelter = shelterNodes.get(result.node);
  const toNetwork = geodesicDistance(point, nodeLonLat(graph, start));
  const fromNetwork = geodesicDistance(nodeLonLat(graph, result.node), shelter);
  let networkDistance = 0;
  for (let k = 1; k < result.path.length; k += 1) {
    networkDistance += edgeMetres(graph, result.path[k - 1], result.path[k]);
  }
  return {
    shelter,
    distance: geodesicDistance(point, shelter),
    walk: {
      distance: toNetwork + networkDistance + fromNetwork,
      networkDistance,
      toNetwork,
      // The straight connectors have no heights: walked at the flat-ground speed.
      seconds: graph.heights
        ? flatSeconds(toNetwork) + pathSeconds(graph, result.path) + flatSeconds(fromNetwork)
        : undefined,
      nodes: result.path,
      coordinates: [
        [point.longitude, point.latitude],
        ...result.path.map((i) => [graph.lon[i], graph.lat[i]]),
        [shelter.longitude, shelter.latitude],
      ],
    },
  };
}

/**
 * Find the shelter with the shortest (or fastest) walk from a point. The walk is: a
 * straight line from the point to its nearest network node, the best path along the
 * network, and a straight line from the shelter's network node to the shelter.
 * @param {import('./nearest.js').LonLat} point - WGS84 degrees.
 * @param {Graph} graph
 * @param {Map<number, import('./nearest.js').Shelter>} shelterNodes - from snapShelters.
 * @param {WalkOptions} [options]
 * @returns {{shelter: import('./nearest.js').Shelter, distance: number, walk: Walk} | undefined}
 *   distance: straight-line (geodesic) metres to the chosen shelter, for comparison;
 *   undefined if no shelter is reachable from the point's part of the network.
 */
export function findNearestByWalking(point, graph, shelterNodes, options) {
  const start = nearestNode(graph, point);
  return start === -1 ? undefined : walkFrom(point, start, graph, shelterNodes, options);
}

/**
 * Like findNearestByWalking, but refuses clicks the network cannot really serve:
 * a point further than `maxConnector` metres from the nearest network node (outside
 * the network's coverage, in the fjord, in a large field), or a point from whose
 * part of the network no shelter can be reached. Both would otherwise be answered
 * with a long straight line, which is not a walking route.
 * @param {import('./nearest.js').LonLat} point - WGS84 degrees.
 * @param {Graph} graph
 * @param {Map<number, import('./nearest.js').Shelter>} shelterNodes - from snapShelters.
 * @param {number} maxConnector - longest allowed straight connector, metres.
 * @param {WalkOptions} [options]
 * @returns {{nearest: NonNullable<ReturnType<typeof findNearestByWalking>>} |
 *   {outOfRange: {reason: 'far' | 'unreachable', connector?: number}}}
 *   connector: geodesic metres from the point to its nearest network node.
 */
export function findWalkInRange(point, graph, shelterNodes, maxConnector, options) {
  const start = nearestNode(graph, point);
  if (start === -1) return { outOfRange: { reason: 'unreachable' } };
  const connector = geodesicDistance(point, nodeLonLat(graph, start));
  if (connector > maxConnector) return { outOfRange: { reason: 'far', connector } };
  const nearest = walkFrom(point, start, graph, shelterNodes, options);
  return nearest ? { nearest } : { outOfRange: { reason: 'unreachable', connector } };
}
