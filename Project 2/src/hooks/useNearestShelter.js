import { useEffect, useMemo, useState } from 'react';
import { toShelterRecords } from '../layers/shelters.js';
import { drawNearestLine, onGroundClick } from '../layers/nearest.js';
import { findNearest } from '../utils/nearest.js';

/**
 * "Nearest shelter" analysis: once the shelters are loaded, every click on the
 * ground finds the nearest shelter and draws a line to it (replacing the last one).
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {import('./useAsyncLayer.js').LayerState} sheltersState - from useAsyncLayer(addShelters).
 * @returns {{shelters: import('../utils/nearest.js').Shelter[],
 *   nearest?: {shelter: import('../utils/nearest.js').Shelter, distance: number}}}
 */
export function useNearestShelter(viewer, sheltersState) {
  const shelters = useMemo(
    () => (sheltersState.status === 'ready' ? toShelterRecords(sheltersState.layer) : []),
    [sheltersState],
  );
  const [result, setResult] = useState({ shelters: undefined, nearest: undefined });

  useEffect(() => {
    if (!viewer || shelters.length === 0) return undefined;
    let removeLine = () => {};
    const stopListening = onGroundClick(viewer, (point) => {
      const nearest = findNearest(point, shelters);
      removeLine();
      removeLine = drawNearestLine(viewer, point, nearest);
      setResult({ shelters, nearest });
    });
    return () => {
      stopListening();
      removeLine();
    };
  }, [viewer, shelters]);

  // A result for an older shelter list (e.g. before a viewer remount) is not valid anymore.
  return { shelters, nearest: result.shelters === shelters ? result.nearest : undefined };
}
