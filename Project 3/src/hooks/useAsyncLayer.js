import { useEffect, useState } from 'react';

/** @typedef {{status: 'loading' | 'ready' | 'error', layer?: {show: boolean}}} LayerState */

/** @type {LayerState} */
const LOADING = { status: 'loading' };

/**
 * Load a layer into a viewer and track its loading state.
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {(viewer: import('cesium').Viewer) => Promise<{show: boolean} | undefined>} load -
 *   layer loader (e.g. addBuildings); must be a stable reference.
 * @returns {LayerState}
 */
export function useAsyncLayer(viewer, load) {
  const [result, setResult] = useState({ viewer: undefined, ...LOADING });

  useEffect(() => {
    if (!viewer) return undefined;
    let active = true;
    load(viewer).then((layer) => {
      if (active) setResult({ viewer, status: layer ? 'ready' : 'error', layer });
    });
    return () => {
      active = false;
    };
  }, [viewer, load]);

  // A result from a previous viewer (e.g. before a remount) is not valid for this one.
  return result.viewer === viewer ? result : LOADING;
}
