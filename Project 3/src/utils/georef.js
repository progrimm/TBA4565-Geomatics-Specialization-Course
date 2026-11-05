// Georeferencing a splat: a scale from one known distance, or a similarity (Helmert, 7
// parameter) transform from control points, fitted by least squares. Pure functions, float64.
import { GEOREF } from '../config.js';
import { distance } from './measure.js';

/**
 * @typedef {object} Georeference
 * @property {'distance' | 'coordinates'} method
 * @property {string} unit - unit of the user's lengths and coordinates (m or cm).
 * @property {number} scale - user units per file unit.
 * @property {number[]} quaternion - rotation file → user frame, [x, y, z, w].
 * @property {number[]} translation - user-frame coordinates of the file origin.
 * @property {number[][]} residuals - per control point: target − transformed pick (user units).
 * @property {number | null} rmse - root mean square of the residual lengths (user units).
 */

const sub = (a, b) => a.map((value, i) => value - b[i]);
const add = (a, b) => a.map((value, i) => value + b[i]);
const mul = (a, s) => a.map((value) => value * s);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const finitePoint = (p) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const centroid = (points) => mul(points.reduce(add, [0, 0, 0]), 1 / points.length);

/**
 * Eigenvalues and eigenvectors of a symmetric matrix (cyclic Jacobi rotations).
 * @param {number[][]} matrix - n × n, symmetric.
 * @returns {{values: number[], vectors: number[][]}} vectors[k] belongs to values[k].
 */
export function symmetricEigen(matrix) {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const v = a.map((_, i) => a.map((__, j) => (i === j ? 1 : 0)));
  const scale = Math.max(1e-300, ...a.flat().map(Math.abs));
  for (let sweep = 0; sweep < 100; sweep += 1) {
    let off = 0;
    for (let p = 0; p < n; p += 1) for (let q = p + 1; q < n; q += 1) off += a[p][q] ** 2;
    if (off <= (1e-15 * scale) ** 2) break;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        if (a[p][q] === 0) continue;
        // Rotation in the (p, q) plane that zeroes a[p][q] (Golub & Van Loan, sym. Schur).
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k += 1) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k += 1) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: a.map((row, i) => row[i]), vectors: a.map((_, k) => v.map((row) => row[k])) };
}

/**
 * Rotate a vector by a unit quaternion.
 * @param {number[]} q - [x, y, z, w]
 * @param {number[]} p - [x, y, z]
 * @returns {number[]}
 */
export function rotate(q, p) {
  const [x, y, z, w] = q;
  // p + 2w (u × p) + 2 u × (u × p), with u = (x, y, z).
  const c1 = [y * p[2] - z * p[1], z * p[0] - x * p[2], x * p[1] - y * p[0]];
  const c2 = [y * c1[2] - z * c1[1], z * c1[0] - x * c1[2], x * c1[1] - y * c1[0]];
  return [0, 1, 2].map((i) => p[i] + 2 * w * c1[i] + 2 * c2[i]);
}

/** The inverse of a unit quaternion. */
const conjugate = ([x, y, z, w]) => [-x, -y, -z, w];

/** Whether points lie (nearly) on one line: too few directions to fix a rotation. */
function collinear(points) {
  const mean = centroid(points);
  const cov = [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => points.reduce((sum, p) => sum + (p[i] - mean[i]) * (p[j] - mean[j]), 0)),
  );
  const values = symmetricEigen(cov).values.sort((a, b) => b - a);
  return !(values[0] > 0) || values[1] <= values[0] * GEOREF.collinearTolerance;
}

/**
 * Scale from two picked points and their real distance. The file's origin and axes are kept.
 * @param {number[]} a - file coordinates.
 * @param {number[]} b - file coordinates.
 * @param {number} known - the real distance, in the user's unit.
 * @param {string} unit
 * @returns {Georeference}
 * @throws {Error} when the points coincide or the length is not a positive number.
 */
export function scaleFromDistance(a, b, known, unit) {
  if (!finitePoint(a) || !finitePoint(b)) throw new Error('Pick two points first.');
  if (!Number.isFinite(known) || !(known > 0)) throw new Error('Enter a length above 0.');
  const measured = distance(a, b);
  if (!(measured > 0)) throw new Error('The two points are the same; pick two different points.');
  return {
    method: 'distance',
    unit,
    scale: known / measured,
    quaternion: [0, 0, 0, 1],
    translation: [0, 0, 0],
    residuals: [],
    rmse: null,
  };
}

/**
 * A point from file coordinates into the user's frame: s·R·p + t.
 * @param {Pick<Georeference, 'scale' | 'quaternion' | 'translation'>} georef
 * @param {number[]} point
 * @returns {number[]}
 */
export function applyGeoreference(georef, point) {
  return add(mul(rotate(georef.quaternion, point), georef.scale), georef.translation);
}

/**
 * Least-squares similarity transform target ≈ s·R·source + t (Helmert, 7 parameters).
 * Rotation by Horn's closed-form unit-quaternion method (Horn 1987, JOSA A 4(4)): the
 * eigenvector of the largest eigenvalue of a 4 × 4 matrix built from the cross-covariance. It is
 * always a proper rotation, never a mirror. Scale as in Umeyama (1991, IEEE TPAMI 13(4)), so
 * that the residuals are least squares in the target frame.
 * @param {number[][]} source - picked points, file coordinates.
 * @param {number[][]} target - the same points in the user's frame.
 * @param {string} unit
 * @returns {Georeference}
 * @throws {Error} for fewer than GEOREF.minPoints, non-finite or collinear points.
 */
