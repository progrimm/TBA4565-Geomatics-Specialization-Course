/**
 * Median of a list of numbers.
 * @param {number[]} values - at least one value.
 * @returns {number} middle value, or the mean of the two middle values.
 */
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Value at a percentile, by the nearest-rank method.
 * @param {number[]} values - at least one value.
 * @param {number} p - percentile in (0, 100].
 * @returns {number} smallest value with at least p % of the values at or below it.
 */
export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1];
}

/**
 * Frame-rate summary of a timed run.
 * @param {number[]} timestamps - performance.now() of each frame (ms), ascending, at
 *   least two.
 * @returns {{frames: number, meanFps: number, p5Fps: number}} meanFps = frame
 *   intervals per second over the run; p5Fps = the 5th-percentile frame rate, i.e.
 *   1000 / the 95th-percentile frame time (the slow frames).
 */
export function summariseRun(timestamps) {
  const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]);
  const totalMs = timestamps.at(-1) - timestamps[0];
  return {
    frames: intervals.length,
    meanFps: (intervals.length * 1000) / totalMs,
    p5Fps: 1000 / percentile(intervals, 95),
  };
}
