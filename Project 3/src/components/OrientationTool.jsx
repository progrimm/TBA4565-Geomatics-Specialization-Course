import { UP_AXES } from '../config.js';
import Tool from './Tool.jsx';

const LABELS = { '+y': '+Y', '-y': '−Y', '+z': '+Z', '-z': '−Z' };

/**
 * Which file axis points up, and a view reset.
 * @param {{upAxis: string, onUpAxis: (axis: string) => void, onReset: () => void,
 *   levelled: boolean}} props
 *   levelled: an assigned coordinate system sets which way is up (the user's +Z), so the up axis is not used.
 */
export default function OrientationTool({ upAxis, onUpAxis, onReset, levelled }) {
  return (
    <Tool id="orientation" title="Orientation">
      <div className="tool__actions" role="group" aria-label="Up axis in the file">
        <span className="tool__label">Up axis</span>
        {UP_AXES.map((axis) => (
          <button
            key={axis}
            className="chip"
            type="button"
            aria-pressed={!levelled && upAxis === axis}
            disabled={levelled}
            onClick={() => onUpAxis(axis)}
          >
            {LABELS[axis]}
          </button>
        ))}
      </div>
      <p className="tool__note">
        {levelled
          ? 'Up comes from your coordinate system (its +Z). Clear it to choose the up axis again.'
          : '3DGS training output usually has −Y up; GIS and CAD data usually +Z.'}
      </p>
      <div className="tool__actions">
        <button className="chip" type="button" onClick={onReset}>
          Reset view
        </button>
      </div>
    </Tool>
  );
}
