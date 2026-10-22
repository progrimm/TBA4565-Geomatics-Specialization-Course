import { Ion, Viewer } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { showMessage } from './ui/notify.js';

/**
 * Set the Cesium ion access token. Must run before any ion asset (terrain,
 * tilesets) is requested, because requests read the token when they start.
 * @param {string | undefined} token - Cesium ion access token.
 */
export function configureIon(token) {
  if (token) {
    Ion.defaultAccessToken = token;
  } else {
    showMessage('No Cesium ion token configured: terrain and 3D layers will not load.', 'error');
  }
}

/**
 * Create the Cesium Viewer with global scene settings.
 * @param {string} containerId - id of the DOM element to render into.
 * @param {object} options
 * @param {import('cesium').Terrain} options.terrain - terrain to load asynchronously.
 * @returns {Viewer}
 */
export function createViewer(containerId, { terrain }) {
  return new Viewer(containerId, {
    terrain,
    // Only re-render when something changes: saves CPU/GPU and battery.
    requestRenderMode: true,
    animation: false,
    timeline: false,
  });
}
