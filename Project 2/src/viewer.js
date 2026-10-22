import { Ion, Viewer, Terrain } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

/**
 * Create the Cesium Viewer with global scene settings.
 * @param {string} containerId - id of the DOM element to render into.
 * @param {string | undefined} token - Cesium ion access token.
 * @returns {Viewer}
 */
export function createViewer(containerId, token) {
  if (token) {
    Ion.defaultAccessToken = token;
  } else {
    console.warn('VITE_CESIUM_TOKEN is not set; ion assets will fail to load.');
  }

  return new Viewer(containerId, {
    terrain: Terrain.fromWorldTerrain(),
    // Only re-render when something changes: saves CPU/GPU and battery.
    requestRenderMode: true,
    animation: false,
    timeline: false,
  });
}
