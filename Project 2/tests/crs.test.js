import { describe, it, expect } from 'vitest';
import { utm32ToWgs84 } from '../src/utils/crs.js';

describe('utm32ToWgs84', () => {
  it('maps the zone 32 origin (false easting 500 000 m) to 9°E on the equator', () => {
    const [lon, lat] = utm32ToWgs84(500000, 0);
    expect(lon).toBeCloseTo(9, 9);
    expect(lat).toBeCloseTo(0, 9);
  });

  it('places a Trondheim shelter (DSB romnr 6870) in central Trondheim', () => {
    const [lon, lat] = utm32ToWgs84(569813.4307, 7034377.044946);
    expect(lon).toBeGreaterThan(10.3);
    expect(lon).toBeLessThan(10.5);
    expect(lat).toBeGreaterThan(63.4);
    expect(lat).toBeLessThan(63.45);
  });
});
