/**
 * App-wide constants. No magic numbers elsewhere in the code.
 */

/** Cesium ion token, injected by Vite from .env (VITE_CESIUM_TOKEN). */
export const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;

/**
 * Preset camera views.
 * Coordinates: WGS84 longitude/latitude in degrees, height in metres above the
 * WGS84 ellipsoid (not NN2000). In Trondheim the geoid is ~40 m above the
 * ellipsoid, so ellipsoidal height ≈ NN2000 height + 40 m.
 */
export const CAMERA_VIEWS = {
  trondheimCentre: {
    longitude: 10.3951,
    latitude: 63.4305,
    height: 1500,
    heading: 0,
    pitch: -45,
  },
};
