import { describe, it, expect } from 'vitest';
import { Cartesian3, Math as CesiumMath, Matrix3, Matrix4, Transforms } from 'cesium';
import { decodeTransform, ecefToEnu, inspectTileset } from '../src/utils/georef.js';

// WGS84 lon/lat in degrees, ellipsoidal height in metres (Trondheim).
const origin = Cartesian3.fromDegrees(10.4, 63.43, 50);
const enuFrame = Transforms.eastNorthUpToFixedFrame(origin);

function rotatedAboutUp(degrees) {
  const rotation = Matrix4.fromRotation(Matrix3.fromRotationZ(CesiumMath.toRadians(degrees)));
  return Matrix4.multiply(enuFrame, rotation, new Matrix4());
}

describe('ecefToEnu', () => {
  it('maps ECEF axes to ENU at lon 0, lat 0 (X = up, Y = east, Z = north)', () => {
    const atNullIsland = Cartesian3.fromDegrees(0, 0, 0);
    const offset = ecefToEnu(new Cartesian3(1, 2, 3), atNullIsland);
    expect(offset.up).toBeCloseTo(1, 9);
    expect(offset.east).toBeCloseTo(2, 9);
    expect(offset.north).toBeCloseTo(3, 9);
  });

  it('keeps the length of a vector (pure rotation)', () => {
    const vector = new Cartesian3(-1, 9, -8);
    const { east, north, up } = ecefToEnu(vector, origin);
    expect(Math.hypot(east, north, up)).toBeCloseTo(Cartesian3.magnitude(vector), 9);
  });
});

describe('decodeTransform', () => {
  it('recovers the origin and identity axes of an East-North-Up frame', () => {
    const decoded = decodeTransform(enuFrame);
    expect(decoded.atEarthCentre).toBe(false);
    expect(decoded.longitude).toBeCloseTo(10.4, 9);
    expect(decoded.latitude).toBeCloseTo(63.43, 9);
    expect(decoded.height).toBeCloseTo(50, 4);
    expect(decoded.rotationAboutUp).toBeCloseTo(0, 9);
    expect(decoded.tilt).toBeCloseTo(0, 6);
    expect(decoded.axes.x.east).toBeCloseTo(1, 9);
    expect(decoded.axes.y.north).toBeCloseTo(1, 9);
    expect(decoded.axes.z.up).toBeCloseTo(1, 9);
  });

  it('measures a rotation about the up axis', () => {
    const decoded = decodeTransform(rotatedAboutUp(30));
    expect(decoded.rotationAboutUp).toBeCloseTo(30, 9);
    expect(decoded.tilt).toBeCloseTo(0, 6);
  });

  it('separates scale from orientation', () => {
    const scaled = Matrix4.multiplyByUniformScale(rotatedAboutUp(-45), 2, new Matrix4());
    const decoded = decodeTransform(scaled);
    expect(decoded.scale.x).toBeCloseTo(2, 9);
    expect(decoded.scale.z).toBeCloseTo(2, 9);
    expect(decoded.rotationAboutUp).toBeCloseTo(-45, 9);
    expect(decoded.height).toBeCloseTo(50, 4);
  });

  it('flags a transform without translation (content already in ECEF)', () => {
    expect(decodeTransform(Matrix4.IDENTITY).atEarthCentre).toBe(true);
  });
});

describe('inspectTileset', () => {
  const boundingSphere = { center: Cartesian3.fromDegrees(10.4, 63.43, 80), radius: 120 };

  it('reports no offset for an identity modelMatrix', () => {
    const facts = inspectTileset({
      root: { transform: enuFrame },
      modelMatrix: Matrix4.IDENTITY,
      boundingSphere,
    });
    expect(facts.offset).toBeUndefined();
    expect(facts.radius).toBe(120);
    expect(facts.centreHeight).toBeCloseTo(80, 4);
    expect(facts.root.height).toBeCloseTo(50, 4);
  });

  it('expresses a modelMatrix translation in ENU at the root origin', () => {
    // 5 m straight up, written as an ECEF translation.
    const up = Matrix4.getColumn(enuFrame, 2, new Cartesian3());
    const shift = Cartesian3.multiplyByScalar(up, 5, new Cartesian3());
    const facts = inspectTileset({
      root: { transform: enuFrame },
      modelMatrix: Matrix4.fromTranslation(shift),
      boundingSphere,
    });
    expect(facts.offset.up).toBeCloseTo(5, 9);
    expect(facts.offset.east).toBeCloseTo(0, 9);
    expect(facts.offset.north).toBeCloseTo(0, 9);
  });
});
