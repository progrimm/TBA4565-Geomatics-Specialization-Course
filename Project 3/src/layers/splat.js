import { Cesium3DTileset, IonResource, ITwinData } from 'cesium';
import { SPLAT_TILESET_SETTINGS } from '../config.js';
import { showMessage } from '../state/messages.js';
import { CESIUM_EVALUATION_TOKEN } from '../viewer.js';
import { startTimer, trackTileset } from './stats.js';

/** How long to keep rendering after a tile load or camera stop (milliseconds). */
const SETTLE_MS = 3000;

/**
 * Keep rendering for a short while after tiles load and after the camera stops.
 * With requestRenderMode, Cesium only draws a frame when something requests one.
 * In CesiumJS 1.146 the Gaussian splat primitive sorts splats by depth in a web
 * worker, and nothing requests a frame when that sort finishes. Without this, a
 * single-tile splat (e.g. the dam) stays invisible until the camera moves.
 * @param {import('cesium').Scene} scene
 * @param {Cesium3DTileset} tileset
 */
function renderWhileSorting(scene, tileset) {
  let until = 0;
  const extend = () => {
    until = performance.now() + SETTLE_MS;
    scene.requestRender();
  };
  tileset.tileLoad.addEventListener(extend);
  tileset.allTilesLoaded.addEventListener(extend);
  scene.camera.moveEnd.addEventListener(() => tileset.show && extend());
  scene.postRender.addEventListener(() => {
    if (performance.now() < until) scene.requestRender();
  });
}

/**
 * Load a public Cesium ion 3D Tiles asset with Cesium's evaluation token.
 * The gallery assets belong to Cesium's own ion account and are not in the Asset
 * Depot, so they are requested with the evaluation token, as in Cesium's tutorials.
 * Cesium3DTileset.fromIonAssetId cannot take a per-asset token, so its two
 * steps are done here explicitly.
 * @param {number} assetId
 * @param {object} [settings] - Cesium3DTileset constructor options.
 * @returns {Promise<Cesium3DTileset>}
 */
export async function loadIonTileset(assetId, settings = SPLAT_TILESET_SETTINGS) {
  const resource = await IonResource.fromAssetId(assetId, {
    accessToken: CESIUM_EVALUATION_TOKEN,
  });
  return Cesium3DTileset.fromUrl(resource, settings);
}

/**
 * Load a splat tileset (3D Tiles with glTF Gaussian splat content) from its source.
 * @param {import('../config.js').SplatSource} source
 * @returns {Promise<Cesium3DTileset>}
 */
function loadSource(source) {
  if (source.type === 'itwin') {
    // Reads the reality data's metadata and a signed URL from the iTwin Platform
    // (authorised by ITwinPlatform.defaultShareKey), then loads the tileset.
    return ITwinData.createTilesetForRealityDataId({
      iTwinId: source.iTwinId,
      realityDataId: source.realityDataId,
      tilesetOptions: SPLAT_TILESET_SETTINGS,
    });
  }
  return loadIonTileset(source.assetId);
}

/**
 * Load a gallery tileset and add it to the scene.
 * @param {import('cesium').Viewer} viewer
 * @param {{label: string, load: () => Promise<Cesium3DTileset>}} item - what to load.
 * @returns {Promise<Cesium3DTileset | undefined>} the tileset, or undefined if
 *   loading failed (the error is shown to the user).
 */
async function addTileset(viewer, { label, load }) {
  const hideLoading = showMessage(`Loading ${label}…`);
  const elapsed = startTimer();
  try {
    const tileset = await load();
    // The viewer may have been destroyed while loading (e.g. React StrictMode remount).
    if (viewer.isDestroyed()) {
      tileset.destroy();
      return undefined;
    }
    viewer.scene.primitives.add(tileset);
    renderWhileSorting(viewer.scene, tileset);
    trackTileset(tileset, elapsed);
    return tileset;
  } catch (error) {
    console.error(`${label} failed to load:`, error);
    showMessage(`${label} could not be loaded.`, 'error');
    return undefined;
  } finally {
    hideLoading();
  }
}

/**
 * Load a gallery splat and add it to the scene.
 * @param {import('cesium').Viewer} viewer
 * @param {import('../config.js').Splat} splat
 * @returns {Promise<Cesium3DTileset | undefined>} the tileset, or undefined if loading failed.
 */
export function loadSplat(viewer, splat) {
  return addTileset(viewer, { label: splat.label, load: () => loadSource(splat.source) });
}

/**
 * Load the triangle mesh that belongs to a splat (same scene, other representation).
 * @param {import('cesium').Viewer} viewer
 * @param {{assetId: number, label: string}} mesh
 * @returns {Promise<Cesium3DTileset | undefined>} the tileset, or undefined if loading failed.
 */
export function loadMesh(viewer, mesh) {
  return addTileset(viewer, { label: mesh.label, load: () => loadIonTileset(mesh.assetId, {}) });
}

/**
 * Move the camera so the whole tileset is in view.
 * @param {import('cesium').Camera} camera
 * @param {Cesium3DTileset} tileset
 * @param {number} [duration] - flight time in seconds: 0 jumps, undefined lets
 *   Cesium pick a duration from the flight distance.
 */
export function viewSplat(camera, tileset, duration) {
  camera.flyToBoundingSphere(tileset.boundingSphere, { duration });
}
