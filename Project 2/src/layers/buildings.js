import { createOsmBuildingsAsync } from 'cesium';
import { TILESET_SETTINGS } from '../config.js';
import { showMessage } from '../state/messages.js';

/**
 * Load Cesium OSM Buildings (3D Tiles) and add them to the scene.
 * Building heights are clamped to Cesium World Terrain (WGS84 ellipsoidal heights).
 * @param {import('cesium').Viewer} viewer
 * @returns {Promise<import('cesium').Cesium3DTileset | undefined>} the tileset,
 *   or undefined if loading failed (the error is shown to the user).
 */
export async function addBuildings(viewer) {
  const hideLoading = showMessage('Loading buildings…');
  try {
    const tileset = await createOsmBuildingsAsync(TILESET_SETTINGS.buildings);
    // The viewer may have been destroyed while loading (e.g. React StrictMode remount).
    if (viewer.isDestroyed()) {
      hideLoading();
      tileset.destroy();
      return undefined;
    }
    viewer.scene.primitives.add(tileset);
    // The tileset is ready once tileset.json is read, but tiles stream in afterwards:
    // keep the message until the first view is fully loaded.
    tileset.initialTilesLoaded.addEventListener(hideLoading);
    return tileset;
  } catch (error) {
    hideLoading();
    console.error('Buildings failed to load:', error);
    showMessage('3D buildings could not be loaded.', 'error');
    return undefined;
  }
}
