import { describe, it, expect } from 'vitest';
import {
  boundsSize,
  cameraForBounds,
  collectCentres,
  coreBounds,
  fullBounds,
} from '../src/utils/bounds.js';

/** 101 centres on a line from 0 to 100 along each axis, plus one far floater. */
function lineWithFloater() {
  const values = [];
  for (let i = 0; i <= 100; i += 1) values.push(i, i, i);
  values.push(10000, -10000, 10000);
  return new Float32Array(values);
}

describe('splat bounds', () => {
  it('collects finite centres and skips NaN splats', () => {
    const splats = [
      { x: 1, y: 2, z: 3 },
      { x: NaN, y: 0, z: 0 },
      { x: 4, y: Infinity, z: 6 },
      { x: -1, y: -2, z: -3 },
    ];
    const centres = collectCentres((callback) => splats.forEach((c, i) => callback(i, c)));
    expect(Array.from(centres)).toEqual([1, 2, 3, -1, -2, -3]);
  });

  it('finds the full bounding box', () => {
    const bounds = fullBounds(new Float32Array([1, 2, 3, -1, 5, 0]));
    expect(bounds).toEqual({ min: [-1, 2, 0], max: [1, 5, 3] });
    expect(boundsSize(bounds)).toEqual([2, 3, 3]);
  });

  it('ignores floaters in the core bounds', () => {
    const centres = lineWithFloater();
    expect(fullBounds(centres).max[0]).toBe(10000);
    expect(fullBounds(centres).min[1]).toBe(-10000);
    const core = coreBounds(centres, 0.96);
    for (let axis = 0; axis < 3; axis += 1) {
      expect(core.min[axis]).toBeGreaterThanOrEqual(0);
      expect(core.max[axis]).toBeLessThanOrEqual(100);
    }
  });

  it('keeps everything with fraction 1, and samples large clouds', () => {
    const centres = lineWithFloater();
    expect(coreBounds(centres, 1)).toEqual(fullBounds(centres));
    const sampled = coreBounds(centres, 0.9, 20);
    expect(sampled.max[0]).toBeLessThanOrEqual(100);
    expect(sampled.min[0]).toBeGreaterThanOrEqual(0);
  });

  it('places the camera so the bounding sphere fits the view', () => {
    const view = cameraForBounds({ min: [-1, -1, -1], max: [1, 1, 1] }, 60, [0, 0, 2]);
    expect(view.target).toEqual([0, 0, 0]);
    expect(view.radius).toBeCloseTo(Math.sqrt(3));
    // sin(30°) = 0.5, so distance = 2 × radius, along +z.
    expect(view.distance).toBeCloseTo(2 * Math.sqrt(3));
    expect(view.position[2]).toBeCloseTo(2 * Math.sqrt(3));
  });

  it('never returns a zero distance for a single point', () => {
    const view = cameraForBounds({ min: [5, 5, 5], max: [5, 5, 5] }, 60, [1, 0, 0]);
    expect(view.distance).toBeGreaterThan(0);
  });
});
