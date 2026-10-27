import { useCallback, useState } from 'react';
import { createViewer } from '../viewer.js';
import { createTerrain } from '../layers/terrain.js';

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
    setViewer(instance);
    return () => {
      setViewer(undefined);
      instance.destroy(); // frees the WebGL context, tilesets and data sources
    };
  }, []);

  return [viewer, containerRef];
}
