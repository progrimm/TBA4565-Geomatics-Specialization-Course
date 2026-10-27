const DEG = Math.PI / 180;

const add = (a, b) => a.map((value, i) => value + b[i]);
const scale = (a, s) => a.map((value) => value * s);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalise = (a) => scale(a, 1 / Math.hypot(...a));

/**
 * Two unit vectors spanning the horizontal plane of a frame with the given up vector.
 * @param {number[]} up - up direction [x, y, z] (any length > 0).
 * @returns {[number[], number[]]} e1, e2: orthonormal, both perpendicular to up, and
 *   (e1, e2, up) right-handed.
 */
export function horizontalBasis(up) {
  const u = normalise(up);
  // Any helper axis not parallel to up gives a valid basis.
  const helper = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  const e2 = normalise(cross(u, helper));
  const e1 = cross(e2, u);
  return [e1, e2];
}

/**
 * Camera position on a circle around a target, in the target's coordinate frame.
 * @param {{target: number[], up: number[], radius: number, height: number}} camera
 * @param {number} angleDeg - angle on the circle in degrees, counter-clockwise seen
 *   from above.
 * @returns {number[]} position [x, y, z] in the same frame and unit as target.
 */
export function orbitPosition({ target, up, radius, height }, angleDeg) {
  const [e1, e2] = horizontalBasis(up);
  const a = angleDeg * DEG;
  const horizontal = add(scale(e1, radius * Math.cos(a)), scale(e2, radius * Math.sin(a)));
  return add(add(target, horizontal), scale(normalise(up), height));
}

/**
 * Orbit angle at an elapsed time: one full turn per duration, starting at startDeg.
 * @param {number} elapsedMs - time since the orbit started (ms).
 * @param {number} durationMs - time for one full turn (ms).
 * @param {number} startDeg - angle at elapsedMs = 0.
 * @returns {number} angle in degrees.
 */
export function orbitAngle(elapsedMs, durationMs, startDeg) {
  return startDeg + (360 * elapsedMs) / durationMs;
}
