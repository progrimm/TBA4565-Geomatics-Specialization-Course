import { describe, it, expect, vi } from 'vitest';
import {
  buildingsOnPath,
  canPassThrough,
  findPassages,
  insideLength,
  localFrame,
  passageIndexFor,
  toBuildingPolygons,
  toPassageIndex,
} from '../src/utils/passages.js';

// Hand-made geometry (not real OSM data) around Torvet, written in local metres
// (x east, y north) and converted to WGS84 degrees with the inverse of localFrame.
const LON0 = 10.395;
const LAT0 = 63.43;
const toPlane = localFrame(LON0, LAT0);
const [kx] = toPlane([LON0 + 1, LAT0]);
const [, ky] = toPlane([LON0, LAT0 + 1]);
const toLonLat = ([x, y]) => [LON0 + x / kx, LAT0 + y / ky];
const geometry = (points) => points.map(toLonLat).map(([lon, lat]) => ({ lon, lat }));
const square = (x0, y0, size) => [
  [x0, y0],
  [x0 + size, y0],
  [x0 + size, y0 + size],
  [x0, y0 + size],
  [x0, y0],
];

// Building 1: 20 × 20 m at the origin. Building 2: 40 × 40 m with a 20 × 20 m courtyard,
// mapped as a relation whose outer ring is split into two ways.
const SHOP = { type: 'way', id: 1, tags: { building: 'retail', name: 'Shop' } };
const elements = [
  { ...SHOP, geometry: geometry(square(0, 0, 20)) },
  {
    type: 'relation',
    id: 2,
    tags: { building: 'yes', type: 'multipolygon' },
    members: [
      { type: 'way', role: 'outer', geometry: geometry(square(100, 0, 40).slice(0, 3)) },
      { type: 'way', role: 'outer', geometry: geometry(square(100, 0, 40).slice(2)) },
      { type: 'way', role: 'inner', geometry: geometry(square(110, 10, 20)) },
    ],
  },
  { type: 'way', id: 3, tags: { building: 'roof' }, geometry: geometry(square(200, 0, 20)) },
];
const buildings = toBuildingPolygons(elements);
const way = (points, tags = { highway: 'footway' }) => ({
  tags,
  coordinates: points.map(toLonLat),
});

describe('insideLength', () => {
  it('measures the part of a segment inside a square', () => {
    expect(insideLength([-10, 10], [30, 10], [square(0, 0, 20)])).toBeCloseTo(20, 9);
    expect(insideLength([5, 5], [15, 5], [square(0, 0, 20)])).toBeCloseTo(10, 9);
    expect(insideLength([-10, 30], [30, 30], [square(0, 0, 20)])).toBe(0);
  });

  it('treats a courtyard (inner ring) as outside', () => {
    const rings = [square(0, 0, 40), square(10, 10, 20)];
    expect(insideLength([-10, 20], [50, 20], rings)).toBeCloseTo(20, 9);
    expect(insideLength([12, 20], [28, 20], rings)).toBe(0);
  });
});

describe('toBuildingPolygons', () => {
  it('keeps ways and joins split relation rings, but skips roofs', () => {
    expect(buildings.map(({ type, id }) => `${type}/${id}`)).toEqual(['way/1', 'relation/2']);
    expect(buildings[0]).toMatchObject({ name: 'Shop', building: 'retail' });
    expect(buildings[1].rings).toHaveLength(2); // joined outer + inner
  });
});

describe('canPassThrough', () => {
  it('skips tunnels and bridges but keeps building passages', () => {
    expect(canPassThrough({ highway: 'footway' })).toBe(true);
    expect(canPassThrough({ tunnel: 'building_passage' })).toBe(true);
    expect(canPassThrough({ tunnel: 'yes' })).toBe(false);
    expect(canPassThrough({ bridge: 'yes' })).toBe(false);
  });
});

describe('findPassages', () => {
  const ids = (ways) =>
    findPassages(ways, buildings, { minInside: 5 }).map(({ type, id }) => `${type}/${id}`);

  it('finds a way that runs through a building', () => {
    const [passage] = findPassages(
      [
        way([
          [-10, 10],
          [30, 10],
        ]),
      ],
      buildings,
      {
        minInside: 5,
      },
    );
    expect(passage).toMatchObject({ type: 'way', id: 1, name: 'Shop', building: 'retail' });
    expect(passage.segments).toHaveLength(1);
  });

  it('adds up short segments of one way inside the same building', () => {
    // Vertices every 3 m: no single segment is 5 m inside, the way is 20 m inside.
    const points = Array.from({ length: 15 }, (_, k) => [-1 + 3 * k, 10]);
    expect(ids([way(points)])).toEqual(['way/1']);
  });

  it('ignores a way that only grazes a corner (< 5 m inside)', () => {
    // Cuts the north-west corner: 2√2 ≈ 2.8 m inside.
    expect(insideLength([-4, 14], [4, 22], [square(0, 0, 20)])).toBeCloseTo(2 * Math.SQRT2, 9);
    expect(
      ids([
        way([
          [-4, 14],
          [4, 22],
        ]),
      ]),
    ).toEqual([]);
  });

  it('ignores a path inside a courtyard but not one crossing the whole block', () => {
    expect(
      ids([
        way([
          [112, 20],
          [128, 20],
        ]),
      ]),
    ).toEqual([]);
    expect(
      ids([
        way([
          [90, 20],
          [150, 20],
        ]),
      ]),
    ).toEqual(['relation/2']);
  });

  it('ignores roofs, tunnels and bridges', () => {
    const through = [
      [-10, 10],
      [30, 10],
    ];
    expect(
      ids([
        way([
          [190, 10],
          [230, 10],
        ]),
      ]),
    ).toEqual([]);
    expect(ids([way(through, { highway: 'footway', tunnel: 'yes' })])).toEqual([]);
    expect(ids([way(through, { highway: 'footway', bridge: 'yes' })])).toEqual([]);
  });
});

describe('toPassageIndex and buildingsOnPath', () => {
  const shop = { type: 'way', id: 1, name: 'Shop', building: 'retail' };
  const hall = { type: 'relation', id: 2, building: 'yes' };
  const index = toPassageIndex({
    buildings: [
      { ...shop, edges: [4, 5, 5, 6] },
      { ...hall, edges: [8, 9] },
    ],
  });

  it('lists the buildings along a route once each, in route order', () => {
    expect(buildingsOnPath([9, 8, 7, 6, 5, 4], index)).toEqual([hall, shop]);
  });

  it('matches edges in either direction and ignores node pairs that are not edges', () => {
    expect(buildingsOnPath([6, 5], index)).toEqual([shop]);
    expect(buildingsOnPath([4, 6], index)).toEqual([]);
    expect(buildingsOnPath([4], index)).toEqual([]);
  });
});

describe('passageIndexFor', () => {
  const passages = {
    networkTimestamp: '2026-10-27T10:35:02Z',
    buildings: [{ type: 'way', id: 1, building: 'retail', edges: [4, 5] }],
  };

  it('indexes passages made for this network snapshot', () => {
    const index = passageIndexFor({ osmTimestamp: '2026-10-27T10:35:02Z' }, passages);
    expect(buildingsOnPath([4, 5], index)).toHaveLength(1);
  });

  it('ignores missing passages and passages made for another snapshot', () => {
    expect(passageIndexFor({ osmTimestamp: '2026-10-27T10:35:02Z' }, undefined)).toBeUndefined();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(passageIndexFor({ osmTimestamp: '2026-11-01T00:00:00Z' }, passages)).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
