import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NEAREST } from '../config.js';
import { toShelterRecords } from '../layers/shelters.js';
import { highlightBuildings } from '../layers/buildings.js';
import { drawClickedPoint, drawNearestLine, onGroundClick } from '../layers/nearest.js';
import { findNearest } from '../utils/nearest.js';
import { findWalkInRange, snapShelters } from '../utils/network.js';
import { buildingsOnPath } from '../utils/passages.js';
import { geoidHeight } from '../utils/geoid.js';
import { GEOID_GRID } from '../utils/geoidGrid.js';

/**
 * @typedef {{shelter: import('../utils/nearest.js').Shelter, distance: number,
 *   walk?: import('../utils/network.js').Walk,
 *   through?: import('../utils/passages.js').PassageBuilding[]}} NearestResult
 *   distance: straight-line (geodesic) metres; walk: undefined when the walking
 *   network is not available; through: buildings the walk passes through.
 * @typedef {{reason: 'far' | 'unreachable', connector?: number}} OutOfRange
 *   connector: geodesic metres from the click to the nearest network node.
 * @typedef {{ellipsoidal: number, geoid?: number, nn2000?: number}} GroundHeight
 *   The clicked ground point's height on Cesium World Terrain: ellipsoidal (h), the
 *   geoid height (N) and the NN2000 height (H = h − N); N and H are undefined outside
 *   the geoid grid.
 */

/**
 * Heights of a clicked ground point.
 * @param {import('../utils/nearest.js').LonLat & {height: number}} point
 * @returns {GroundHeight}
 */
function groundHeight(point) {
  const geoid = geoidHeight(point, GEOID_GRID);
  return {
    ellipsoidal: point.height,
    geoid,
    nn2000: geoid === undefined ? undefined : point.height - geoid,
  };
}

/**
 * Find the nearest shelter: by walking distance when the network graph is ready
 * (refusing clicks out of the network's range), otherwise by straight-line distance.
 * @param {import('../utils/nearest.js').LonLat} point
 * @param {{shelters: import('../utils/nearest.js').Shelter[], graph?: object,
 *   shelterNodes?: Map, passages?: Map}} analysis
 * @returns {{nearest?: NearestResult, outOfRange?: OutOfRange}}
 */
function findNearestShelter(point, { shelters, graph, shelterNodes, passages }) {
  if (!graph) return { nearest: findNearest(point, shelters) };
  const { nearest, outOfRange } = findWalkInRange(point, graph, shelterNodes, NEAREST.maxConnector);
  if (!nearest) return { outOfRange };
  const through = passages ? buildingsOnPath(nearest.walk.nodes, passages) : [];
  return { nearest: { ...nearest, through } };
}

/** Draw a result: the route and the buildings it passes through, or only the clicked point. */
function drawResult(viewer, tileset, point, nearest) {
  const { outOfRangeColor, passageColor } = NEAREST.style;
  if (!nearest) return drawClickedPoint(viewer, point, outOfRangeColor);
  const removeLine = drawNearestLine(viewer, point, nearest);
  const removeHighlight =
    tileset && nearest.through
      ? highlightBuildings(viewer.scene, tileset, nearest.through, passageColor)
      : () => {};
  return () => {
    removeLine();
    removeHighlight();
  };
}

/**
 * "Nearest shelter" analysis: once the shelters are loaded, every click on the
 * ground finds the nearest shelter and draws a line (the walking route if
 * available) to it, replacing the last one. A click out of the walking network's
 * range draws only the clicked point and reports `outOfRange` instead. Buildings
 * the route passes through are highlighted in the buildings tileset.
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {import('./useAsyncLayer.js').LayerState} sheltersState - from useAsyncLayer(addShelters).
 * @param {{graph?: import('../utils/network.js').Graph, passages?: Map}} networkState - from useWalkingNetwork().
 * @param {import('./useAsyncLayer.js').LayerState} buildingsState - from useAsyncLayer(addBuildings).
 * @returns {{shelters: import('../utils/nearest.js').Shelter[], nearest?: NearestResult,
 *   outOfRange?: OutOfRange, ground?: GroundHeight, dismissOutOfRange: () => void}}
 */
export function useNearestShelter(viewer, sheltersState, networkState, buildingsState) {
  const { graph, passages } = networkState;
  const analysis = useMemo(() => {
    const shelters = sheltersState.status === 'ready' ? toShelterRecords(sheltersState.layer) : [];
    // Snapping shelters to the network once here keeps each click fast.
    const shelterNodes = graph && snapShelters(graph, shelters);
    return { shelters, graph, shelterNodes, passages };
  }, [sheltersState, graph, passages]);
  const [result, setResult] = useState({ analysis: undefined });

  // A ref, not an effect dependency: the buildings finishing loading must not
  // clear the current result. Read on each click.
  const tilesetRef = useRef();
  useEffect(() => {
    tilesetRef.current = buildingsState.layer;
  }, [buildingsState]);

  useEffect(() => {
    if (!viewer || analysis.shelters.length === 0) return undefined;
    let removeDrawing = () => {};
    const stopListening = onGroundClick(viewer, (point) => {
      const { nearest, outOfRange } = findNearestShelter(point, analysis);
      removeDrawing();
      removeDrawing = drawResult(viewer, tilesetRef.current, point, nearest);
      setResult({ analysis, nearest, outOfRange, ground: groundHeight(point) });
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
    ground: current.ground,
    dismissOutOfRange,
  };
}
