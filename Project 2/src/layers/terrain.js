import { Terrain } from 'cesium';
import { showMessage } from '../ui/notify.js';

/**
 * Create Cesium World Terrain (ion asset 1) with a loading message and error handling.
 * Heights are ellipsoidal (WGS84). If loading fails, the globe falls back to the
 * smooth ellipsoid and the user is told.
 * @returns {Terrain}
 */
export function createTerrain() {
  const terrain = Terrain.fromWorldTerrain();
  const hideLoading = showMessage('Loading terrain…');

  terrain.readyEvent.addEventListener(hideLoading);
  terrain.errorEvent.addEventListener((error) => {
    hideLoading();
    console.error('Terrain failed to load:', error);
    showMessage('Terrain could not be loaded. Showing a flat globe instead.', 'error');
  });
  return terrain;
}
