import { Cesium3DTileset, IonResource } from 'cesium';
import { SPLAT } from '../config.js';
import { showMessage } from '../state/messages.js';
import { CESIUM_EVALUATION_TOKEN } from '../viewer.js';

/**
 * Load the Gaussian splat tileset (3D Tiles with KHR_gaussian_splatting content)
 * from Cesium ion and add it to the scene.
 * The asset is public but not in the Asset Depot, so it is requested with
 * Cesium's evaluation token instead of our own (as in Cesium's tutorial).
 * Cesium3DTileset.fromIonAssetId cannot take a per-asset token, so its two
 * steps are done here explicitly.
 * @param {import('cesium').Viewer} viewer
 * @returns {Promise<Cesium3DTileset | undefined>} the tileset, or undefined if
 *   loading failed (the error is shown to the user).
 */
export async function loadSplat(viewer) {
  const hideLoading = showMessage('Loading Gaussian splat…');
  try {
    const resource = await IonResource.fromAssetId(SPLAT.ionAssetId, {
      accessToken: CESIUM_EVALUATION_TOKEN,
    });
    const tileset = await Cesium3DTileset.fromUrl(resource, SPLAT.tilesetSettings);
    // The viewer may have been destroyed while loading (e.g. React StrictMode remount).
    if (viewer.isDestroyed()) {
      tileset.destroy();
      return undefined;
    }
    viewer.scene.primitives.add(tileset);
    return tileset;
  } catch (error) {
    console.error('Gaussian splat failed to load:', error);
    showMessage('The Gaussian splat showcase could not be loaded.', 'error');
    return undefined;
  } finally {
    hideLoading();
  }
}
