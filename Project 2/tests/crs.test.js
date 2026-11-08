import { describe, it, expect } from 'vitest';
import { utm32ToWgs84, utm33ToWgs84, wgs84ToUtm32 } from '../src/utils/crs.js';

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

describe('utm33ToWgs84', () => {
  it('maps the zone 33 origin to 15°E on the equator', () => {
    const [lon, lat] = utm33ToWgs84(500000, 0);
    expect(lon).toBeCloseTo(15, 9);
    expect(lat).toBeCloseTo(0, 9);
  });

  it('places an SSB 250 m cell corner in central Trondheim, with grid north rotated', () => {
    // Lower-left corner of SSB cell 22700007040500 (x 270 000, y 7 040 500), Midtbyen.
    const [lon, lat] = utm33ToWgs84(270000, 7040500);
    expect(lon).toBeCloseTo(10.39, 1);
    expect(lat).toBeCloseTo(63.43, 1);
    // Going 250 m grid-north moves west in longitude: zone 33's grid north points about
    // 4° west of true north at 10.4°E (convergence ≈ (10.4° − 15°) · sin 63.4°).
    const [lonNorth, latNorth] = utm33ToWgs84(270000, 7040750);
    const eastMetres = (lonNorth - lon) * 111320 * Math.cos((lat * Math.PI) / 180);
    const northMetres = (latNorth - lat) * 111132;
    const bearing = (Math.atan2(eastMetres, northMetres) * 180) / Math.PI;
    expect(bearing).toBeCloseTo(-4.1, 0);
  });
});

describe('wgs84ToUtm32', () => {
  it('inverts utm32ToWgs84 to well under a millimetre', () => {
    const [east, north] = wgs84ToUtm32(...utm32ToWgs84(569813.4307, 7034377.044946));
    expect(east).toBeCloseTo(569813.4307, 4);
    expect(north).toBeCloseTo(7034377.044946, 4);
  });
});
