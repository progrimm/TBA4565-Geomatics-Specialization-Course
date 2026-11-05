import { useCallback, useEffect, useMemo, useState } from 'react';
import { ERROR_MESSAGE_MS, GEOREF } from '../config.js';
import { showMessage } from '../state/messages.js';
import {
  fitSimilarity,
  frameInFile,
  levelQuaternion,
  parseGeoreference,
  scaleFromDistance,
  serializeGeoreference,
} from '../utils/georef.js';
import { usePointPicking } from './usePointPicking.js';

const emptyRow = () => ({ file: null, target: ['', '', ''] });

/** A typed number; a decimal comma is accepted (12,5). Empty or invalid gives NaN. */
const parseNumber = (text) =>
  String(text).trim() === '' ? NaN : Number(String(text).trim().replace(',', '.'));
const show = (value) => (value === null || value === undefined ? '' : String(value));

/**
 * Compute a georeference from the tool's inputs.
 * @throws {Error} with a user-facing reason.
 */
function compute({ method, unit, distancePoints, knownLength, rows }) {
  if (method === 'distance') {
    const [a, b] = distancePoints;
    return scaleFromDistance(a, b, parseNumber(knownLength), unit);
  }
  const used = rows.filter((row) => row.file || row.target.some((value) => value !== ''));
  return fitSimilarity(
    used.map((row) => row.file),
    used.map((row) => row.target.map(parseNumber)),
    unit,
  );
}

/**
 * Georeference tool state for one pane: a scale from a known distance, or a similarity
 * transform from control points with coordinates in the user's own frame.
 * @param {ReturnType<import('../viewer/splatViewer.js').createSplatViewer> | null} viewer
 * @param {import('react').RefObject<HTMLCanvasElement>} canvasRef
 * @param {import('./useSplatViewer.js').SplatFacts | null} facts - changes with a new splat
 *   (clears the georeference).
 * @param {boolean} active - picking points now (exclusive with the other picking tools).
 * @param {(active: boolean) => void} setActive
 */
