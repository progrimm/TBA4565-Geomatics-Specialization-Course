import { useId, useRef } from 'react';
import { LOCAL_FRAME } from '../config.js';
import { distance } from '../utils/measure.js';
import { formatLength, formatNumber, formatPoint } from '../utils/format.js';
import { frameInFile, rotationAngleAxis } from '../utils/localFrame.js';
import { download } from './download.js';
import Tool from './Tool.jsx';

const METHODS = [
  { id: 'distance', label: 'Known distance' },
  { id: 'coordinates', label: 'Known coordinates' },
];
const AXES = ['X', 'Y', 'Z'];

/** The assigned scale or coordinate system in numbers: parameters and, for control points, residuals. */
function Result({ frame, showAxes, onShowAxes }) {
  const { unit } = frame;
  if (frame.method === 'distance') {
    return (
      <dl className="facts facts--spaced">
        <dt>Scale</dt>
        <dd>
          1 file unit = {formatNumber(frame.scale)} {unit}
        </dd>
      </dl>
    );
  }
  const { degrees, axis } = rotationAngleAxis(frame.quaternion);
  const { origin } = frameInFile(frame);
  return (
    <>
      <dl className="facts facts--spaced">
        <dt>Scale</dt>
        <dd>
          1 file unit = {formatNumber(frame.scale)} {unit}
        </dd>
        <dt>Rotation</dt>
        <dd>
          {degrees.toFixed(2)}° about ({axis.map((v) => v.toFixed(3)).join(', ')})
        </dd>
        <dt>Your origin</dt>
        <dd title="Where (0, 0, 0) of your frame lies, in the file's coordinates">
          {formatPoint(origin, 'file units')}
        </dd>
        <dt>RMSE</dt>
        <dd>
          {formatNumber(frame.rmse)} {unit}
        </dd>
      </dl>
      <div className="table-scroll">
        <table className="metrics">
          <caption className="sr-only">Residuals per control point, in {unit}</caption>
          <thead>
            <tr>
              <th scope="col">Point</th>
              <th scope="col">dX</th>
              <th scope="col">dY</th>
              <th scope="col">dZ</th>
              <th scope="col">|d|</th>
            </tr>
          </thead>
          <tbody>
            {frame.residuals.map((r, index) => (
              <tr key={index}>
                <th scope="row">{index + 1}</th>
                {r.map((value, i) => (
                  <td key={i}>{formatNumber(value)}</td>
                ))}
                <td>{formatNumber(Math.hypot(...r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tool__note">
        Residual = your coordinates − the transformed pick, in {unit}. With 3 points there are 2
        redundant observations; more points give a better check.
      </p>
      <div className="tool__actions">
        <button
          className="chip"
          type="button"
          aria-pressed={showAxes}
          onClick={() => onShowAxes(!showAxes)}
        >
          Show your axes
        </button>
      </div>
      <p className="tool__note">Origin O, X red, Y green, Z blue.</p>
    </>
  );
}

/**
 * Assign a scale or a coordinate system to the splat: a scale from one known distance (the file's own frame), or a
 * similarity transform from ≥ 3 control points in the user's own frame (Z up).
 * @param {{localFrame: ReturnType<typeof import('../hooks/useLocalFrame.js').useLocalFrame>,
 *   splatName: string}} props
 */
export default function LocalFrameTool({ localFrame: g, splatName }) {
  const loadRef = useRef(null);
  const lengthId = useId();
  const [a, b] = g.distancePoints;
  const complete = g.rows.filter(
    (row) => row.file && row.target.every((value) => value.trim() !== ''),
  ).length;
  const canApply =
    g.method === 'distance'
      ? Boolean(a && b && g.knownLength.trim())
      : complete >= LOCAL_FRAME.minPoints;

  let pickStatus = null;
  if (g.active && g.method === 'distance')
    pickStatus = a && !b ? 'Click point 2.' : 'Click point 1.';
  if (g.active && g.method === 'coordinates' && g.pickRow !== null) {
    pickStatus = `Click point ${g.pickRow + 1} on the splat.`;
  }
  if (g.missed) pickStatus = 'No splat under the pointer. Try again.';

  return (
    <Tool id="local-frame" title="Scale & coordinate system">
      <div className="tool__actions" role="group" aria-label="Method">
        {METHODS.map(({ id, label }) => (
          <button
            key={id}
            className="chip"
            type="button"
            aria-pressed={g.method === id}
            onClick={() => g.setMethod(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tool__actions tool__actions--spaced" role="group" aria-label="Unit">
        <span className="tool__label">Unit</span>
        {LOCAL_FRAME.units.map((unit) => (
          <button
            key={unit}
            className="chip"
            type="button"
            aria-pressed={g.unit === unit}
            onClick={() => g.setUnit(unit)}
          >
            {unit}
          </button>
        ))}
      </div>

      {g.method === 'distance' ? (
        <>
          <p className="tool__note">
            Pick two points whose real distance you know. Only the scale changes; the file&apos;s
            origin and axes are kept.
          </p>
          <div className="tool__actions">
            <button className="chip" type="button" aria-pressed={g.active} onClick={g.pickDistance}>
              {g.active ? 'Stop picking' : 'Pick 2 points'}
            </button>
          </div>
          {a && b && <p className="tool__note">Picked distance: {formatLength(distance(a, b))}</p>}
          <div className="field">
            <label className="field__label" htmlFor={lengthId}>
              Real length ({g.unit})
            </label>
            <input
              id={lengthId}
              className="number-input"
              type="text"
              inputMode="decimal"
              value={g.knownLength}
              onChange={(event) => g.setKnownLength(event.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <p className="tool__note">
            Your own frame: right-handed, Z up, in {g.unit}. Pick each point on the splat and type
            its X, Y, Z. At least {LOCAL_FRAME.minPoints} points, not on one line.
          </p>
          <div className="table-scroll">
            <table className="metrics frame-points">
              <caption className="sr-only">Control points, coordinates in {g.unit}</caption>
              <thead>
                <tr>
                  <th scope="col" className="frame-points__point">
                    Point
                  </th>
                  {AXES.map((axis) => (
                    <th scope="col" key={axis}>
                      {axis}
                    </th>
                  ))}
                  <th scope="col" className="frame-points__remove">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row, index) => (
                  <tr key={index}>
                    <th scope="row">
                      <button
                        className="chip frame-points__pick"
                        type="button"
                        aria-pressed={g.active && g.pickRow === index}
                        aria-label={`${row.file ? 'Pick again' : 'Pick'} point ${index + 1}`}
                        title={row.file ? 'Picked; click to pick again' : 'Pick on the splat'}
                        onClick={() => g.pickPoint(index)}
                      >
                        {index + 1} {row.file ? '✓' : '·'}
                      </button>
                    </th>
                    {AXES.map((axis, i) => (
                      <td key={axis}>
                        <input
                          className="number-input"
                          type="text"
                          inputMode="decimal"
                          aria-label={`Point ${index + 1} ${axis} (${g.unit})`}
                          value={row.target[i]}
                          onChange={(event) => g.setTarget(index, i, event.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        className="chip"
                        type="button"
                        aria-label={`Remove point ${index + 1}`}
                        onClick={() => g.removePoint(index)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tool__actions tool__actions--spaced">
            <button className="chip" type="button" onClick={g.addPoint}>
              Add point
            </button>
          </div>
        </>
      )}

      {pickStatus && (
        <p className="tool__note" role="status">
          {pickStatus}
        </p>
      )}
      <div className="tool__actions tool__actions--spaced">
        <button className="chip" type="button" disabled={!canApply} onClick={g.apply}>
          Apply
        </button>
        <button className="chip" type="button" disabled={!g.applied} onClick={g.clear}>
          Clear
        </button>
        <button
          className="chip"
          type="button"
          onClick={() =>
            download(
              g.save(),
              `${splatName.replace(/\.[^.]+$/, '')}_coordinate-system.json`,
              'application/json',
            )
          }
        >
          Save
        </button>
        <button className="chip" type="button" onClick={() => loadRef.current?.click()}>
          Load
        </button>
        <input
          ref={loadRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => {
            const [file] = event.target.files;
            if (!file) return;
            g.load(file).finally(() => {
              event.target.value = '';
            });
          }}
        />
      </div>
      {g.error && (
        <p className="tool__note tool__note--error" role="alert">
          {g.error}
        </p>
      )}
      {g.stale && <p className="tool__note">The inputs changed: Apply again to update.</p>}
      {g.applied && <Result frame={g.applied} showAxes={g.showAxes} onShowAxes={g.setShowAxes} />}
    </Tool>
  );
}
