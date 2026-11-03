import { describe, it, expect } from 'vitest';
import { bandPoint, seededRandom, toEquirect, uniformSpherePoint } from '../src/utils/stars.js';

const N = 20_000;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe('seededRandom', () => {
  it('repeats for the same seed and stays in [0, 1)', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const values = Array.from({ length: 1000 }, () => a());
    expect(values).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(seededRandom(8)()).not.toBe(values[0]);
  });
});

describe('uniformSpherePoint', () => {
  it('gives unit vectors', () => {
    const random = seededRandom(1);
    for (let i = 0; i < 100; i++) {
      expect(Math.hypot(...uniformSpherePoint(random))).toBeCloseTo(1);
    }
  });

  it('spreads points evenly over the sphere, not crowded at the poles', () => {
    const random = seededRandom(2);
    const heights = Array.from({ length: N }, () => Math.abs(uniformSpherePoint(random)[1]));
    // Even on the sphere, |y| is uniform in [0, 1]: mean 1/2. A latitude uniform in degrees
    // (even in the image) would give mean |sin(latitude)| = 2/π ≈ 0.64.
    expect(mean(heights)).toBeCloseTo(0.5, 1);
    const polar = heights.filter((height) => height > Math.sin((60 * Math.PI) / 180)).length;
    // Above 60° latitude is 1 − sin 60° ≈ 13.4 % of the sphere (a third of the image rows).
    expect(polar / N).toBeCloseTo(1 - Math.sin(Math.PI / 3), 1);
  });
});

describe('toEquirect', () => {
  it('maps the axes like three.js equirectangular textures', () => {
    expect(toEquirect([0, 1, 0]).v).toBeCloseTo(1);
    expect(toEquirect([0, -1, 0]).v).toBeCloseTo(0);
    expect(toEquirect([1, 0, 0])).toMatchObject({ u: 0.5, v: 0.5 });
    expect(toEquirect([0, 0, 1]).u).toBeCloseTo(0.75);
    expect(toEquirect([0, 0, -1]).u).toBeCloseTo(0.25);
  });
});

describe('bandPoint', () => {
  it('stays near the tilted great circle', () => {
    const random = seededRandom(3);
    const tilt = (60 * Math.PI) / 180;
    // The band's pole: the y axis tilted by 60° about x.
    const pole = [0, Math.cos(tilt), Math.sin(tilt)];
    const offsets = Array.from({ length: N }, () => {
      const point = bandPoint(random, 60, 8);
      const dot = point[0] * pole[0] + point[1] * pole[1] + point[2] * pole[2];
      return (Math.abs(Math.asin(dot)) * 180) / Math.PI;
    });
    // Mean |offset| of a normal distribution is σ·√(2/π) ≈ 6.4° for σ = 8°.
    expect(mean(offsets)).toBeCloseTo(8 * Math.sqrt(2 / Math.PI), 0);
  });
});
