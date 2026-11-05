import { useCallback, useEffect, useMemo, useState } from 'react';
import { NEAREST } from '../config.js';
import { toShelterRecords } from '../layers/shelters.js';
import { drawClickedPoint, drawNearestLine, onGroundClick } from '../layers/nearest.js';
import { findNearest } from '../utils/nearest.js';
import { findWalkInRange, snapShelters } from '../utils/network.js';

/**
 * @typedef {{shelter: import('../utils/nearest.js').Shelter, distance: number,
 *   walk?: import('../utils/network.js').Walk}} NearestResult
 *   distance: straight-line (geodesic) metres; walk: undefined when the walking
 *   network is not available.
 * @typedef {{reason: 'far' | 'unreachable', connector?: number}} OutOfRange
 *   connector: geodesic metres from the click to the nearest network node.
 */

/**
 * Find the nearest shelter: by walking distance when the network graph is ready
 * (refusing clicks out of the network's range), otherwise by straight-line distance.
 * @param {import('../utils/nearest.js').LonLat} point
 * @param {{shelters: import('../utils/nearest.js').Shelter[], graph?: object, shelterNodes?: Map}} analysis
 * @returns {{nearest?: NearestResult, outOfRange?: OutOfRange}}
 */
function findNearestShelter(point, { shelters, graph, shelterNodes }) {
  if (!graph) return { nearest: findNearest(point, shelters) };
  return findWalkInRange(point, graph, shelterNodes, NEAREST.maxConnector);
}

/**
 * "Nearest shelter" analysis: once the shelters are loaded, every click on the
 * ground finds the nearest shelter and draws a line (the walking route if
 * available) to it, replacing the last one. A click out of the walking network's
 * range draws only the clicked point and reports `outOfRange` instead.
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {import('./useAsyncLayer.js').LayerState} sheltersState - from useAsyncLayer(addShelters).
 * @param {{graph?: import('../utils/network.js').Graph}} networkState - from useWalkingNetwork().
 * @returns {{shelters: import('../utils/nearest.js').Shelter[], nearest?: NearestResult,
 *   outOfRange?: OutOfRange, dismissOutOfRange: () => void}}
 */
export function useNearestShelter(viewer, sheltersState, networkState) {
  const { graph } = networkState;
  const analysis = useMemo(() => {
    const shelters = sheltersState.status === 'ready' ? toShelterRecords(sheltersState.layer) : [];
    // Snapping shelters to the network once here keeps each click fast.
    const shelterNodes = graph && snapShelters(graph, shelters);
    return { shelters, graph, shelterNodes };
  }, [sheltersState, graph]);
  const [result, setResult] = useState({ analysis: undefined });

  useEffect(() => {
    if (!viewer || analysis.shelters.length === 0) return undefined;
    let removeDrawing = () => {};
    const stopListening = onGroundClick(viewer, (point) => {
      const { nearest, outOfRange } = findNearestShelter(point, analysis);
      removeDrawing();
      removeDrawing = nearest
        ? drawNearestLine(viewer, point, nearest)
        : drawClickedPoint(viewer, point, NEAREST.style.outOfRangeColor);
      setResult({ analysis, nearest, outOfRange });
    });
    return () => {
      stopListening();
      removeDrawing();
    };
  }, [viewer, analysis]);

  const dismissOutOfRange = useCallback(
    () => setResult((previous) => ({ ...previous, outOfRange: undefined })),
    [],
  );

  // The drawing is removed when the analysis changes (e.g. the network finished
  // loading or the viewer remounted), so the old result is no longer shown.
  const current = result.analysis === analysis ? result : {};
  return {
    shelters: analysis.shelters,
    nearest: current.nearest,
    outOfRange: current.outOfRange,
    dismissOutOfRange,
  };
}
