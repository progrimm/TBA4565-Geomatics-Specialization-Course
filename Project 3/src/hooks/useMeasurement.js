import { useCallback, useEffect, useState } from 'react';
import { distance } from '../utils/measure.js';

/** A press that moves more than this (CSS px) is a drag (orbit), not a click. */
const CLICK_TOLERANCE_PX = 5;

/**
 * Two-point measurement: while active, clicks on the splat pick points.
 * @param {ReturnType<import('../viewer/splatViewer.js').createSplatViewer> | null} viewer
 * @param {import('react').RefObject<HTMLCanvasElement>} canvasRef
 * @param {unknown} splatKey - changes when a new splat is loaded (clears the points).
 * @returns {{active: boolean, setActive: (active: boolean) => void, points: number[][],
 *   distance: number | null, missed: boolean, clear: () => void}}
 *   missed = the last click did not hit the splat.
 */
export function useMeasurement(viewer, canvasRef, splatKey) {
  const [active, setActive] = useState(false);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !viewer || !canvas) return undefined;
    let down = null;
    const onDown = (event) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event) => {
      if (!down) return;
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      down = null;
      if (moved > CLICK_TOLERANCE_PX) return;
      const point = viewer.pick(event.clientX, event.clientY);
      setMissed(!point);
      if (point) setPoints((current) => (current.length >= 2 ? [point] : [...current, point]));
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setActive(false);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    canvas.style.cursor = 'crosshair';
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
      canvas.style.cursor = '';
    };
  }, [active, viewer, canvasRef]);

  return {
    active,
    setActive,
    points,
    distance: points.length === 2 ? distance(points[0], points[1]) : null,
    missed,
    clear,
  };
}
