import { Fragment } from 'react';
import { applyLocalFrame } from '../utils/localFrame.js';
import { formatPoint, formatScaledLength } from '../utils/format.js';
import Tool from './Tool.jsx';

/**
 * Two-point distance on the splat; in the user's unit and frame when a scale or coordinate system is assigned.
 * @param {{measurement: ReturnType<typeof import('../hooks/useMeasurement.js').useMeasurement>,
 *   frame: import('../utils/localFrame.js').LocalFrame | null}} props
 */
export default function MeasureTool({ measurement, frame }) {
  const { active, setActive, points, distance, missed, clear } = measurement;
  let status = 'Click a point on the splat.';
  if (points.length === 1) status = 'Click a second point.';
  if (distance !== null) status = `Distance: ${formatScaledLength(distance, frame)}`;
  if (missed) status = 'No splat under the pointer. Try again.';

  return (
    <Tool id="measure" title="Measure">
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
      {frame && points.length > 0 && (
        <dl className="facts">
          {points.map((point, index) => (
            <Fragment key={index}>
              <dt>Point {index + 1}</dt>
              <dd>{formatPoint(applyLocalFrame(frame, point), frame.unit)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      <p className="tool__note">
        Picks the nearest splat under the pointer (mouse or touch only). A straight line in{' '}
        {frame ? `${frame.unit} (assigned scale)` : 'file units'}; Escape stops measuring.
      </p>
    </Tool>
  );
}
