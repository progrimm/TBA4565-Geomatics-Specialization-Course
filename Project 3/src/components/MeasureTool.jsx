import { formatLength } from '../utils/format.js';

/**
 * Two-point distance on the splat.
 * @param {{measurement: ReturnType<typeof import('../hooks/useMeasurement.js').useMeasurement>}} props
 */
export default function MeasureTool({ measurement }) {
  const { active, setActive, points, distance, missed, clear } = measurement;
  let status = 'Click a point on the splat.';
  if (points.length === 1) status = 'Click a second point.';
  if (distance !== null) status = `Distance: ${formatLength(distance)}`;
  if (missed) status = 'No splat under the pointer. Try again.';

  return (
    <section className="tool" aria-labelledby="measure-heading">
      <h2 className="tool__summary" id="measure-heading">
        Measure
      </h2>
      <div className="tool__actions">
        <button
          className="chip"
          type="button"
          aria-pressed={active}
          onClick={() => setActive(!active)}
        >
          {active ? 'Stop measuring' : 'Measure distance'}
        </button>
        <button className="chip" type="button" onClick={clear} disabled={points.length === 0}>
          Clear
        </button>
      </div>
      {(active || distance !== null) && (
        <p className="tool__note" role="status">
          {status}
        </p>
      )}
      <p className="tool__note">
        Picks the nearest splat under the pointer (mouse or touch only). A straight line in file
        units; Escape stops measuring.
      </p>
    </section>
  );
}
