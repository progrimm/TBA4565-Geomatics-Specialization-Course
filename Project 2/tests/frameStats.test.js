import { describe, it, expect } from 'vitest';
import { summarizeFrames } from '../src/utils/frameStats.js';

describe('summarizeFrames', () => {
  it('gives 60 fps for a steady 16.67 ms frame time', () => {
    const timestamps = Array.from({ length: 61 }, (_, i) => (i * 1000) / 60);
    const stats = summarizeFrames(timestamps);
    expect(stats.frames).toBe(61);
    expect(stats.meanFps).toBeCloseTo(60, 6);
    expect(stats.p5Fps).toBeCloseTo(60, 6);
  });

  it('lets the slowest 5 % of frames set the 5th-percentile rate', () => {
    // 95 frames of 10 ms and 5 of 50 ms: 100 intervals, 1 s in total.
    const intervals = [...Array(95).fill(10), ...Array(5).fill(50)];
    const timestamps = intervals.reduce((list, dt) => [...list, list.at(-1) + dt], [0]);
    const stats = summarizeFrames(timestamps);
    expect(stats.meanFps).toBeCloseTo(100 / 1.2, 6);
    expect(stats.p5Fps).toBeCloseTo(100, 6); // 95th-percentile frame time is still 10 ms
    expect(stats.worstFrameMs).toBe(50);
  });

  it('returns zeros for fewer than two frames', () => {
    expect(summarizeFrames([])).toEqual({ frames: 0, meanFps: 0, p5Fps: 0, worstFrameMs: 0 });
    expect(summarizeFrames([5])).toEqual({ frames: 1, meanFps: 0, p5Fps: 0, worstFrameMs: 0 });
  });
});
