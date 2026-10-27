import { describe, it, expect } from 'vitest';
import { Cartographic, Math as CesiumMath } from 'cesium';
import { toCameraOptions } from '../src/utils/camera.js';

const view = { longitude: 10.3951, latitude: 63.4305, height: 1500, heading: 90, pitch: -45 };

describe('toCameraOptions', () => {
  it('round-trips the position through ECEF back to WGS84 degrees', () => {
    const { destination } = toCameraOptions(view);
    const carto = Cartographic.fromCartesian(destination);
    expect(CesiumMath.toDegrees(carto.longitude)).toBeCloseTo(view.longitude, 6);
    expect(CesiumMath.toDegrees(carto.latitude)).toBeCloseTo(view.latitude, 6);
    expect(carto.height).toBeCloseTo(view.height, 3);
  });

  it('converts heading and pitch to radians with zero roll', () => {
    const { orientation } = toCameraOptions(view);
    expect(orientation.heading).toBeCloseTo(Math.PI / 2);
    expect(orientation.pitch).toBeCloseTo(-Math.PI / 4);
    expect(orientation.roll).toBe(0);
  });
});
