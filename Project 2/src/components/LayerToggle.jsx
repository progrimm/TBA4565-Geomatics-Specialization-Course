import { useState } from 'react';
import { setLayerVisible } from '../layers/visibility.js';

const STATUS_TEXT = { loading: 'Loading…', error: 'Unavailable' };

/**
 * On/off switch for an asynchronously loaded layer. Disabled until the layer is
 * ready, and stays disabled if loading failed.
 * @param {object} props
 * @param {string} props.label
 * @param {import('../hooks/useAsyncLayer.js').LayerState} props.state
 * @param {import('cesium').Scene} [props.scene]
 * @param {string} [props.swatch] - CSS colour of the legend dot.
 * @param {boolean} [props.initiallyVisible] - must match the layer's own initial `show`.
 * @param {(visible: boolean) => void} [props.onToggle] - called after the layer is shown or hidden.
 */
export default function LayerToggle({
  label,
  state,
  scene,
  swatch,
  initiallyVisible = true,
  onToggle,
}) {
  const [visible, setVisible] = useState(initiallyVisible);
  const ready = state.status === 'ready';

  const onChange = (event) => {
    setVisible(event.target.checked);
    setLayerVisible(scene, state.layer, event.target.checked);
    onToggle?.(event.target.checked);
  };

  return (
    <li>
      <label className="layer">
        {swatch && (
          <span className="layer__swatch" style={{ background: swatch }} aria-hidden="true" />
        )}
        <span className="layer__name">{label}</span>
        {!ready && <span className="layer__status">{STATUS_TEXT[state.status]}</span>}
        <input
          type="checkbox"
          className="switch"
          role="switch"
          checked={ready && visible}
          disabled={!ready}
          onChange={onChange}
        />
      </label>
    </li>
  );
}
