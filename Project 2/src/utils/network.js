import { Cartographic, Ellipsoid, EllipsoidGeodesic } from 'cesium';
import { geodesicDistance } from './nearest.js';

/**
 * Walking-network analysis on the OpenStreetMap graph (see utils/osmNetwork.js
 * for the file format). Every OSM node is a graph node and every way segment an
 * undirected edge weighted by its geodesic length: pedestrians may walk both
 * ways along one-way streets.
 *
 * @typedef {{lon: Float64Array, lat: Float64Array, adjacency: number[][]}} Graph
 *   lon/lat: WGS84 degrees per node. adjacency[i] = [neighbour, metres, neighbour, metres, …].
 * @typedef {{distance: number, networkDistance: number, coordinates: number[][]}} Walk
 *   distance: total metres (click → network → shelter); networkDistance: the part
 *   along the network; coordinates: WGS84 [lon, lat] from the click to the shelter.
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
 * @returns {{node: number, distance: number, path: number[]} | undefined}
 *   the reached target, the network distance in metres and the node path
 *   (start … target); undefined if no target is connected to the start.
 */
export function shortestPathToAny({ adjacency }, start, targets) {
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
      const candidate = d + edges[k + 1];
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

/**
 * Find the shelter with the shortest walk from a point. The walk is: a straight
 * line from the point to its nearest network node, the shortest path along the
 * network, and a straight line from the shelter's network node to the shelter.
 * @param {import('./nearest.js').LonLat} point - WGS84 degrees.
 * @param {Graph} graph
 * @param {Map<number, import('./nearest.js').Shelter>} shelterNodes - from snapShelters.
 * @returns {{shelter: import('./nearest.js').Shelter, distance: number, walk: Walk} | undefined}
 *   distance: straight-line (geodesic) metres to the chosen shelter, for comparison;
 *   undefined if no shelter is reachable from the point's part of the network.
 */
export function findNearestByWalking(point, graph, shelterNodes) {
  const start = nearestNode(graph, point);
  if (start === -1) return undefined;
  const result = shortestPathToAny(graph, start, new Set(shelterNodes.keys()));
  if (!result) return undefined;

  const shelter = shelterNodes.get(result.node);
  const nodeLonLat = (i) => ({ longitude: graph.lon[i], latitude: graph.lat[i] });
  const toNetwork = geodesicDistance(point, nodeLonLat(start));
  const fromNetwork = geodesicDistance(nodeLonLat(result.node), shelter);
  return {
    shelter,
    distance: geodesicDistance(point, shelter),
    walk: {
      distance: toNetwork + result.distance + fromNetwork,
      networkDistance: result.distance,
      coordinates: [
        [point.longitude, point.latitude],
        ...result.path.map((i) => [graph.lon[i], graph.lat[i]]),
        [shelter.longitude, shelter.latitude],
      ],
    },
  };
}
