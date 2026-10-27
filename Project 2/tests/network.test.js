import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { toWalkingNetwork } from '../src/utils/osmNetwork.js';
import {
  buildGraph,
  findNearestByWalking,
  nearestNode,
  shortestPathToAny,
  snapShelters,
} from '../src/utils/network.js';
import { geodesicDistance } from '../src/utils/nearest.js';

const overpass = JSON.parse(
  readFileSync(new URL('./fixtures/overpass-river.json', import.meta.url), 'utf8'),
);
const network = toWalkingNetwork(overpass);
const graph = buildGraph(network);

const at = (longitude, latitude) => ({ longitude, latitude });
/** Sum of geodesic segment lengths along a [lon, lat] list. */
const pathLength = (coordinates) =>
  coordinates
    .slice(1)
    .reduce((sum, [lon, lat], k) => sum + geodesicDistance(at(...coordinates[k]), at(lon, lat)), 0);
const nodeOf = (lon, lat) => nearestNode(graph, at(lon, lat));

// Click on the west bank, 5 m east of node 1.
const click = at(10.4001, 63.43);
const eastShelter = { ...at(10.4021, 63.43), romnr: 1, plasser: 10, adresse: 'East bank' };
const southShelter = { ...at(10.4, 63.427), romnr: 2, plasser: 20, adresse: 'West bank, south' };
const islandShelter = { ...at(10.41, 63.42), romnr: 3, plasser: 30, adresse: 'Island' };

describe('toWalkingNetwork', () => {
  it('keeps used nodes as micro-degree offsets from the south-west corner', () => {
    expect(network.origin).toEqual([10.4, 63.42]);
    expect(network.scale).toBe(1e6);
    expect(network.nodes.length / 2).toBe(9);
    expect(network.nodes.slice(0, 2)).toEqual([0, 7000]); // node 5: 10.4000, 63.4270
    expect(Math.min(...network.nodes)).toBeGreaterThanOrEqual(0);
  });

  it('drops references to missing nodes and ways left with fewer than 2 nodes', () => {
    expect(network.ways).toHaveLength(4);
  });
});

describe('buildGraph', () => {
  it('decodes coordinates back to WGS84 degrees', () => {
    const node = nodeOf(10.402, 63.433);
    expect(graph.lon[node]).toBeCloseTo(10.402, 9);
    expect(graph.lat[node]).toBeCloseTo(63.433, 9);
  });

  it('adds undirected edges weighted by geodesic length', () => {
    const a = nodeOf(10.4, 63.433);
    const b = nodeOf(10.402, 63.433);
    const expected = geodesicDistance(at(10.4, 63.433), at(10.402, 63.433));
    // adjacency[i] = [neighbour, metres, neighbour, metres, …]
    const weight = (from, to) => graph.adjacency[from][graph.adjacency[from].indexOf(to) + 1];
    expect(weight(a, b)).toBeCloseTo(expected, 6);
    expect(weight(b, a)).toBeCloseTo(expected, 6);
  });
});

describe('shortestPathToAny', () => {
  it('follows the network around the river and reports its length', () => {
    const start = nodeOf(10.4, 63.43);
    const target = nodeOf(10.402, 63.43);
    const result = shortestPathToAny(graph, start, new Set([target]));
    const route = [
      [10.4, 63.43],
      [10.4, 63.431],
      [10.4, 63.433],
      [10.402, 63.433],
      [10.402, 63.43],
    ];
    expect(result.path).toHaveLength(route.length);
    result.path.forEach((node, k) => {
      expect(graph.lon[node]).toBeCloseTo(route[k][0], 9);
      expect(graph.lat[node]).toBeCloseTo(route[k][1], 9);
    });
    expect(result.distance).toBeCloseTo(pathLength(route), 6);
  });

  it('returns a zero-length path when the start is a target', () => {
    const start = nodeOf(10.4, 63.43);
    expect(shortestPathToAny(graph, start, new Set([start]))).toEqual({
      node: start,
      distance: 0,
      path: [start],
    });
  });

  it('returns undefined when no target is connected', () => {
    expect(shortestPathToAny(graph, nodeOf(10.4, 63.43), new Set([nodeOf(10.41, 63.42)]))).toBe(
      undefined,
    );
  });
});

describe('findNearestByWalking', () => {
  const shelterNodes = snapShelters(graph, [eastShelter, southShelter, islandShelter]);

  it('prefers the shelter that is nearer on foot over the one nearer in a straight line', () => {
    // Straight line: east ≈ 100 m, south ≈ 334 m. On foot, east needs the bridge (≈ 770 m).
    expect(geodesicDistance(click, eastShelter)).toBeLessThan(
      geodesicDistance(click, southShelter),
    );
    const result = findNearestByWalking(click, graph, shelterNodes);
    expect(result.shelter.romnr).toBe(2);
    expect(result.distance).toBeCloseTo(geodesicDistance(click, southShelter), 6);
  });

  it('adds the straight connectors from the click and to the shelter', () => {
    const { walk } = findNearestByWalking(click, graph, shelterNodes);
    expect(walk.coordinates.at(0)).toEqual([click.longitude, click.latitude]);
    expect(walk.coordinates.at(-1)).toEqual([southShelter.longitude, southShelter.latitude]);
    expect(walk.distance).toBeCloseTo(pathLength(walk.coordinates), 6);
    // Network part: node 1 → node 5 = 0.003° of latitude ≈ 334 m; connector ≈ 5 m.
    expect(walk.networkDistance).toBeCloseTo(
      geodesicDistance(at(10.4, 63.43), at(10.4, 63.427)),
      6,
    );
  });

  it('crosses the bridge when the only shelter is on the east bank', () => {
    const { shelter, walk } = findNearestByWalking(
      click,
      graph,
      snapShelters(graph, [eastShelter]),
    );
    expect(shelter.romnr).toBe(1);
    expect(walk.distance).toBeGreaterThan(700);
  });

  it('returns undefined when only unreachable shelters exist', () => {
    expect(findNearestByWalking(click, graph, snapShelters(graph, [islandShelter]))).toBe(
      undefined,
    );
  });
});
