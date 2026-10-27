import { useState } from 'react';
import { useMeasurement } from '../hooks/useMeasurement.js';
import { measure } from '../utils/measure.js';
import { formatDistance, formatSigned } from '../utils/format.js';

const HINTS = ['Click the first point.', 'Click the second point.', 'Click again to restart.'];

/**
 * Two-point measurement tool: 3D distance, horizontal geodesic distance and
 * height difference between two picked points.
 * @param {{viewer: import('cesium').Viewer | undefined}} props
 */
export default function MeasureTool({ viewer }) {
  const [active, setActive] = useState(false);
  const { points, clear } = useMeasurement(viewer, active);
  const result = points.length === 2 ? measure(points[0], points[1]) : undefined;

  return (
    <details className="tool">
      <summary className="tool__summary">Measure</summary>
      <div className="tool__actions">
        <button
          type="button"
          className="chip"
          aria-pressed={active}
          disabled={!viewer}
          onClick={() => setActive((value) => !value)}
        >
          {active ? 'Stop measuring' : 'Start measuring'}
        </button>
        <button type="button" className="chip" disabled={!points.length} onClick={clear}>
          Clear
        </button>
      </div>
      {active && (
        <p className="tool__note" aria-live="polite">
          {HINTS[points.length]}
        </p>
      )}
      {result && (
        <dl className="facts">
          <dt>3D distance</dt>
          <dd>{formatDistance(result.straight)}</dd>
          <dt>Horizontal</dt>
          <dd>{formatDistance(result.horizontal)} (geodesic)</dd>
          <dt>Height diff.</dt>
          <dd>{formatSigned(result.heightDifference)}</dd>
        </dl>
      )}
      <p className="tool__note">
        Points come from the depth buffer (Scene.pickPosition). Gaussian splats do not write depth
        in CesiumJS 1.146, so a click on a splat lands on the terrain, building or mesh behind it.
        Seen from straight above, that still gives a feature&apos;s horizontal position.
      </p>
    </details>
  );
}
