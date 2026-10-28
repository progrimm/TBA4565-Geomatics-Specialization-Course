/**
 * @typedef {{min: number[], max: number[]}} Bounds - axis-aligned box, [x, y, z].
 */

/**
 * Full bounding box of splat centres.
 * @param {Float32Array} centres - x, y, z for each splat, interleaved.
 * @returns {Bounds}
 */
export function fullBounds(centres) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < centres.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = centres[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  return { min, max };
}

/**
 * Bounds of the central part of the splat cloud: per axis, the range between the
 * (1 − fraction)/2 and (1 + fraction)/2 quantiles of the centres. Ignores floaters.
 * Large clouds are sampled evenly to at most maxSamples centres.
 * @param {Float32Array} centres - x, y, z for each splat, interleaved.
 * @param {number} fraction - share of centres to keep per axis, e.g. 0.96.
 * @param {number} [maxSamples=Infinity]
 * @returns {Bounds}
 */
export function coreBounds(centres, fraction, maxSamples = Infinity) {
  const count = centres.length / 3;
  const step = Math.max(1, Math.ceil(count / maxSamples));
  const samples = Math.ceil(count / step);
  const lowIndex = Math.floor(((1 - fraction) / 2) * (samples - 1));
  const highIndex = Math.ceil(((1 + fraction) / 2) * (samples - 1));
  const min = [];
  const max = [];
  for (let axis = 0; axis < 3; axis += 1) {
    const values = new Float32Array(samples);
    for (let s = 0; s < samples; s += 1) values[s] = centres[s * step * 3 + axis];
    values.sort();
    min.push(values[lowIndex]);
    max.push(values[highIndex]);
  }
  return { min, max };
}

/**
 * Size of a box along each axis.
 * @param {Bounds} bounds
 * @returns {number[]}
 */
export function boundsSize({ min, max }) {
  return max.map((value, axis) => value - min[axis]);
}

/**
 * Where to put the camera so the whole box is in view.
 * @param {Bounds} bounds
 * @param {number} verticalFovDeg
 * @param {number[]} viewDirection - from target towards the camera (any length).
 * @returns {{target: number[], position: number[], distance: number, radius: number}}
 *   radius = half the box diagonal; distance = from target to camera.
 */
export function cameraForBounds({ min, max }, verticalFovDeg, viewDirection) {
  const target = min.map((value, axis) => (value + max[axis]) / 2);
  const radius = Math.hypot(...boundsSize({ min, max })) / 2;
  // A sphere of this radius fits the view when distance = radius / sin(fov / 2).
  const distance = radius / Math.sin((verticalFovDeg * Math.PI) / 360) || 1;
  const length = Math.hypot(...viewDirection);
  const position = target.map((value, axis) => value + (viewDirection[axis] / length) * distance);
  return { target, position, distance, radius };
}
