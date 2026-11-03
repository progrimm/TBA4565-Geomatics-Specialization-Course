import { describe, it, expect } from 'vitest';
import {
  alphaMask,
  differenceImage,
  errorHistogram,
  histogramStats,
  flipRows,
  meanOver,
  meanSignedDifference,
  psnr,
  ssim,
  ssimMap,
} from '../src/utils/metrics.js';

/** Repeatable pseudo-random numbers in [0, 1) for the noise test (a linear congruential generator). */
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const W = 48;
const H = 32;

/** A smooth test image with some texture, as RGBA bytes. */
function image(shift = 0) {
  const bytes = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      bytes[i] = 128 + 100 * Math.sin((x + shift) / 4);
      bytes[i + 1] = 128 + 100 * Math.cos(y / 5);
      bytes[i + 2] = (x * 5 + y * 3) % 256;
      bytes[i + 3] = 255;
    }
  }
  return bytes;
}

describe('psnr', () => {
  it('is infinite for identical images and ignores alpha', () => {
    const a = image();
    const b = image();
    b[3] = 0;
    expect(psnr(a, b)).toBe(Infinity);
  });

  it('matches 10·log10(1 / MSE)', () => {
    const a = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
    const b = new Uint8Array([51, 0, 0, 255, 255, 255, 255, 255]);
    // One channel of six off by 0.2: MSE = 0.04 / 6.
    expect(psnr(a, b)).toBeCloseTo(10 * Math.log10(6 / 0.04), 10);
  });
});

describe('ssim', () => {
  it('is 1 for identical images', () => {
    expect(ssim(image(), image(), W, H)).toBeCloseTo(1, 6);
  });

  it('is symmetric and drops with noise and misalignment', () => {
    const random = seededRandom(5);
    const noisy = image().map((value, i) =>
      i % 4 === 3 ? value : value + Math.round(40 * (random() - 0.5)),
    );
    const shifted = image(2);
    const a = image();
    const noise = ssim(a, noisy, W, H);
    expect(noise).toBeCloseTo(ssim(noisy, a, W, H), 10);
    expect(noise).toBeLessThan(1);
    expect(ssim(a, shifted, W, H)).toBeLessThan(ssim(a, image(1), W, H));
  });

  it('matches a direct (non-separable) implementation with zero padding', () => {
    // SSIM straight from the definition: a 2D Gaussian window over each pixel, zero outside.
    const g = Array.from({ length: 11 }, (_, i) => Math.exp(-((i - 5) ** 2) / (2 * 1.5 ** 2)));
    const gSum = g.reduce((s, v) => s + v, 0);
    const win = (dx, dy) => (g[dx + 5] / gSum) * (g[dy + 5] / gSum);
    const a = image();
    const b = image(1);
    let total = 0;
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let [ma, mb, aa, bb, ab] = [0, 0, 0, 0, 0];
          for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
              const xx = x + dx;
              const yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
              const i = (yy * W + xx) * 4 + c;
              const [va, vb, k] = [a[i] / 255, b[i] / 255, win(dx, dy)];
              ma += k * va;
              mb += k * vb;
              aa += k * va * va;
              bb += k * vb * vb;
              ab += k * va * vb;
            }
          }
          const [c1, c2] = [0.01 ** 2, 0.03 ** 2];
          total +=
            ((2 * ma * mb + c1) * (2 * (ab - ma * mb) + c2)) /
            ((ma * ma + mb * mb + c1) * (aa - ma * ma + bb - mb * mb + c2));
        }
      }
    }
    expect(ssim(a, b, W, H)).toBeCloseTo(total / (3 * W * H), 5);
  });

  it('rejects images of different sizes', () => {
    expect(() => ssim(image(), image().subarray(4), W, H)).toThrow('differ in size');
  });
});

describe('masks and helpers', () => {
  it('counts only masked pixels in PSNR and SSIM', () => {
    const a = new Uint8Array([10, 10, 10, 255, 0, 0, 0, 0]);
    const b = new Uint8Array([10, 10, 10, 255, 200, 200, 200, 0]);
    const { mask, coverage } = alphaMask(a, 0.5);
    expect([...mask]).toEqual([1, 0]);
    expect(coverage).toBe(0.5);
    expect(psnr(a, b, mask)).toBe(Infinity);
    expect(psnr(a, b, new Uint8Array(2))).toBeNaN();
    const map = ssimMap(image(), image(1), W, H);
    expect(ssim(image(), image(1), W, H)).toBeCloseTo(meanOver(map), 10);
  });

  it('flips rows', () => {
    const rows = new Uint8Array([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
    expect([...flipRows(rows, 1, 3)]).toEqual([3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1]);
  });

  it('draws no difference black and a large one white', () => {
    const a = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255]);
    const b = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
    expect([...differenceImage(a, b, 4)]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });
});

describe('error distribution', () => {
  // Three pixels: no error, an error of 30 levels on every channel, and one masked out.
  const a = new Uint8Array([10, 10, 10, 255, 40, 40, 40, 255, 0, 0, 0, 0]);
  const b = new Uint8Array([10, 10, 10, 255, 10, 10, 10, 255, 255, 255, 255, 255]);
  const mask = new Uint8Array([1, 1, 0]);

  it('counts the mean absolute RGB error per pixel', () => {
    const counts = errorHistogram(a, b, mask);
    expect(counts[0]).toBe(1);
    expect(counts[30]).toBe(1);
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(2);
    expect(errorHistogram(a, b)[255]).toBe(1);
  });

  it('summarises a histogram', () => {
    const counts = new Uint32Array(256);
    counts[0] = 50;
    counts[10] = 45;
    counts[200] = 5;
    const stats = histogramStats(counts, 26);
    expect(stats.count).toBe(100);
    expect(stats.mean).toBeCloseTo((45 * 10 + 5 * 200) / 100, 10);
    expect(stats.median).toBe(0);
    expect(stats.p95).toBe(10);
    expect(stats.over).toBeCloseTo(0.05, 10);
    expect(histogramStats(new Uint32Array(256), 26).mean).toBeNaN();
  });

  it('gives the signed offset per channel', () => {
    expect(meanSignedDifference(a, b, mask)).toEqual([15, 15, 15]);
  });
});
