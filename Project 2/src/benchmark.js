import { Cesium3DTileset, EllipsoidTerrainProvider } from 'cesium';
import { CAMERA_VIEWS } from './config.js';
import { toCameraOptions } from './utils/camera.js';
import { summarizeFrames } from './utils/frameStats.js';

/** Check interval for "everything in view has loaded", in ms. */
const POLL_MS = 50;
/**
 * Consecutive polls the loaded state must hold. Right after terrain or a tileset
 * becomes ready, tilesLoaded can be true for a moment before any tile is queued.
 */
const STABLE_POLLS = 4;

/** All 3D Tiles tilesets in the scene. */
function tilesetsIn(scene) {
  const tilesets = [];
  for (let i = 0; i < scene.primitives.length; i += 1) {
    const primitive = scene.primitives.get(i);
    if (primitive instanceof Cesium3DTileset) tilesets.push(primitive);
  }
  return tilesets;
}

/**
 * True when World Terrain is in use (not the smooth ellipsoid the Viewer starts with)
 * and terrain and every tileset have loaded all tiles for the current view.
 */
function allTilesLoaded(scene) {
  const tilesets = tilesetsIn(scene);
  return (
    !(scene.globe.terrainProvider instanceof EllipsoidTerrainProvider) &&
    scene.globe.tilesLoaded &&
    tilesets.length > 0 &&
    tilesets.every((tileset) => tileset.tilesLoaded)
  );
}

/**
 * Benchmark hooks for scripts/benchmark-buildings.js, exposed as window.__benchmark.
 * Only bundled when the app is built with VITE_BENCHMARK=true.
 * @param {import('cesium').Viewer} viewer
 * @returns {() => void} call to stop polling and remove window.__benchmark.
 */
export function installBenchmark(viewer) {
  const { scene, camera } = viewer;
  let firstLoadMs;
  let candidateMs;
  let stablePolls = 0;
  const timer = setInterval(() => {
    if (!allTilesLoaded(scene)) {
      stablePolls = 0;
      return;
    }
    // Milliseconds since navigation start (performance.now's time origin), taken
    // when the loaded state first appeared, not when it was confirmed.
    if (stablePolls === 0) candidateMs = performance.now();
    stablePolls += 1;
    if (stablePolls >= STABLE_POLLS) {
      firstLoadMs = candidateMs;
      clearInterval(timer);
    }
  }, POLL_MS);

  window.__benchmark = {
    /** @returns {number | undefined} ms from navigation to the first fully loaded view. */
    firstLoadMs: () => firstLoadMs,
    /** @returns {number} memory held by the loaded tiles of all tilesets, bytes. */
    tilesetBytes: () =>
      tilesetsIn(scene).reduce((sum, tileset) => sum + tileset.totalMemoryUsageInBytes, 0),
    /**
     * Orbit 360° around the Midtbyen target at its preset pitch and range, rendering
     * every frame, and time the frames.
     * @param {number} durationMs
     * @returns {Promise<ReturnType<typeof summarizeFrames>>}
     */
    orbit: (durationMs) =>
      new Promise((resolve) => {
        const view = CAMERA_VIEWS.trondheimCentre;
        const timestamps = [];
        const previousRenderMode = scene.requestRenderMode;
        let start;
        scene.requestRenderMode = false; // render continuously during the orbit
        const removePre = scene.preRender.addEventListener(() => {
          start ??= performance.now();
          const fraction = Math.min((performance.now() - start) / durationMs, 1);
          camera.setView(toCameraOptions({ ...view, heading: view.heading + 360 * fraction }));
        });
        const removePost = scene.postRender.addEventListener(() => {
          timestamps.push(performance.now());
          if (performance.now() - start < durationMs) return;
          removePre();
          removePost();
          scene.requestRenderMode = previousRenderMode;
          resolve(summarizeFrames(timestamps));
        });
      }),
  };

  return () => {
    clearInterval(timer);
    delete window.__benchmark;
  };
}
