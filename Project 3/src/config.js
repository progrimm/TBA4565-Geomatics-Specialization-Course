/**
 * App-wide constants. No magic numbers elsewhere in the code.
 */

/** Cesium ion token, injected by Vite from .env (VITE_CESIUM_TOKEN). */
export const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;

/** Media query for the mobile layout. Keep in sync with the breakpoint in style.css. */
export const MOBILE_QUERY = '(max-width: 640px)';

/**
 * 3D Gaussian splat: Microsoft Redmond Campus, USA (Cesium ion asset).
 * Georeferenced: the tileset's root transform places it on the globe (ECEF,
 * WGS84 ellipsoidal heights), so the camera uses the tileset's own bounding
 * sphere and no coordinates are needed here.
 * maximumScreenSpaceError (SSE, in pixels) controls when a tile is refined:
 * lower = sharper but more tiles; Cesium default is 16.
 */
export const SPLAT = {
  ionAssetId: 4547222,
  label: 'Microsoft campus',
  location: 'Redmond, USA',
  tilesetSettings: {
    maximumScreenSpaceError: 8,
  },
};
