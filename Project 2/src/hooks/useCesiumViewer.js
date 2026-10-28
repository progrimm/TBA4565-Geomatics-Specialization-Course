import { useCallback, useState } from 'react';
import { CAMERA_VIEWS } from '../config.js';
import { createViewer } from '../viewer.js';
import { createTerrain } from '../layers/terrain.js';
import { toCameraOptions } from '../utils/camera.js';

/**
 * Create a Cesium Viewer inside the element the returned ref is attached to,
 * and destroy it when that element unmounts (React 19 ref cleanup).
 * @returns {[import('cesium').Viewer | undefined, (element: HTMLElement) => () => void]}
 */
export function useCesiumViewer() {
  const [viewer, setViewer] = useState();

  // Stable callback ref: React calls it on mount and its returned cleanup on unmount.
  const containerRef = useCallback((element) => {
    const instance = createViewer(element, { terrain: createTerrain() });
    instance.camera.setView(toCameraOptions(CAMERA_VIEWS.trondheimCentre));
    setViewer(instance);
    // Benchmark builds only (scripts/benchmark-buildings.js); removed from normal builds.
    let uninstallBenchmark = () => {};
    if (import.meta.env.VITE_BENCHMARK === 'true') {
      import('../benchmark.js')
        .then(({ installBenchmark }) => {
          if (!instance.isDestroyed()) uninstallBenchmark = installBenchmark(instance);
        })
        .catch((error) => console.error('Benchmark hooks failed to load:', error));
    }
    return () => {
      uninstallBenchmark();
      setViewer(undefined);
      instance.destroy(); // frees the WebGL context, tilesets and data sources
    };
  }, []);

  return [viewer, containerRef];
}
