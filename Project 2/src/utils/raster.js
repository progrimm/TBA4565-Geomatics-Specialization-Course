/**
 * A north-up raster in a projected CRS, "pixel is area": pixel (col, row) covers
 * x0 + col·res … x0 + (col+1)·res and y0 − (row+1)·res … y0 − row·res.
 * @typedef {{values: ArrayLike<number>, width: number, height: number, x0: number,
 *   y0: number, res: number}} Raster
 *   x0, y0: the upper-left corner of the upper-left pixel; res: pixel size in metres.
 */

/** Values below this are treated as "no data" (DTM nodata values are large negatives). */
const NO_DATA_BELOW = -1000;

/**
 * Bilinear interpolation between the four pixel centres around (x, y).
 * @param {Raster} raster
 * @param {number} x - easting, same CRS as the raster.
 * @param {number} y - northing.
 * @returns {number} NaN outside the area between the outermost pixel centres, or when one
 *   of the four pixels has no data.
 */
export function sampleBilinear({ values, width, height, x0, y0, res }, x, y) {
  // Continuous pixel-centre coordinates: centre of pixel (0, 0) is (0, 0).
  const fx = (x - x0) / res - 0.5;
  const fy = (y0 - y) / res - 0.5;
  if (!(fx >= 0 && fy >= 0 && fx <= width - 1 && fy <= height - 1)) return NaN;
  const col = Math.min(Math.floor(fx), width - 2);
  const row = Math.min(Math.floor(fy), height - 2);
  const tx = fx - col;
  const ty = fy - row;
  const corners = [
    values[row * width + col],
    values[row * width + col + 1],
    values[(row + 1) * width + col],
    values[(row + 1) * width + col + 1],
  ];
  if (corners.some((value) => !(value > NO_DATA_BELOW))) return NaN;
  const [a, b, c, d] = corners;
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}
