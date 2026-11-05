import { ELLIPSOID_VIEW } from '../config.js';

/**
 * Renderer settings for the ellipsoid view. At 0 they are Spark's defaults (the normal render);
 * towards 1 the Gaussian kernel turns into a flat fill cut at the 1σ ellipse, and each splat's
 * opacity is pulled towards 1.
 * @param {number} amount - 0 (normal) to 1 (opaque ellipsoids); clamped to that range.
 * @returns {{opacityMix: number, falloff: number, maxStdDev: number}}
 *   opacityMix: how far each splat's opacity moves towards 1; falloff: Spark's kernel falloff
 *   (1 Gaussian, 0 flat); maxStdDev: where Spark cuts a splat off, in standard deviations.
 */
export function ellipsoidSettings(amount) {
  const t = Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0;
  const { defaultStdDev, edgeStdDev } = ELLIPSOID_VIEW;
  return {
    opacityMix: t,
    falloff: 1 - t,
    maxStdDev: defaultStdDev + (edgeStdDev - defaultStdDev) * t,
  };
}
