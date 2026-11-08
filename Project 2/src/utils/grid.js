/**
 * Helpers for the grid analysis (scripts/analyse-grid.js): evenly spaced test points
 * and summary statistics.
 */

/**
 * n × n test points spaced evenly over a bounding box, corner to corner: the first and
 * last rows and columns lie on the box's edges. Spacing is even in degrees, not metres.
 * @param {{west: number, south: number, east: number, north: number}} bbox - WGS84 degrees.
 * @param {number} n - points per side, at least 2.
 * @returns {import('./nearest.js').LonLat[]} row by row from the south-west corner.
 */
export function gridPoints({ west, south, east, north }, n) {
  const points = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      points.push({
        longitude: west + ((east - west) * col) / (n - 1),
        latitude: south + ((north - south) * row) / (n - 1),
      });
    }
  }
  return points;
}

/**
 * Quantile of an ascending array by linear interpolation between the closest ranks
 * (Hyndman & Fan type 7, the default in R and NumPy).
 * @param {number[]} sorted - ascending.
 * @param {number} q - 0 to 1 (0.5 = median).
 * @returns {number} NaN for an empty array.
 */
export function quantile(sorted, q) {
  if (sorted.length === 0) return NaN;
  const position = (sorted.length - 1) * q;
  const below = Math.floor(position);
  const above = Math.min(below + 1, sorted.length - 1);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}
