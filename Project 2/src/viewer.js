import { Ion, Viewer } from 'cesium';
import { showMessage } from './state/messages.js';

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
 * @param {string | Element} container - DOM element (or its id) to render into.
 * @param {object} options
 * @param {import('cesium').Terrain} options.terrain - terrain to load asynchronously.
 * @returns {Viewer}
 */
export function createViewer(container, { terrain }) {
  return new Viewer(container, {
    terrain,
    // Only re-render when something changes: saves CPU/GPU and battery.
    requestRenderMode: true,
    // Hide built-in widgets replaced by our own panel. Credits and InfoBox stay:
    // attribution is required by Cesium ion's terms and the data licences.
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
  });
}
