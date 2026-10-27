import { describe, it, expect } from 'vitest';
import { Cartesian3, Cartographic, Math as CesiumMath } from 'cesium';
import { toCameraOptions } from '../src/utils/camera.js';

const target = { longitude: 10.3953233, latitude: 63.4303661, height: 50 };
const view = { target, heading: 0, pitch: -45, range: 1000 };

const toDegrees = (cartesian) => {
  const carto = Cartographic.fromCartesian(cartesian);
  return {
    longitude: CesiumMath.toDegrees(carto.longitude),
    latitude: CesiumMath.toDegrees(carto.latitude),
    height: carto.height,
  };
};

describe('toCameraOptions', () => {
  it('places the camera exactly `range` metres from the target', () => {
    const { destination } = toCameraOptions(view);
    const center = Cartesian3.fromDegrees(target.longitude, target.latitude, target.height);
    expect(Cartesian3.distance(destination, center)).toBeCloseTo(1000, 6);
  });

  it('raises the camera by range · sin(|pitch|) above the target', () => {
    const camera = toDegrees(toCameraOptions(view).destination);
    // 1000 · sin 45° = 707.1 m; Earth's curvature adds ~0.04 m over 707 m horizontally.
    expect(camera.height).toBeCloseTo(target.height + 707.1, 0);
  });

  it('puts the camera south of the target when looking north (heading 0)', () => {
    const camera = toDegrees(toCameraOptions(view).destination);
    expect(camera.latitude).toBeLessThan(target.latitude);
    expect(camera.longitude).toBeCloseTo(target.longitude, 9);
  });

  it('puts the camera west of the target when looking east (heading 90)', () => {
    const camera = toDegrees(toCameraOptions({ ...view, heading: 90 }).destination);
    expect(camera.longitude).toBeLessThan(target.longitude);
    // Moving due east/west along the tangent plane drifts < 0.0001° in latitude over 707 m.
    expect(camera.latitude).toBeCloseTo(target.latitude, 4);
  });

  it('converts heading and pitch to radians with zero roll', () => {
    const { orientation } = toCameraOptions({ ...view, heading: 90 });
    expect(orientation.heading).toBeCloseTo(Math.PI / 2);
    expect(orientation.pitch).toBeCloseTo(-Math.PI / 4);
    expect(orientation.roll).toBe(0);
  });
});
