import { describe, expect, it } from 'vitest';
import { gridPoints, quantile } from '../src/utils/grid.js';

describe('gridPoints', () => {
  const bbox = { west: 10, south: 63, east: 10.4, north: 63.2 };

  it('spans the box from corner to corner, row by row', () => {
    const points = gridPoints(bbox, 3);
    expect(points).toHaveLength(9);
    expect(points[0]).toEqual({ longitude: 10, latitude: 63 });
    expect(points[1].longitude).toBeCloseTo(10.2, 12);
    expect(points[3].latitude).toBeCloseTo(63.1, 12);
    expect(points[8]).toEqual({ longitude: 10.4, latitude: 63.2 });
  });
});

describe('quantile', () => {
  it('interpolates between ranks (type 7)', () => {
    // NumPy: np.quantile([1, 2, 3, 4], [0.5, 0.9]) = [2.5, 3.7]
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4], 0.9)).toBeCloseTo(3.7, 12);
    expect(quantile([1, 2, 3, 4], 0)).toBe(1);
    expect(quantile([1, 2, 3, 4], 1)).toBe(4);
  });

  it('handles one value and no values', () => {
    expect(quantile([7], 0.9)).toBe(7);
    expect(quantile([], 0.5)).toBeNaN();
  });
});
