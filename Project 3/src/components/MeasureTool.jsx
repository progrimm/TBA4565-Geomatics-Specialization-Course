import { Fragment } from 'react';
import { applyGeoreference } from '../utils/georef.js';
import { formatPoint, formatScaledLength } from '../utils/format.js';
import Tool from './Tool.jsx';

/**
 * Two-point distance on the splat; in the user's unit and frame when a georeference is applied.
 * @param {{measurement: ReturnType<typeof import('../hooks/useMeasurement.js').useMeasurement>,
 *   georef: import('../utils/georef.js').Georeference | null}} props
 */
export default function MeasureTool({ measurement, georef }) {
  const { active, setActive, points, distance, missed, clear } = measurement;
  let status = 'Click a point on the splat.';
  if (points.length === 1) status = 'Click a second point.';
  if (distance !== null) status = `Distance: ${formatScaledLength(distance, georef)}`;
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
      {georef && points.length > 0 && (
        <dl className="facts">
          {points.map((point, index) => (
            <Fragment key={index}>
              <dt>Point {index + 1}</dt>
              <dd>{formatPoint(applyGeoreference(georef, point), georef.unit)}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      <p className="tool__note">
        Picks the nearest splat under the pointer (mouse or touch only). A straight line in{' '}
        {georef ? `${georef.unit}, from the georeference` : 'file units'}; Escape stops measuring.
      </p>
    </Tool>
  );
}
