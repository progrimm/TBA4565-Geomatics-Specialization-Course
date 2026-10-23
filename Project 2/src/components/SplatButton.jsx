import { useRef, useState } from 'react';
import { SPLAT } from '../config.js';
import { loadSplat } from '../layers/splat.js';
import { flightDuration } from '../utils/motion.js';

const STATUS_TEXT = { loading: 'Loading…', error: 'Unavailable' };

/**
 * Button that lazily loads the Gaussian splat tileset on first click, then flies
 * the camera to it. Later clicks reuse the loaded tileset.
 * @param {{viewer?: import('cesium').Viewer}} props
 */
export default function SplatButton({ viewer }) {
  const [status, setStatus] = useState('idle');
  // One load per viewer: the promise is shared, so double clicks don't load twice.
  const pending = useRef({ viewer: undefined, promise: undefined });

  const onClick = async () => {
    if (pending.current.viewer !== viewer) {
      setStatus('loading');
      pending.current = { viewer, promise: loadSplat(viewer) };
    }
    const tileset = await pending.current.promise;
    if (!tileset) {
      setStatus('error');
      return;
    }
    setStatus('ready');
    viewer.camera.flyToBoundingSphere(tileset.boundingSphere, { duration: flightDuration() });
  };

  return (
    <button
      type="button"
      className="view-button"
      disabled={!viewer || status === 'error'}
      aria-busy={status === 'loading'}
      onClick={onClick}
    >
      {SPLAT.label}
      <span className="view-button__meta">{STATUS_TEXT[status] ?? SPLAT.location}</span>
    </button>
  );
}
