/**
 * Straight-line distance between two points, in the units of the coordinates.
 * @param {number[]} a - [x, y, z]
 * @param {number[]} b - [x, y, z]
 * @returns {number}
 */
export function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
