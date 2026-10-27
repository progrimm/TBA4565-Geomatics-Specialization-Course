import { describe, it, expect } from 'vitest';
import { median, percentile, summariseRun } from '../src/utils/benchmark.js';

describe('median', () => {
  it('takes the middle value of an odd count', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the two middle values of an even count', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('percentile', () => {
  it('uses the nearest rank', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(percentile(values, 95)).toBe(19);
    expect(percentile(values, 100)).toBe(20);
    expect(percentile(values, 5)).toBe(1);
  });
});

describe('summariseRun', () => {
  it('reports 60 fps for steady 60 Hz frames', () => {
    const steady = Array.from({ length: 61 }, (_, i) => i * (1000 / 60));
    const run = summariseRun(steady);
    expect(run.frames).toBe(60);
    expect(run.meanFps).toBeCloseTo(60, 9);
    expect(run.p5Fps).toBeCloseTo(60, 9);
  });

  it('lets slow frames lower the 5th-percentile rate more than the mean', () => {
    // 18 frames of 10 ms and 2 of 100 ms (20 frames in 380 ms): the
    // 95th-percentile frame is 100 ms.
    const intervals = [...Array(18).fill(10), 100, 100];
    const timestamps = intervals.reduce((times, ms) => [...times, times.at(-1) + ms], [0]);
    const run = summariseRun(timestamps);
    expect(run.meanFps).toBeCloseTo(20000 / 380, 9);
    expect(run.p5Fps).toBeCloseTo(10, 9);
  });
});
