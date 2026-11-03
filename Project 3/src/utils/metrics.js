// Image quality metrics as in the 3DGS evaluation (Kerbl et al. 2023, utils/loss_utils.py and
// utils/image_utils.py): on RGB in [0, 1]; the alpha channel is ignored. Pure functions on
// RGBA byte arrays (ImageData layout), so they also run in a Web Worker.

/**
 * Peak signal-to-noise ratio, 10 · log10(1 / MSE), over all pixels and the R, G, B channels.
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @returns {number} dB; Infinity for identical images.
 */
export function psnr(a, b) {
  if (a.length !== b.length) throw new Error('The images differ in size.');
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = (a[i + c] - b[i + c]) / 255;
      sum += d * d;
    }
  }
  const mse = sum / ((a.length / 4) * 3);
  return mse === 0 ? Infinity : 10 * Math.log10(1 / mse);
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
 * Structural similarity (Wang et al. 2004) with a Gaussian window, per channel, averaged over
 * the pixels and the R, G, B channels; constants C1 = 0.01², C2 = 0.03².
 * @param {Uint8Array | Uint8ClampedArray} a - RGBA bytes.
 * @param {Uint8Array | Uint8ClampedArray} b - RGBA bytes, same size.
 * @param {number} width
 * @param {number} height
 * @param {{windowSize?: number, sigma?: number}} [options] - default 11 and 1.5, as in 3DGS.
 * @returns {number} 1 for identical images.
 */
export function ssim(a, b, width, height, { windowSize = 11, sigma = 1.5 } = {}) {
  const n = width * height;
  if (a.length !== n * 4 || b.length !== n * 4) throw new Error('The images differ in size.');
  const kernel = gaussian(windowSize, sigma);
  const C1 = 0.01 ** 2;
  const C2 = 0.03 ** 2;
  const product = new Float32Array(n);
  const temp = new Float32Array(n);
  const [muA, muB, aa, bb, ab] = Array.from({ length: 5 }, () => new Float32Array(n));
  const blurred = (out, value) => {
    for (let i = 0; i < n; i++) product[i] = value(i * 4);
    blur(product, width, height, kernel, temp, out);
  };
  let total = 0;
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
      total +=
        ((2 * mA * mB + C1) * (2 * cov + C2)) / ((mA * mA + mB * mB + C1) * (varA + varB + C2));
    }
  }
  return total / (3 * n);
}
