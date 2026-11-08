import { describe, expect, it } from 'vitest';
import { geoidHeight, toEllipsoidalHeight, toNN2000Height } from '../src/utils/geoid.js';
import { GEOID_GRID } from '../src/utils/geoidGrid.js';

// A 3 × 2 hand-made lattice: nodes 0.04° apart in longitude, 0.02° in latitude.
const grid = {
  west: 10,
  north: 63.5,
  dLon: 0.04,
  dLat: 0.02,
  cols: 3,
  rows: 2,
  values: [39, 40, 41, 41, 42, 43],
};

describe('geoidHeight', () => {
  it('returns the node value on a lattice node', () => {
    expect(geoidHeight({ longitude: 10, latitude: 63.5 }, grid)).toBe(39);
    expect(geoidHeight({ longitude: 10.04, latitude: 63.48 }, grid)).toBeCloseTo(42, 9);
    expect(geoidHeight({ longitude: 10.08, latitude: 63.48 }, grid)).toBeCloseTo(43, 9);
  });

  it('interpolates bilinearly inside a cell', () => {
    // Centre of the first cell: mean of 39, 40, 41, 42.
    expect(geoidHeight({ longitude: 10.02, latitude: 63.49 }, grid)).toBeCloseTo(40.5, 9);
    // A quarter of the way east along the top edge.
    expect(geoidHeight({ longitude: 10.01, latitude: 63.5 }, grid)).toBeCloseTo(39.25, 9);
  });

  it('is undefined outside the lattice', () => {
    expect(geoidHeight({ longitude: 9.99, latitude: 63.49 }, grid)).toBeUndefined();
    expect(geoidHeight({ longitude: 10.02, latitude: 63.51 }, grid)).toBeUndefined();
    expect(geoidHeight({ longitude: 10.09, latitude: 63.49 }, grid)).toBeUndefined();
  });

  it('agrees with Kartverket’s transformation API at Torvet within 1 mm', () => {
    // ws.geonorge.no/transformering/v1, EPSG:4937 → 5942, h = 0 at Torvet (OSM relation
    // 4681742) gave H = −39.37278 m on 2026-11-08, so N = 39.37278 m (the API uses
    // HREF2018B; the committed grid is HREF2025A, which differs by < 1 mm here).
    const torvet = { longitude: 10.3953233, latitude: 63.4303661 };
    expect(Math.abs(geoidHeight(torvet, GEOID_GRID) - 39.37278)).toBeLessThan(0.001);
  });
});

describe('height conversion', () => {
  const point = { longitude: 10.02, latitude: 63.49 }; // N = 40.5
  it('adds N to go from NN2000 to ellipsoidal height and back', () => {
    expect(toEllipsoidalHeight(point, 10, grid)).toBeCloseTo(50.5, 9);
    expect(toNN2000Height(point, 50.5, grid)).toBeCloseTo(10, 9);
  });

  it('is undefined outside the lattice', () => {
    expect(toEllipsoidalHeight({ longitude: 0, latitude: 0 }, 10, grid)).toBeUndefined();
    expect(toNN2000Height({ longitude: 0, latitude: 0 }, 10, grid)).toBeUndefined();
  });
});
