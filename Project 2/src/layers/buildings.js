import { Cesium3DTileStyle, createOsmBuildingsAsync } from 'cesium';
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

/**
 * Colour some OSM buildings in the tileset, e.g. the ones a route passes through.
 * Uses the 3D Tiles styling language: a Cesium3DTileStyle `conditions` expression
 * matches each feature's `elementType`/`elementId` (the OSM way or relation it was
 * built from); every other feature keeps the tileset's previous colour expression.
 * https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileStyle.html
 * @param {import('cesium').Scene} scene - used to request a render (requestRenderMode is on).
 * @param {import('cesium').Cesium3DTileset} tileset - Cesium OSM Buildings.
 * @param {Array<{type: 'way' | 'relation', id: number}>} buildings - OSM elements.
 * @param {string} color - CSS colour.
 * @returns {() => void} call to restore the previous style.
 */
export function highlightBuildings(scene, tileset, buildings, color) {
  if (buildings.length === 0) return () => {};
  const original = tileset.style;
  // Integer ids and the fixed type names come from our own data file, not user input.
  const match = buildings
    .map(({ type, id }) => `(\${elementType} === '${type}' && \${elementId} === ${Number(id)})`)
    .join(' || ');
  tileset.style = new Cesium3DTileStyle({
    color: {
      conditions: [
        [match, `color('${color}')`],
        ['true', original?.color?.expression ?? "color('white')"],
      ],
    },
  });
  scene.requestRender();
  return () => {
    if (tileset.isDestroyed()) return;
    tileset.style = original;
    scene.requestRender();
  };
}
