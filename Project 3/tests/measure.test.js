import { describe, it, expect } from 'vitest';
import { Cartesian3, Ellipsoid } from 'cesium';
import { measure } from '../src/utils/measure.js';

describe('measure', () => {
  it('gives a pure height difference for two points above each other', () => {
    // WGS84 lon/lat in degrees, ellipsoidal heights in metres.
    const result = measure(
      Cartesian3.fromDegrees(10.4, 63.43, 20),
      Cartesian3.fromDegrees(10.4, 63.43, 30),
    );
    expect(result.straight).toBeCloseTo(10, 6);
    expect(result.horizontal).toBeCloseTo(0, 6);
    expect(result.heightDifference).toBeCloseTo(10, 6);
  });

  it('follows the equator for 1° of longitude (a · π/180)', () => {
    const result = measure(Cartesian3.fromDegrees(0, 0, 0), Cartesian3.fromDegrees(1, 0, 0));
    const arc = (Ellipsoid.WGS84.maximumRadius * Math.PI) / 180; // 111 319.49 m
    expect(result.horizontal).toBeCloseTo(arc, 3);
    // The straight 3D line is the chord, 2a·sin(0.5°), which is shorter than the arc.
    const chord = 2 * Ellipsoid.WGS84.maximumRadius * Math.sin(Math.PI / 360);
    expect(result.straight).toBeCloseTo(chord, 3);
    expect(result.heightDifference).toBeCloseTo(0, 6);
  });

  it('combines horizontal and vertical parts like Pythagoras over short distances', () => {
    const a = Cartesian3.fromDegrees(4.6687, 45.2652, 450);
    const b = Cartesian3.fromDegrees(4.6687, 45.2661, 462); // ~100 m north, 12 m up
    const result = measure(a, b);
    expect(result.heightDifference).toBeCloseTo(12, 6);
    expect(result.straight).toBeCloseTo(Math.hypot(result.horizontal, 12), 1);
  });
});
