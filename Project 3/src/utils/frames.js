/**
 * Summarise frame timestamps from one sampling window.
 * @param {number[]} timestamps - performance.now() of each rendered frame, ascending.
 * @param {number} windowMs - length of the sampling window in milliseconds.
 * @returns {{fps: number, worstFrameMs: number}} fps = frames per second over the
 *   window; worstFrameMs = longest gap between consecutive frames (0 if < 2 frames).
 */
export function summariseFrames(timestamps, windowMs) {
  let worstFrameMs = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    worstFrameMs = Math.max(worstFrameMs, timestamps[i] - timestamps[i - 1]);
  }
  return { fps: (timestamps.length * 1000) / windowMs, worstFrameMs };
}
