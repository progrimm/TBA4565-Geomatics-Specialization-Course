import { useEffect, useState } from 'react';
import { getTilesetStats } from '../layers/stats.js';
import { summariseFrames } from '../utils/frames.js';
import { setRequestRenderMode } from '../viewer.js';

const SAMPLE_MS = 1000;

/**
 * Live performance figures while `enabled`. Rendering is switched to continuous
 * (requestRenderMode off) during sampling, otherwise an idle scene renders no
 * frames and the frame rate would read 0.
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {import('cesium').Cesium3DTileset | undefined} tileset - selected splat.
 * @param {boolean} enabled
 * @returns {{fps: number, worstFrameMs: number, memoryBytes?: number, heapBytes?: number,
 *   stats?: import('../layers/stats.js').TilesetStats} | undefined}
 */
export function usePerformance(viewer, tileset, enabled) {
  const [sample, setSample] = useState();

  useEffect(() => {
    if (!viewer || !enabled) return undefined;
    const scene = viewer.scene;
    const previousMode = setRequestRenderMode(scene, false);

    let frames = [];
    const removeListener = scene.postRender.addEventListener(() => {
      frames.push(performance.now());
    });
    const interval = setInterval(() => {
      const summary = summariseFrames(frames, SAMPLE_MS);
      frames = [];
      setSample({
        ...summary,
        memoryBytes: tileset?.totalMemoryUsageInBytes,
        // Non-standard, Chromium only: undefined in other browsers.
        heapBytes: performance.memory?.usedJSHeapSize,
        stats: tileset && { ...getTilesetStats(tileset) },
      });
    }, SAMPLE_MS);

    return () => {
      clearInterval(interval);
      removeListener();
      if (!viewer.isDestroyed()) setRequestRenderMode(scene, previousMode);
      setSample(undefined);
    };
  }, [viewer, tileset, enabled]);

  return sample;
}
