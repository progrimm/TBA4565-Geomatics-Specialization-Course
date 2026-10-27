import { describe, it, expect } from 'vitest';
import { summariseFrames } from '../src/utils/frames.js';

describe('summariseFrames', () => {
  it('counts frames per second over the window', () => {
    const steady = Array.from({ length: 60 }, (_, i) => i * (1000 / 60));
    expect(summariseFrames(steady, 1000).fps).toBeCloseTo(60, 9);
    expect(summariseFrames(steady, 1000).worstFrameMs).toBeCloseTo(1000 / 60, 9);
  });

  it('reports the longest frame gap (a stutter)', () => {
    expect(summariseFrames([0, 16, 32, 132, 148], 500)).toEqual({ fps: 10, worstFrameMs: 100 });
  });

  it('handles an idle window without frames', () => {
    expect(summariseFrames([], 1000)).toEqual({ fps: 0, worstFrameMs: 0 });
  });
});
