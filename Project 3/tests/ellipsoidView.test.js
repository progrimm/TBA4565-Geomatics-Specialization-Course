import { describe, it, expect } from 'vitest';
import { ELLIPSOID_VIEW } from '../src/config.js';
import { ellipsoidSettings } from '../src/utils/ellipsoidView.js';

describe('ellipsoid view settings', () => {
  it("is Spark's normal render at 0", () => {
    expect(ellipsoidSettings(0)).toEqual({
      opacityMix: 0,
      falloff: 1,
      maxStdDev: Math.sqrt(8),
    });
  });

  it('is flat, opaque and cut at the 1σ ellipse at 1', () => {
    expect(ellipsoidSettings(1)).toEqual({
      opacityMix: 1,
      falloff: 0,
      maxStdDev: ELLIPSOID_VIEW.edgeStdDev,
    });
  });

  it('is linear in between', () => {
    const half = ellipsoidSettings(0.5);
    expect(half.opacityMix).toBeCloseTo(0.5);
    expect(half.falloff).toBeCloseTo(0.5);
    expect(half.maxStdDev).toBeCloseTo((Math.sqrt(8) + ELLIPSOID_VIEW.edgeStdDev) / 2);
  });

  it('clamps out-of-range and invalid amounts', () => {
    expect(ellipsoidSettings(-1)).toEqual(ellipsoidSettings(0));
    expect(ellipsoidSettings(2)).toEqual(ellipsoidSettings(1));
    expect(ellipsoidSettings(Number.NaN)).toEqual(ellipsoidSettings(0));
  });
});
