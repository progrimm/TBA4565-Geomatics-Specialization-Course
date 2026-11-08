import { describe, expect, it } from 'vitest';
import { sampleBilinear } from '../src/utils/raster.js';
import { FLAT_SPEED, flatSeconds, segmentSeconds, toblerSpeed } from '../src/utils/walkingTime.js';

describe("Tobler's hiking function", () => {
  it('is fastest (6 km/h) on a 5 % downhill and 5.04 km/h on the flat', () => {
    expect(toblerSpeed(-0.05)).toBe(6);
    expect(FLAT_SPEED).toBeCloseTo(6 * Math.exp(-0.175), 12);
    expect(FLAT_SPEED).toBeCloseTo(5.0367, 4);
  });

  it('is symmetric around −5 %, not around 0', () => {
    expect(toblerSpeed(0.05)).toBeCloseTo(toblerSpeed(-0.15), 12);
    expect(toblerSpeed(0.1)).toBeLessThan(toblerSpeed(-0.1));
    // 10 % uphill: 6 · e^(−0.525) = 3.5493 km/h.
    expect(toblerSpeed(0.1)).toBeCloseTo(3.5493, 4);
  });

  it('gives direction-dependent times for the same segment', () => {
    const up = segmentSeconds(100, 10); // 100 m at +10 %
    const down = segmentSeconds(100, -10);
    expect(up).toBeCloseTo(100 / (toblerSpeed(0.1) / 3.6), 9);
    expect(down).toBeLessThan(up);
    expect(segmentSeconds(100, 0)).toBeCloseTo(flatSeconds(100), 12);
    expect(flatSeconds(1000)).toBeCloseTo(714.75, 2); // 1 km on the flat ≈ 11.9 min
    expect(segmentSeconds(0, 5)).toBe(0);
  });
});

describe('sampleBilinear', () => {
  // 3 × 2 raster, 10 m pixels, upper-left corner at (1000, 2000).
  const raster = { values: [1, 2, 3, 4, 5, 6], width: 3, height: 2, x0: 1000, y0: 2000, res: 10 };

  it('returns pixel values at pixel centres and interpolates between them', () => {
    expect(sampleBilinear(raster, 1005, 1995)).toBe(1);
    expect(sampleBilinear(raster, 1025, 1985)).toBe(6);
    expect(sampleBilinear(raster, 1010, 1990)).toBeCloseTo(3, 12); // mean of 1, 2, 4, 5
  });

  it('is NaN outside the pixel centres and next to no-data pixels', () => {
    expect(sampleBilinear(raster, 1001, 1995)).toBeNaN();
    expect(sampleBilinear(raster, 1010, 1999)).toBeNaN();
    const withHole = { ...raster, values: [1, 2, 3, -32767, 5, 6] };
    expect(sampleBilinear(withHole, 1010, 1990)).toBeNaN();
    expect(sampleBilinear(withHole, 1020, 1990)).toBeCloseTo(4, 12);
  });
});