export function fitSimilarity(source, target, unit) {
  if (source.length !== target.length) throw new Error('Every point needs a pick and coordinates.');
  if (source.length < GEOREF.minPoints) {
    throw new Error(`At least ${GEOREF.minPoints} control points are needed.`);
  }
  if (!source.every(finitePoint) || !target.every(finitePoint)) {
    throw new Error('Every control point needs a pick and three numbers.');
  }
  if (collinear(source) || collinear(target)) {
    throw new Error('The control points lie on one line; add a point off that line.');
  }
  const sourceMean = centroid(source);
  const targetMean = centroid(target);
  const a = source.map((p) => sub(p, sourceMean));
  const b = target.map((p) => sub(p, targetMean));
  // Cross-covariance S[i][j] = Σ a_i b_j.
  const S = [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => a.reduce((sum, p, k) => sum + p[i] * b[k][j], 0)),
  );
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S;
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ];
  const { values, vectors } = symmetricEigen(N);
  const [w, x, y, z] = vectors[values.indexOf(Math.max(...values))];
  // q and −q are the same rotation; w ≥ 0 keeps the angle in 0..180°.
  const norm = (w < 0 ? -1 : 1) * Math.hypot(w, x, y, z);
  const quaternion = [x / norm, y / norm, z / norm, w / norm];
  const rotated = a.map((p) => rotate(quaternion, p));
  const scale =
    b.reduce((sum, p, i) => sum + dot(p, rotated[i]), 0) / a.reduce((sum, p) => sum + dot(p, p), 0);
  if (!(scale > 0)) throw new Error('The points do not match; check their order and coordinates.');
  const translation = sub(targetMean, mul(rotate(quaternion, sourceMean), scale));
  const fit = { scale, quaternion, translation };
  const residuals = target.map((p, i) => sub(p, applyGeoreference(fit, source[i])));
  const rmse = Math.sqrt(residuals.reduce((sum, r) => sum + dot(r, r), 0) / residuals.length);
  return { method: 'coordinates', unit, ...fit, residuals, rmse };
}

/**
 * The user's origin and axis directions, in file coordinates (for drawing them in the splat).
 * @param {Georeference} georef
 * @returns {{origin: number[], axes: number[][]}} axes: unit vectors of the user's X, Y, Z.
 */
export function frameInFile(georef) {
  const inverse = conjugate(georef.quaternion);
  return {
    origin: mul(rotate(inverse, mul(georef.translation, -1)), 1 / georef.scale),
    axes: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ].map((axis) => rotate(inverse, axis)),
  };
}

/**
 * Model rotation that shows the user's frame with its +Z up in three.js (+Y up): Rx(−90°)·R.
 * @param {number[]} quaternion - rotation file → user frame, [x, y, z, w].
 * @returns {number[]} [x, y, z, w]
 */
export function levelQuaternion(quaternion) {
  const h = Math.SQRT1_2;
  const [ax, ay, az, aw] = [-h, 0, 0, h];
  const [bx, by, bz, bw] = quaternion;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Rotation as an angle and an axis, for display.
 * @param {number[]} quaternion - [x, y, z, w], unit length.
 * @returns {{degrees: number, axis: number[]}}
 */
export function rotationAngleAxis([x, y, z, w]) {
  const sine = Math.hypot(x, y, z);
  const degrees = (2 * Math.atan2(sine, w) * 180) / Math.PI;
  return { degrees, axis: sine > 0 ? [x / sine, y / sine, z / sine] : [0, 0, 1] };
}

/**
 * @typedef {object} GeoreferenceInput
 * @property {{name: string, numSplats: number} | null} file - the splat it was made for.
 * @property {'distance' | 'coordinates'} method
 * @property {string} unit
 * @property {number | null} knownLength - distance method.
 * @property {{file: number[] | null, target: (number | null)[]}[]} points - picks (file
 *   coordinates) and, for the coordinate method, the user's coordinates.
 */

/**
 * The georeference inputs as JSON. The result is not stored: it is recomputed when loading.
 * @param {GeoreferenceInput} input
 * @returns {string}
 */
export function serializeGeoreference({ file, method, unit, knownLength, points }) {
  const data = {
    format: GEOREF.fileFormat,
    version: GEOREF.fileVersion,
    file,
    method,
    unit,
    knownLength,
    points,
  };
  return `${JSON.stringify(data, null, 2)}\n`;
}

/**
 * Read a saved georeference.
 * @param {string} text
 * @returns {GeoreferenceInput}
 * @throws {Error} with a user-facing reason when the text is not a valid georeference.
 */
export function parseGeoreference(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('it is not JSON.');
  }
  if (data?.format !== GEOREF.fileFormat) throw new Error('it is not a saved georeference.');
  if (data.version !== GEOREF.fileVersion) {
    throw new Error(
      `it has version ${data.version}; this app reads version ${GEOREF.fileVersion}.`,
    );
  }
  if (!['distance', 'coordinates'].includes(data.method)) throw new Error('its method is unknown.');
  if (!GEOREF.units.includes(data.unit)) throw new Error(`its unit "${data.unit}" is unknown.`);
  if (!Array.isArray(data.points)) throw new Error('it has no points.');
  const number = (value) => (Number.isFinite(value) ? value : null);
  const points = data.points.map((point) => ({
    file: finitePoint(point?.file) ? point.file : null,
    target: [0, 1, 2].map((i) => number(point?.target?.[i])),
  }));
  const file =
    typeof data.file?.name === 'string' && Number.isFinite(data.file?.numSplats)
      ? { name: data.file.name, numSplats: data.file.numSplats }
      : null;
  return {
    file,
    method: data.method,
    unit: data.unit,
    knownLength: number(data.knownLength),
    points,
  };
}
