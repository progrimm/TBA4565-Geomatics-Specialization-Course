import { Cartesian3, Math as CesiumMath } from 'cesium';

/**
 * Convert a camera view from config.js into options for Camera.setView/flyTo.
 * @param {{longitude: number, latitude: number, height: number, heading: number, pitch: number}} view
 *   WGS84 lon/lat in degrees, height in metres above the WGS84 ellipsoid,
 *   heading/pitch in degrees.
 * @returns {{destination: Cartesian3, orientation: {heading: number, pitch: number, roll: number}}}
 *   Destination in ECEF (Earth-centred, Earth-fixed) metres, angles in radians.
 */
export function toCameraOptions({ longitude, latitude, height, heading, pitch }) {
  return {
    destination: Cartesian3.fromDegrees(longitude, latitude, height),
    orientation: {
      heading: CesiumMath.toRadians(heading),
      pitch: CesiumMath.toRadians(pitch),
      roll: 0,
    },
  };
}
