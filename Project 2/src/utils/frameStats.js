/**
 * Frame-rate statistics from the timestamps of consecutive rendered frames.
 * @param {number[]} timestamps - performance.now() of each frame, in ms, ascending.
 * @returns {{frames: number, meanFps: number, p5Fps: number, worstFrameMs: number}}
 *   meanFps: frames per second over the whole span; p5Fps: the 5th-percentile
 *   frame rate (from the 95th-percentile frame time), i.e. how slow the slowest
 *   5 % of frames are. All zero for fewer than two frames.
 */
export function summarizeFrames(timestamps) {
  const intervals = timestamps.slice(1).map((time, i) => time - timestamps[i]);
  if (intervals.length === 0)
    return { frames: timestamps.length, meanFps: 0, p5Fps: 0, worstFrameMs: 0 };
  const span = timestamps.at(-1) - timestamps[0];
  const sorted = [...intervals].sort((a, b) => a - b);
  // Nearest-rank percentile: the smallest interval with at least 95 % of intervals at or below it.
  const p95 = sorted[Math.ceil(0.95 * sorted.length) - 1];
  return {
    frames: timestamps.length,
    meanFps: (intervals.length / span) * 1000,
    p5Fps: 1000 / p95,
    worstFrameMs: sorted.at(-1),
  };
}
