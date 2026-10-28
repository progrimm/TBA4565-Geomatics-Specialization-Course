import { describe, it, expect } from 'vitest';
import { distance } from '../src/utils/measure.js';

describe('distance', () => {
  it('is the straight 3D distance', () => {
    expect(distance([0, 0, 0], [3, 4, 12])).toBe(13);
    expect(distance([1, 1, 1], [1, 1, 1])).toBe(0);
    expect(distance([-1, 0, 0], [1, 0, 0])).toBe(2);
  });
});
