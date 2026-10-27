import {
  Cartesian3,
  createOsmBuildingsAsync,
  EllipsoidTerrainProvider,
  Matrix4,
  SplitDirection,
} from 'cesium';
import { showMessage } from '../state/messages.js';
import { settleSplat } from './splat.js';

/**
 * Reference layers for the alignment check: terrain, imagery and OSM buildings
 * are independent geodata to compare a splat's georeferencing against.
 */

const FLAT = new EllipsoidTerrainProvider();

/**
 * Switch between Cesium World Terrain and the bare WGS84 ellipsoid (height 0).
 * @param {import('cesium').Viewer} viewer
 * @param {import('cesium').TerrainProvider} worldTerrain - provider to restore.
 * @param {boolean} enabled
 */
export function setTerrainEnabled(viewer, worldTerrain, enabled) {
  viewer.terrainProvider = enabled ? worldTerrain : FLAT;
  viewer.scene.requestRender();
}

/**
 * Show or hide the base imagery layer (the globe turns its base colour).
 * @param {import('cesium').Viewer} viewer
 * @param {boolean} visible
 */
export function setImageryVisible(viewer, visible) {
  const base = viewer.imageryLayers.get(0);
  if (base) base.show = visible;
  viewer.scene.requestRender();
}

/**
 * Load Cesium OSM Buildings (ion 96188, our own token) and add them to the scene.
 * @param {import('cesium').Viewer} viewer
 * @returns {Promise<import('cesium').Cesium3DTileset | undefined>} undefined if loading failed.
 */
export async function loadBuildings(viewer) {
  const hideLoading = showMessage('Loading OSM buildings…');
  try {
    const tileset = await createOsmBuildingsAsync();
    if (viewer.isDestroyed()) {
      tileset.destroy();
      return undefined;
    }
    viewer.scene.primitives.add(tileset);
    return tileset;
  } catch (error) {
    console.error('OSM buildings failed to load:', error);
    showMessage('OSM buildings could not be loaded.', 'error');
    return undefined;
  } finally {
    hideLoading();
  }
}

/**
 * Translate a tileset by a fixed ECEF offset, or remove the offset.
 * The offset is applied through the tileset's modelMatrix, on top of its root transform.
 * @param {import('cesium').Scene} scene
 * @param {import('cesium').Cesium3DTileset} tileset
 * @param {[number, number, number] | undefined} offset - ECEF (EPSG:4978) metres.
 */
export function setTilesetOffset(scene, tileset, offset) {
  tileset.modelMatrix = offset
    ? Matrix4.fromTranslation(Cartesian3.fromArray(offset))
    : Matrix4.clone(Matrix4.IDENTITY);
  // Render now (not just request a frame), so the tileset's bounding sphere is
  // updated before the UI reads it; then keep rendering while the splats re-sort.
  scene.render();
  settleSplat(tileset);
}

/**
 * Swipe comparison: draw `left` only left of the split line and `right` only right
 * of it. Everything else (terrain, imagery, buildings) is drawn on both sides.
 * @param {import('cesium').Scene} scene
 * @param {{left?: {splitDirection: number}, right?: {splitDirection: number}, position?: number}} split
 *   position: fraction of the canvas width (0–1); undefined turns the split off.
 */
export function setSplit(scene, { left, right, position }) {
  const on = position !== undefined;
  if (left) left.splitDirection = on ? SplitDirection.LEFT : SplitDirection.NONE;
  if (right) right.splitDirection = on ? SplitDirection.RIGHT : SplitDirection.NONE;
  if (on) scene.splitPosition = position;
  scene.requestRender();
}
