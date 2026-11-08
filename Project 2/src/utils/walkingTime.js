/**
 * Walking time on sloping ground with Tobler's hiking function (Tobler 1993):
 *
 *   v = 6 · exp(−3.5 · |s + 0.05|) km/h,  s = dh / dx (rise over horizontal distance).
 *
 * The fastest speed, 6 km/h, is on a gentle 5 % downhill; on the flat it is 5.04 km/h;
 * walking uphill or steeply downhill is slower. Because the speed depends on the sign of
 * the slope, the same edge takes different times in its two directions.
 */

/** Tobler's speed on a slope, in km/h. */
export const toblerSpeed = (slope) => 6 * Math.exp(-3.5 * Math.abs(slope + 0.05));

/** Speed on flat ground, km/h (≈ 5.036). Used for the straight connectors. */
export const FLAT_SPEED = toblerSpeed(0);

/**
 * Seconds to walk a segment.
 * @param {number} metres - horizontal (map) length, > 0.
 * @param {number} rise - height at the end minus height at the start, metres.
 * @returns {number} seconds; 0 for a segment of length 0.
 */
export function segmentSeconds(metres, rise) {
  if (metres <= 0) return 0;
  return metres / (toblerSpeed(rise / metres) / 3.6);
}

/**
 * Seconds to walk a distance on flat ground.
 * @param {number} metres
 */
export const flatSeconds = (metres) => metres / (FLAT_SPEED / 3.6);
