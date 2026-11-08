/**
 * Heights: ellipsoidal (h, above the WGS84/GRS80 ellipsoid, what Cesium uses) and
 * NN2000 (H, above the geoid-based Norwegian height reference). They differ by the
 * geoid height N from Kartverket's height reference model: h = H + N.
 *
 * @typedef {{west: number, north: number, dLon: number, dLat: number, cols: number,
 *   rows: number, values: number[]}} GeoidGrid
 *   Lattice of N values in metres, row by row from the north-west node at (west, north),
 *   dLon/dLat degrees apart (see utils/geoidGrid.js, made by scripts/fetch-geoid.js).
 */

/** Grid units; 1e-9 of a 0.02° cell is about 2 µm. */
const EDGE_TOLERANCE = 1e-9;

/**
 * Geoid height N at a point, by bilinear interpolation between the four surrounding
 * lattice nodes (as PROJ does for vertical grids).
 * @param {import('./nearest.js').LonLat} point - WGS84 (≈ EUREF89) degrees.
 * @param {GeoidGrid} grid
 * @returns {number | undefined} metres; undefined outside the grid.
 */
export function geoidHeight({ longitude, latitude }, grid) {
  // Grid units (columns east, rows south), snapped to the edge when a floating-point
  // error puts a point on the edge just outside it (e.g. (63.5 − 63.48) / 0.02 > 1).
  const toGrid = (value, size) => {
    if (value > -EDGE_TOLERANCE && value < 0) return 0;
    if (value > size - 1 && value < size - 1 + EDGE_TOLERANCE) return size - 1;
    return value;
  };
  const x = toGrid((longitude - grid.west) / grid.dLon, grid.cols);
  const y = toGrid((grid.north - latitude) / grid.dLat, grid.rows);
  if (!(x >= 0 && y >= 0 && x <= grid.cols - 1 && y <= grid.rows - 1)) return undefined;
  // On the last column or row, use the cell before it (the weight of the far side is 0).
  const col = Math.min(Math.floor(x), grid.cols - 2);
  const row = Math.min(Math.floor(y), grid.rows - 2);
  const fx = x - col;
  const fy = y - row;
  const at = (c, r) => grid.values[r * grid.cols + c];
  return (
    at(col, row) * (1 - fx) * (1 - fy) +
    at(col + 1, row) * fx * (1 - fy) +
    at(col, row + 1) * (1 - fx) * fy +
    at(col + 1, row + 1) * fx * fy
  );
}

/**
 * Ellipsoidal height from an NN2000 height: h = H + N.
 * @param {import('./nearest.js').LonLat} point
 * @param {number} heightNN2000 - H, metres.
 * @param {GeoidGrid} grid
 * @returns {number | undefined} h in metres; undefined outside the grid.
 */
export function toEllipsoidalHeight(point, heightNN2000, grid) {
  const n = geoidHeight(point, grid);
  return n === undefined ? undefined : heightNN2000 + n;
}

/**
 * NN2000 height from an ellipsoidal height: H = h − N.
 * @param {import('./nearest.js').LonLat} point
 * @param {number} ellipsoidalHeight - h, metres.
 * @param {GeoidGrid} grid
 * @returns {number | undefined} H in metres; undefined outside the grid.
 */
export function toNN2000Height(point, ellipsoidalHeight, grid) {
  const n = geoidHeight(point, grid);
  return n === undefined ? undefined : ellipsoidalHeight - n;
}
