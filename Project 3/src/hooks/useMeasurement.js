import { useEffect, useRef, useState } from 'react';
import { ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium';
import { createMeasurementLayer, pickPoint } from '../layers/measurement.js';
import { showMessage } from '../state/messages.js';

const MESSAGE_TIMEOUT_MS = 4000;

/**
 * Two-point measurement: while active, each click on the scene picks a point.
 * A third click starts a new measurement.
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {boolean} active
 * @returns {{points: import('cesium').Cartesian3[], clear: () => void}}
 */
export function useMeasurement(viewer, active) {
  const [points, setPoints] = useState([]);
  // The drawing layer is a Cesium object, not render state: keep it in a ref.
  const layer = useRef();

  useEffect(() => {
    if (!viewer) return undefined;
    layer.current = createMeasurementLayer(viewer);
    return () => {
      layer.current.destroy();
      layer.current = undefined;
      setPoints([]);
    };
  }, [viewer]);

  // Declared after the effect above, so on mount the layer exists when this runs.
  useEffect(() => {
    layer.current?.setPoints(points);
  }, [viewer, points]);

  useEffect(() => {
    if (!viewer || !active) return undefined;
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(({ position }) => {
      const picked = pickPoint(viewer.scene, position);
      if (!picked) {
        const hide = showMessage('Nothing to measure there: click on the ground or a model.');
        setTimeout(hide, MESSAGE_TIMEOUT_MS);
        return;
      }
      setPoints((previous) => (previous.length >= 2 ? [picked] : [...previous, picked]));
    }, ScreenSpaceEventType.LEFT_CLICK);
    return () => handler.destroy();
  }, [viewer, active]);

  return { points, clear: () => setPoints([]) };
}
