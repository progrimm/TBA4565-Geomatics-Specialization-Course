import { UP_AXES } from '../config.js';

const LABELS = { '+y': '+Y', '-y': '−Y', '+z': '+Z', '-z': '−Z' };

/**
 * Which file axis points up, and a view reset.
 * @param {{upAxis: string, onUpAxis: (axis: string) => void, onReset: () => void}} props
 */
export default function OrientationTool({ upAxis, onUpAxis, onReset }) {
  return (
    <section className="tool" aria-labelledby="orientation-heading">
      <h2 className="tool__summary" id="orientation-heading">
        Orientation
      </h2>
      <div className="tool__actions" role="group" aria-label="Up axis in the file">
        <span className="tool__label">Up axis</span>
        {UP_AXES.map((axis) => (
          <button
            key={axis}
            className="chip"
            type="button"
            aria-pressed={upAxis === axis}
            onClick={() => onUpAxis(axis)}
          >
            {LABELS[axis]}
          </button>
        ))}
      </div>
      <p className="tool__note">
        3DGS training output usually has −Y up; GIS and CAD data usually +Z.
      </p>
      <div className="tool__actions">
        <button className="chip" type="button" onClick={onReset}>
          Reset view
        </button>
      </div>
    </section>
  );
}
