import { Cartesian3, Cartographic, Math as CesiumMath, Matrix3, Matrix4, Transforms } from 'cesium';

/** Below this magnitude (metres) a translation is treated as the Earth's centre. */
const EARTH_CENTRE_TOLERANCE = 1;

/**
 * Express an ECEF vector in the local East-North-Up frame at an ECEF origin.
 * @param {Cartesian3} vector - ECEF (EPSG:4978) direction or offset, metres.
 * @param {Cartesian3} origin - ECEF position that defines the ENU frame.
 * @returns {{east: number, north: number, up: number}} components in metres (or unitless).
 */
export function ecefToEnu(vector, origin) {
  const enu = Transforms.eastNorthUpToFixedFrame(origin);
  const rotation = Matrix4.getMatrix3(enu, new Matrix3());
  // ENU axes are orthonormal, so the inverse rotation is the transpose.
  const local = Matrix3.multiplyByVector(
    Matrix3.transpose(rotation, new Matrix3()),
    vector,
    new Cartesian3(),
  );
  return { east: local.x, north: local.y, up: local.z };
}

/**
 * Decode a 3D Tiles transform (local → ECEF, column-major 4×4) into what it means
 * on the globe: where the local origin is, how the local axes are oriented
 * relative to East-North-Up at that point, and the scale.
 * @param {Matrix4} transform - e.g. tileset.root.transform, or modelMatrix × root.transform.
 * @returns {{
 *   atEarthCentre: boolean,
 *   longitude?: number, latitude?: number, height?: number,
 *   axes?: {x: {east: number, north: number, up: number}, y: object, z: object},
 *   rotationAboutUp?: number, tilt?: number,
 *   scale: {x: number, y: number, z: number},
 * }} WGS84 longitude/latitude in degrees, ellipsoidal height in metres, angles in degrees.
 *   rotationAboutUp is the angle from East to the local x-axis, counter-clockwise
 *   seen from above (0 = local axes are ENU); tilt is the angle between local z and Up.
 */
export function decodeTransform(transform) {
  const origin = Matrix4.getTranslation(transform, new Cartesian3());
  const scaleVector = Matrix4.getScale(transform, new Cartesian3());
  const scale = { x: scaleVector.x, y: scaleVector.y, z: scaleVector.z };
  // No translation: the content is already in ECEF and there is no local frame.
  if (Cartesian3.magnitude(origin) < EARTH_CENTRE_TOLERANCE) return { atEarthCentre: true, scale };

  const carto = Cartographic.fromCartesian(origin);
  const axis = (column, length) => {
    const direction = Matrix4.getColumn(transform, column, new Cartesian3());
    return ecefToEnu(Cartesian3.divideByScalar(direction, length, direction), origin);
  };
  const axes = { x: axis(0, scale.x), y: axis(1, scale.y), z: axis(2, scale.z) };

  return {
    atEarthCentre: false,
    longitude: CesiumMath.toDegrees(carto.longitude),
    latitude: CesiumMath.toDegrees(carto.latitude),
    height: carto.height,
    axes,
    rotationAboutUp: CesiumMath.toDegrees(Math.atan2(axes.x.north, axes.x.east)),
    tilt: CesiumMath.toDegrees(Math.acos(CesiumMath.clamp(axes.z.up, -1, 1))),
    scale,
  };
}

/**
 * Georeferencing facts of a loaded tileset for the inspector.
 * @param {{root: {transform: Matrix4}, modelMatrix: Matrix4, boundingSphere: import('cesium').BoundingSphere}} tileset
 * @returns {{
 *   root: ReturnType<typeof decodeTransform>,
 *   offset?: {east: number, north: number, up: number},
 *   radius: number,
 *   centreHeight: number,
 * }} offset: the modelMatrix translation in ENU metres at the root origin (absent
 *   when modelMatrix is the identity); centreHeight: ellipsoidal height of the
 *   bounding-sphere centre in metres.
 */
export function inspectTileset({ root, modelMatrix, boundingSphere }) {
  const decoded = decodeTransform(root.transform);
  const translation = Matrix4.getTranslation(modelMatrix, new Cartesian3());
  const rootOrigin = Matrix4.getTranslation(root.transform, new Cartesian3());
  return {
    root: decoded,
    offset: Matrix4.equals(modelMatrix, Matrix4.IDENTITY)
      ? undefined
      : ecefToEnu(translation, rootOrigin),
    radius: boundingSphere.radius,
    centreHeight: Cartographic.fromCartesian(boundingSphere.center).height,
  };
}
