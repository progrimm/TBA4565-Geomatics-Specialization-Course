import { Cartesian3, Math as CesiumMath, Matrix4, Transforms } from 'cesium';
import { toEllipsoidalHeight } from './geoid.js';
import { GEOID_GRID } from './geoidGrid.js';

/**
 * Convert a camera view from config.js into options for Camera.setView/flyTo.
 * The camera is placed `range` metres from the target, opposite the viewing
 * direction, so the target ends up in the centre of the screen.
 * @param {{target: {longitude: number, latitude: number, heightNN2000: number},
 *   heading: number, pitch: number, range: number}} view
 *   Target in WGS84 lon/lat degrees and NN2000 metres; heading/pitch in degrees,
 *   range in metres. The target height is converted to an ellipsoidal height
 *   (h = H + N) with the geoid model, because Cesium works in ellipsoidal heights.
 * @param {import('./geoid.js').GeoidGrid} [grid] - geoid model subgrid.
 * @returns {{destination: Cartesian3, orientation: {heading: number, pitch: number, roll: number}}}
 *   Destination in ECEF (Earth-centred, Earth-fixed) metres, angles in radians.
 *   Heading and pitch are applied at the camera, not at the target; over a few
 *   kilometres the difference from Earth's curvature is below 0.05°.
 */
export function toCameraOptions({ target, heading, pitch, range }, grid = GEOID_GRID) {
  const height = toEllipsoidalHeight(target, target.heightNN2000, grid);
  if (height === undefined) throw new Error('Camera target is outside the geoid grid');
  const h = CesiumMath.toRadians(heading);
  const p = CesiumMath.toRadians(pitch);
  const center = Cartesian3.fromDegrees(target.longitude, target.latitude, height);

  // Unit vector from camera to target in the target's local East-North-Up frame.
  const lookEnu = new Cartesian3(Math.sin(h) * Math.cos(p), Math.cos(h) * Math.cos(p), Math.sin(p));
  const cameraEnu = Cartesian3.multiplyByScalar(lookEnu, -range, new Cartesian3());
  // ENU (metres around the target) → ECEF (EPSG:4978).
  const enuToEcef = Transforms.eastNorthUpToFixedFrame(center);

  return {
    destination: Matrix4.multiplyByPoint(enuToEcef, cameraEnu, new Cartesian3()),
    orientation: { heading: h, pitch: p, roll: 0 },
  };
}
