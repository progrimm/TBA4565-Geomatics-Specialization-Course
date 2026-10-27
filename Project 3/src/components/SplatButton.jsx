import { SPLAT } from '../config.js';
import { viewSplat } from '../layers/splat.js';
import { flightDuration } from '../utils/motion.js';

const STATUS_TEXT = { loading: 'Loading…', error: 'Unavailable' };

/**
 * Button that flies the camera back to the splat. The splat itself is loaded at
 * startup (see App.jsx), so the button is disabled until it is ready.
 * @param {object} props
 * @param {import('cesium').Camera} [props.camera]
 * @param {import('../hooks/useAsyncLayer.js').LayerState} props.state - splat loading state.
 */
export default function SplatButton({ camera, state }) {
  const ready = Boolean(camera) && state.status === 'ready';

  return (
    <button
      type="button"
      className="view-button"
      disabled={!ready}
      aria-busy={state.status === 'loading'}
      onClick={() => viewSplat(camera, state.layer, flightDuration())}
    >
      {SPLAT.label}
      <span className="view-button__meta">{STATUS_TEXT[state.status] ?? SPLAT.location}</span>
    </button>
  );
}
