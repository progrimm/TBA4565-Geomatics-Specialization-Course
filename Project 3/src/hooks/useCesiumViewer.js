import { useCallback, useState } from 'react';
import { createViewer } from '../viewer.js';
import { createTerrain } from '../layers/terrain.js';
import { GLOBE_VIEW, MOBILE_QUERY } from '../config.js';
import { toGlobeCameraOptions } from '../utils/camera.js';

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
    // Opening view: the whole globe with a marker per splat.
    instance.camera.setView(
      toGlobeCameraOptions(GLOBE_VIEW, window.matchMedia(MOBILE_QUERY).matches),
    );
    setViewer(instance);
    return () => {
      setViewer(undefined);
      instance.destroy(); // frees the WebGL context, tilesets and data sources
    };
  }, []);

  return [viewer, containerRef];
}
