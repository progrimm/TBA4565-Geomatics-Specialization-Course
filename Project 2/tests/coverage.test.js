import { describe, expect, it } from 'vitest';
import { distanceClass, summarizeCoverage } from '../src/utils/coverage.js';

const classes = [{ max: 500 }, { max: 1000 }, { max: Infinity }];

describe('distanceClass', () => {
  it('puts a walk in the first class whose upper bound it does not exceed', () => {
    expect(distanceClass(0, classes)).toBe(0);
    expect(distanceClass(500, classes)).toBe(0);
    expect(distanceClass(500.1, classes)).toBe(1);
    expect(distanceClass(12000, classes)).toBe(2);
  });

  it('returns -1 for no route', () => {
    expect(distanceClass(null, classes)).toBe(-1);
    expect(distanceClass(Infinity, classes)).toBe(-1);
  });
});

describe('summarizeCoverage', () => {
  const shelters = [
    { romnr: 1, adresse: 'A', plasser: 100 },
    { romnr: 2, adresse: 'B', plasser: 50 },
  ];
  const cells = [
    { population: 200, walk: 300, romnr: 1, connector: 10 },
    { population: 100, walk: 800, romnr: 1, connector: 20 },
    { population: 400, walk: 1500, romnr: 2, connector: 150 },
    { population: 50, walk: null, romnr: null, connector: 30 },
  ];
  const summary = summarizeCoverage(cells, shelters, [500, 1000], 100);

  it('counts residents within each walking distance', () => {
    expect(summary.residents).toBe(750);
    expect(summary.within).toEqual([
      { metres: 500, residents: 200, share: 200 / 750 },
      { metres: 1000, residents: 300, share: 300 / 750 },
    ]);
  });

  it('compares residents with places, overall and per catchment', () => {
    expect(summary.places).toBe(150);
    expect(summary.residentsPerPlace).toBe(5);
    // Most crowded first: shelter 2 has 400 residents for 50 places.
    expect(summary.catchments.map((c) => [c.romnr, c.residents, c.residentsPerPlace])).toEqual([
      [2, 400, 8],
      [1, 300, 3],
    ]);
  });

  it('reports cells with no route and cells far from the network', () => {
    expect(summary.noRoute).toEqual({ cells: 1, residents: 50 });
    expect(summary.farFromNetwork).toEqual({ cells: 1, residents: 400 });
  });

  it('gives a shelter with no residents in its catchment 0 per place', () => {
    const empty = summarizeCoverage([], shelters, [500], 100);
    expect(empty.catchments.every((c) => c.residents === 0 && c.residentsPerPlace === 0)).toBe(
      true,
    );
    expect(empty.within[0].share).toBe(0);
  });
});

describe('coverage layer cells', async () => {
  const { isCoverageCell, toCellFeatures } = await import('../src/layers/coverage.js');
  const corners = [
    [10.39, 63.43],
    [10.395, 63.43],
    [10.395, 63.432],
    [10.39, 63.432],
  ];

  it('turns each cell into a closed GeoJSON polygon with its attributes', () => {
    const { features } = toCellFeatures({ cells: [[corners, 120, 640, 6870]] });
    expect(features).toHaveLength(1);
    const [ring] = features[0].geometry.coordinates;
    expect(ring).toHaveLength(5);
    expect(ring.at(-1)).toEqual(ring[0]);
    expect(features[0].properties).toEqual({
      kind: 'coverageCell',
      population: 120,
      walk: 640,
      romnr: 6870,
      minutes: null,
      fastRomnr: null,
    });
    const timed = toCellFeatures({ cells: [[corners, 120, 640, 6870, 8.3, 30671]] });
    expect(timed.features[0].properties).toMatchObject({ minutes: 8.3, fastRomnr: 30671 });
  });

  it('recognises picked coverage cells, and nothing else', () => {
    const picked = (kind) => ({ id: { properties: { kind: { getValue: () => kind } } } });
    expect(isCoverageCell(picked('coverageCell'))).toBe(true);
    expect(isCoverageCell(picked(undefined))).toBe(false);
    expect(isCoverageCell({ id: {} })).toBe(false);
    expect(isCoverageCell(undefined)).toBe(false);
  });
});
