import { useEffect, useRef } from 'react';
import { CLICK_TOLERANCE_PX } from '../config.js';

/**
 * Point picking on the splat: while active, a click (not a drag, which orbits) picks the
 * nearest splat under the pointer. Escape stops picking. Shared by the tools that pick points.
 * @param {ReturnType<import('../viewer/splatViewer.js').createSplatViewer> | null} viewer
 * @param {import('react').RefObject<HTMLCanvasElement>} canvasRef
 * @param {boolean} active
 * @param {(active: boolean) => void} setActive
 * @param {(point: number[] | null) => void} onPick - the picked point in file coordinates, or
 *   null when the click missed the splat.
 */
export function usePointPicking(viewer, canvasRef, active, setActive, onPick) {
  // The latest callbacks, so the listeners need not be re-attached when they change.
  const callbacks = useRef({ onPick, setActive });
  useEffect(() => {
    callbacks.current = { onPick, setActive };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!active || !viewer || !canvas) return undefined;
    let down = null;
    const onDown = (event) => {
      // Only the primary button (left mouse, touch, pen) picks; right-drag pans.
      down = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
    };
    const onUp = (event) => {
      if (!down) return;
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      down = null;
      if (moved > CLICK_TOLERANCE_PX) return;
      callbacks.current.onPick(viewer.pick(event.clientX, event.clientY));
    };
    const onKey = (event) => {
      // Escape inside a <details> or a form field belongs to that element.
      if (event.key === 'Escape' && !event.target.closest?.('details, input, select, textarea')) {
        callbacks.current.setActive(false);
      }
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
}
