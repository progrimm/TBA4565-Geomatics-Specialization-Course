import { useCallback, useEffect, useState } from 'react';
import { distance } from '../utils/measure.js';
import { usePointPicking } from './usePointPicking.js';

/**
 * Two-point measurement: while active, clicks on the splat pick points.
 * @param {ReturnType<import('../viewer/splatViewer.js').createSplatViewer> | null} viewer
 * @param {import('react').RefObject<HTMLCanvasElement>} canvasRef
 * @param {unknown} splatKey - changes when a new splat is loaded (clears the points).
 * @param {boolean} active - picking points now (exclusive with the other picking tools).
 * @param {(active: boolean) => void} setActive
 * @returns {{active: boolean, setActive: (active: boolean) => void, points: number[][],
 *   distance: number | null, missed: boolean, clear: () => void}}
 *   missed = the last click did not hit the splat.
 */
export function useMeasurement(viewer, canvasRef, splatKey, active, setActive) {
  const [points, setPoints] = useState([]);
  const [missed, setMissed] = useState(false);
  const [pointsKey, setPointsKey] = useState(splatKey);

  // A new splat: drop the old points (the viewer has already removed the markers).
  // Adjusting state during render: https://react.dev/learn/you-might-not-need-an-effect
  if (pointsKey !== splatKey) {
    setPointsKey(splatKey);
    setPoints([]);
    setMissed(false);
  }

  const clear = useCallback(() => {
    setPoints([]);
    setMissed(false);
  }, []);

  useEffect(() => {
    viewer?.setMarkers(points);
  }, [viewer, points]);

  const onPick = useCallback((point) => {
    setMissed(!point);
    if (point) setPoints((current) => (current.length >= 2 ? [point] : [...current, point]));
  }, []);
  usePointPicking(viewer, canvasRef, active, setActive, onPick);

  return {
    active,
    setActive,
    points,
    distance: points.length === 2 ? distance(points[0], points[1]) : null,
    missed,
    clear,
  };
}