export function useGeoreference(viewer, canvasRef, facts, active, setActive) {
  const [method, setMethod] = useState('distance');
  const [unit, setUnit] = useState(GEOREF.units[0]);
  const [distancePoints, setDistancePoints] = useState([null, null]);
  const [knownLength, setKnownLength] = useState('');
  const [rows, setRows] = useState(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [pickRow, setPickRow] = useState(null);
  const [missed, setMissed] = useState(false);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(null);
  const [showAxes, setShowAxes] = useState(true);
  const [factsKey, setFactsKey] = useState(facts);

  // A new splat: the picks belong to the old one.
  // Adjusting state during render: https://react.dev/learn/you-might-not-need-an-effect
  if (factsKey !== facts) {
    setFactsKey(facts);
    setDistancePoints([null, null]);
    setRows([emptyRow(), emptyRow(), emptyRow()]);
    setPickRow(null);
    setMissed(false);
    setError(null);
    setApplied(null);
  }

  const inputs = useMemo(
    () => ({ method, unit, distancePoints, knownLength, rows }),
    [method, unit, distancePoints, knownLength, rows],
  );
  const inputsKey = JSON.stringify(inputs);

  const onPick = useCallback(
    (point) => {
      setMissed(!point);
      if (!point) return;
      if (method === 'distance') {
        const [a, b] = distancePoints;
        if (!a || b) {
          setDistancePoints([point, null]);
        } else {
          setDistancePoints([a, point]);
          setActive(false);
        }
      } else if (pickRow !== null) {
        setRows((current) =>
          current.map((row, index) => (index === pickRow ? { ...row, file: point } : row)),
        );
        setPickRow(null);
        setActive(false);
      }
    },
    [method, distancePoints, pickRow, setActive],
  );
  usePointPicking(viewer, canvasRef, active, setActive, onPick);

  // Picking stopped elsewhere (Escape, the other tool): no row waits for a pick any more.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setPickRow(null);
  }

  const shownPoints = useMemo(
    () => (method === 'distance' ? distancePoints : rows.map((row) => row.file)),
    [method, distancePoints, rows],
  );
  useEffect(() => {
    viewer?.setControlPoints(shownPoints);
  }, [viewer, shownPoints]);

  // The coordinate method levels the view (the user's +Z up); a scale alone does not.
  const levelled = applied?.result.method === 'coordinates';
  const level = levelled ? applied.result.quaternion : null;
  useEffect(() => {
    viewer?.setLevelRotation(level ? levelQuaternion(level) : null);
  }, [viewer, level]);
  useEffect(() => {
    viewer?.setFrameAxes(levelled && showAxes ? frameInFile(applied.result) : null);
  }, [viewer, levelled, showAxes, applied]);

  const apply = () => {
    try {
      setApplied({ result: compute(inputs), key: inputsKey });
      setError(null);
    } catch (problem) {
      setError(problem.message);
    }
  };

  const clear = () => {
    setApplied(null);
    setError(null);
  };

  const pickDistance = () => {
    setPickRow(null);
    setActive(!active);
  };

  const pickPoint = (index) => {
    if (active && pickRow === index) {
      setActive(false);
      return;
    }
    setPickRow(index);
    setActive(true);
  };

  const addPoint = () => {
    setRows((current) => [...current, emptyRow()]);
    setPickRow(rows.length);
    setActive(true);
  };

  const removePoint = (index) => {
    setRows((current) => current.filter((_, i) => i !== index));
    if (pickRow === index) {
      setPickRow(null);
      setActive(false);
    } else if (pickRow !== null && pickRow > index) setPickRow(pickRow - 1);
  };

  const setTarget = (index, axis, value) =>
    setRows((current) =>
      current.map((row, i) =>
        i === index ? { ...row, target: row.target.map((v, j) => (j === axis ? value : v)) } : row,
      ),
    );

  /** The inputs as a JSON text, for download. */
  const save = () =>
    serializeGeoreference({
      file: facts ? { name: facts.name, numSplats: facts.numSplats } : null,
      method,
      unit,
      knownLength: Number.isFinite(parseNumber(knownLength)) ? parseNumber(knownLength) : null,
      points:
        method === 'distance'
          ? distancePoints.map((file) => ({ file, target: [null, null, null] }))
          : rows.map((row) => ({
              file: row.file,
              target: row.target.map((value) =>
                Number.isFinite(parseNumber(value)) ? parseNumber(value) : null,
              ),
            })),
    });

  /** Read a saved georeference and apply it again (the result is recomputed). */
  const load = async (file) => {
    let saved;
    try {
      saved = parseGeoreference(await file.text());
    } catch (problem) {
      const hide = showMessage(`Could not load ${file.name}: ${problem.message}`, 'error');
      setTimeout(hide, ERROR_MESSAGE_MS);
      return;
    }
    if (
      saved.file &&
      facts &&
      (saved.file.name !== facts.name || saved.file.numSplats !== facts.numSplats)
    ) {
      const hide = showMessage(
        `${file.name} was made for ${saved.file.name}; the picked points may not fit ${facts.name}.`,
      );
      setTimeout(hide, ERROR_MESSAGE_MS);
    }
    setActive(false);
    // Same key order as `inputs`, so the stale check compares like with like.
    const next = {
      method: saved.method,
      unit: saved.unit,
      distancePoints:
        saved.method === 'distance'
          ? [saved.points[0]?.file ?? null, saved.points[1]?.file ?? null]
          : [null, null],
      knownLength: show(saved.knownLength),
      rows:
        saved.method === 'coordinates'
          ? saved.points.map((point) => ({ file: point.file, target: point.target.map(show) }))
          : rows,
    };
    setMethod(next.method);
    setUnit(next.unit);
    setKnownLength(next.knownLength);
    setDistancePoints(next.distancePoints);
    setRows(next.rows);
    try {
      setApplied({ result: compute(next), key: JSON.stringify(next) });
      setError(null);
    } catch (problem) {
      setApplied(null);
      setError(problem.message);
    }
  };

  return {
    method,
    setMethod,
    unit,
    setUnit,
    distancePoints,
    knownLength,
    setKnownLength,
    rows,
    setTarget,
    pickRow,
    active,
    missed,
    error,
    pickDistance,
    pickPoint,
    addPoint,
    removePoint,
    apply,
    clear,
    save,
    load,
    showAxes,
    setShowAxes,
    /** The applied georeference, or null. */
    georef: applied?.result ?? null,
    /** The inputs changed after Apply. */
    stale: applied !== null && applied.key !== inputsKey,
    levelled,
  };
}
