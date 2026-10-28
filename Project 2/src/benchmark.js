import { Cesium3DTileset } from 'cesium';
import { CAMERA_VIEWS } from './config.js';
import { toCameraOptions } from './utils/camera.js';
import { summarizeFrames } from './utils/frameStats.js';

/** Check interval for "everything in view has loaded", in ms. */
const POLL_MS = 50;

/** True when terrain and every 3D Tiles tileset have loaded all tiles for the current view. */
function allTilesLoaded(scene) {
  const tilesets = [];
  for (let i = 0; i < scene.primitives.length; i += 1) {
    const primitive = scene.primitives.get(i);
    if (primitive instanceof Cesium3DTileset) tilesets.push(primitive);
  }
  return scene.globe.tilesLoaded && tilesets.length > 0 && tilesets.every((t) => t.tilesLoaded);
}

/**
 * Benchmark hooks for scripts/benchmark-buildings.js, exposed as window.__benchmark.
 * Only bundled when the app is built with VITE_BENCHMARK=true.
 * @param {import('cesium').Viewer} viewer
 */
export function installBenchmark(viewer) {
  const { scene, camera } = viewer;
  let firstLoadMs;
  const timer = setInterval(() => {
    if (viewer.isDestroyed()) return clearInterval(timer);
    if (allTilesLoaded(scene)) {
      // Milliseconds since navigation start (performance.now's time origin).
      firstLoadMs = performance.now();
      clearInterval(timer);
    }
    return undefined;
  }, POLL_MS);

  window.__benchmark = {
    /** @returns {number | undefined} ms from navigation to the first fully loaded view. */
    firstLoadMs: () => firstLoadMs,
    /** @returns {number} GPU/CPU memory held by the loaded tiles of all tilesets, bytes. */
    tilesetBytes: () => {
      let bytes = 0;
      for (let i = 0; i < scene.primitives.length; i += 1) {
        const primitive = scene.primitives.get(i);
        if (primitive instanceof Cesium3DTileset) bytes += primitive.totalMemoryUsageInBytes;
      }
      return bytes;
    },
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
          scene.requestRenderMode = true;
          resolve(summarizeFrames(timestamps));
        });
      }),
  };
}
