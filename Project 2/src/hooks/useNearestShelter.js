import { useEffect, useMemo, useState } from 'react';
import { toShelterRecords } from '../layers/shelters.js';
import { drawNearestLine, onGroundClick } from '../layers/nearest.js';
import { findNearest } from '../utils/nearest.js';
import { findNearestByWalking, snapShelters } from '../utils/network.js';

/**
 * @typedef {{shelter: import('../utils/nearest.js').Shelter, distance: number,
 *   walk?: import('../utils/network.js').Walk}} NearestResult
 *   distance: straight-line (geodesic) metres; walk: undefined when the walking
 *   network is not available or no shelter is reachable on it.
 */

/**
 * Find the nearest shelter: by walking distance when the network graph is ready,
 * otherwise by straight-line distance.
 * @param {import('../utils/nearest.js').LonLat} point
 * @param {{shelters: import('../utils/nearest.js').Shelter[], graph?: object, shelterNodes?: Map}} analysis
 * @returns {NearestResult}
 */
function findNearestShelter(point, { shelters, graph, shelterNodes }) {
  return (
    (graph && findNearestByWalking(point, graph, shelterNodes)) ?? findNearest(point, shelters)
  );
}

/**
 * "Nearest shelter" analysis: once the shelters are loaded, every click on the
 * ground finds the nearest shelter and draws a line (the walking route if
 * available) to it, replacing the last one.
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {import('./useAsyncLayer.js').LayerState} sheltersState - from useAsyncLayer(addShelters).
 * @param {{graph?: import('../utils/network.js').Graph}} networkState - from useWalkingNetwork().
 * @returns {{shelters: import('../utils/nearest.js').Shelter[], nearest?: NearestResult}}
 */
export function useNearestShelter(viewer, sheltersState, networkState) {
  const { graph } = networkState;
  const analysis = useMemo(() => {
    const shelters = sheltersState.status === 'ready' ? toShelterRecords(sheltersState.layer) : [];
    // Snapping shelters to the network once here keeps each click fast.
    const shelterNodes = graph && snapShelters(graph, shelters);
    return { shelters, graph, shelterNodes };
  }, [sheltersState, graph]);
  const [result, setResult] = useState({ analysis: undefined, nearest: undefined });

  useEffect(() => {
    if (!viewer || analysis.shelters.length === 0) return undefined;
    let removeLine = () => {};
    const stopListening = onGroundClick(viewer, (point) => {
      const nearest = findNearestShelter(point, analysis);
      removeLine();
      removeLine = drawNearestLine(viewer, point, nearest);
      setResult({ analysis, nearest });
    });
    return () => {
      stopListening();
      removeLine();
    };
  }, [viewer, analysis]);

  // The line is removed when the analysis changes (e.g. the network finished
  // loading or the viewer remounted), so the old result is no longer shown.
  return {
    shelters: analysis.shelters,
    nearest: result.analysis === analysis ? result.nearest : undefined,
  };
}
