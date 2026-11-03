// Image quality metrics as in the 3DGS evaluation (Kerbl et al. 2023, utils/loss_utils.py and
// utils/image_utils.py): on RGB in [0, 1]; the alpha channel is ignored. Pure functions on
// RGBA byte arrays (ImageData layout), so they also run in a Web Worker.

/**
 * Peak signal-to-noise ratio, 10 · log10(1 / MSE), over all pixels and the R, G, B channels.
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @param {Uint8Array} [mask] - one byte per pixel; only pixels with a non-zero byte count.
 * @returns {number} dB; Infinity for identical images, NaN for an empty mask.
 */
export function psnr(a, b, mask) {
  if (a.length !== b.length) throw new Error('The images differ in size.');
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (mask && !mask[i / 4]) continue;
    count += 1;
    for (let c = 0; c < 3; c++) {
      const d = (a[i + c] - b[i + c]) / 255;
      sum += d * d;
    }
  }
  if (count === 0) return NaN;
  const mse = sum / (count * 3);
  return mse === 0 ? Infinity : 10 * Math.log10(1 / mse);
}

/**
 * Pixels whose alpha is at least `threshold` (0–1): where a render is covered by the splat.
 * @param {Uint8Array | Uint8ClampedArray} rgba
 * @param {number} threshold
 * @returns {{mask: Uint8Array, coverage: number}} coverage = share of covered pixels.
 */
export function alphaMask(rgba, threshold) {
  const mask = new Uint8Array(rgba.length / 4);
  let covered = 0;
  for (let i = 0; i < mask.length; i++) {
    if (rgba[i * 4 + 3] >= threshold * 255) {
      mask[i] = 1;
      covered += 1;
    }
  }
  return { mask, coverage: covered / mask.length };
}

/**
 * Turn an image upside down (WebGL reads rows bottom-up; images run top-down).
 * @param {Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array} a new array.
 */
export function flipRows(rgba, width, height) {
  const out = new Uint8Array(rgba.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    out.set(rgba.subarray(y * row, (y + 1) * row), (height - 1 - y) * row);
  }
  return out;
}

/**
 * Error image: the mean absolute RGB difference per pixel, times `gain`, on a black–red–
 * yellow–white scale (black = no difference).
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @param {number} gain - e.g. 4: an error of 1/4 of the range is already white.
 * @returns {Uint8ClampedArray} RGBA bytes (ImageData layout).
 */
export function differenceImage(a, b, gain) {
  const out = new Uint8ClampedArray(a.length);
  for (let i = 0; i < a.length; i += 4) {
    const error =
      (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) /
      (3 * 255);
    const t = Math.min(1, error * gain) * 3;
    out[i] = 255 * Math.min(1, t);
    out[i + 1] = 255 * Math.min(1, Math.max(0, t - 1));
    out[i + 2] = 255 * Math.min(1, Math.max(0, t - 2));
    out[i + 3] = 255;
  }
  return out;
}

/**
 * Normalised 1D Gaussian.
 * @param {number} size - odd.
 * @param {number} sigma
 * @returns {Float32Array}
 */
function gaussian(size, sigma) {
  const half = (size - 1) / 2;
  const kernel = Float32Array.from({ length: size }, (_, i) =>
    Math.exp(-((i - half) ** 2) / (2 * sigma * sigma)),
  );
  const total = kernel.reduce((sum, value) => sum + value, 0);
  return kernel.map((value) => value / total);
}

/** Separable Gaussian blur with zero padding (as PyTorch conv2d with padding). */
function blur(source, width, height, kernel, temp, out) {
  const half = (kernel.length - 1) / 2;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = 0; k < kernel.length; k++) {
        const xx = x + k - half;
        if (xx >= 0 && xx < width) sum += kernel[k] * source[row + xx];
      }
      temp[row + x] = sum;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = 0; k < kernel.length; k++) {
        const yy = y + k - half;
        if (yy >= 0 && yy < height) sum += kernel[k] * temp[yy * width + x];
      }
      out[y * width + x] = sum;
    }
  }
}

/**
 * Mean of a per-pixel map, optionally only over a mask.
 * @param {Float32Array} map
 * @param {Uint8Array} [mask] - one byte per pixel; non-zero = counted.
 * @returns {number} NaN for an empty mask.
 */
export function meanOver(map, mask) {
  let total = 0;
  let count = 0;
  for (let i = 0; i < map.length; i++) {
    if (mask && !mask[i]) continue;
    total += map[i];
    count += 1;
  }
  return count === 0 ? NaN : total / count;
}

/**
 * Structural similarity map (Wang et al. 2004) with a Gaussian window, per pixel averaged over
 * the R, G, B channels; constants C1 = 0.01², C2 = 0.03².
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @param {number} width
 * @param {number} height
 * @param {{windowSize?: number, sigma?: number}} [options] - default 11 and σ 1.5, as in 3DGS.
 * @returns {Float32Array} one value per pixel; 1 where the images agree.
 */
export function ssimMap(a, b, width, height, { windowSize = 11, sigma = 1.5 } = {}) {
  const n = width * height;
  if (a.length !== n * 4 || b.length !== n * 4) throw new Error('The images differ in size.');
  const kernel = gaussian(windowSize, sigma);
  const C1 = 0.01 ** 2;
  const C2 = 0.03 ** 2;
  const product = new Float32Array(n);
  const temp = new Float32Array(n);
  const [muA, muB, aa, bb, ab] = Array.from({ length: 5 }, () => new Float32Array(n));
  const map = new Float32Array(n);
  const blurred = (out, value) => {
    for (let i = 0; i < n; i++) product[i] = value(i * 4);
    blur(product, width, height, kernel, temp, out);
  };
  for (let c = 0; c < 3; c++) {
    blurred(muA, (i) => a[i + c] / 255);
    blurred(muB, (i) => b[i + c] / 255);
    blurred(aa, (i) => (a[i + c] / 255) ** 2);
    blurred(bb, (i) => (b[i + c] / 255) ** 2);
    blurred(ab, (i) => (a[i + c] / 255) * (b[i + c] / 255));
    for (let i = 0; i < n; i++) {
      const mA = muA[i];
      const mB = muB[i];
      const varA = aa[i] - mA * mA;
      const varB = bb[i] - mB * mB;
      const cov = ab[i] - mA * mB;
      map[i] +=
        ((2 * mA * mB + C1) * (2 * cov + C2)) / ((mA * mA + mB * mB + C1) * (varA + varB + C2)) / 3;
    }
  }
  return map;
}

/**
 * Structural similarity: the mean of ssimMap over all pixels (or a mask), as in 3DGS.
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @param {number} width
 * @param {number} height
 * @param {{windowSize?: number, sigma?: number, mask?: Uint8Array}} [options]
 * @returns {number} 1 for identical images, NaN for an empty mask.
 */
export function ssim(a, b, width, height, { mask, ...options } = {}) {
  return meanOver(ssimMap(a, b, width, height, options), mask);
}

/**
 * Histogram of the per-pixel error: the mean absolute R, G, B difference, rounded to whole
 * 8-bit levels (0–255).
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @param {Uint8Array} [mask] - one byte per pixel; only non-zero pixels are counted.
 * @returns {Uint32Array} 256 counts.
 */
export function errorHistogram(a, b, mask) {
  const counts = new Uint32Array(256);
  for (let i = 0; i < a.length; i += 4) {
    if (mask && !mask[i / 4]) continue;
    const error =
      Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    counts[Math.round(error / 3)] += 1;
  }
  return counts;
}

/**
 * Summary of an error histogram from errorHistogram.
 * @param {Uint32Array | number[]} counts - 256 counts.
 * @param {number} threshold - error level for `over` (e.g. 26 ≈ 10 % of the range).
 * @returns {{count: number, mean: number, median: number, p95: number, over: number}}
 *   mean/median/p95 in levels (0–255); over = share of pixels with error ≥ threshold.
 */
export function histogramStats(counts, threshold) {
  const count = counts.reduce((sum, n) => sum + n, 0);
  if (count === 0) return { count, mean: NaN, median: NaN, p95: NaN, over: NaN };
  let sum = 0;
  let above = 0;
  counts.forEach((n, level) => {
    sum += n * level;
    if (level >= threshold) above += n;
  });
  // The smallest level at which the cumulative share reaches p.
  const quantile = (p) => {
    let seen = 0;
    for (let level = 0; level < counts.length; level++) {
      seen += counts[level];
      if (seen >= p * count) return level;
    }
    return counts.length - 1;
  };
  return {
    count,
    mean: sum / count,
    median: quantile(0.5),
    p95: quantile(0.95),
    over: above / count,
  };
}

/**
 * Mean signed difference a − b per channel: a colour or brightness offset between a render
 * and a photo.
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @param {Uint8Array} [mask] - one byte per pixel; only non-zero pixels are counted.
 * @returns {number[]} [R, G, B] in 8-bit levels; NaN for an empty mask.
 */
export function meanSignedDifference(a, b, mask) {
  const sum = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (mask && !mask[i / 4]) continue;
    count += 1;
    for (let c = 0; c < 3; c++) sum[c] += a[i + c] - b[i + c];
  }
  return sum.map((value) => (count === 0 ? NaN : value / count));
}
