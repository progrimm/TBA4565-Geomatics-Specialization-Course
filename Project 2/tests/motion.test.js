import { afterEach, describe, it, expect, vi } from 'vitest';
import { flightDuration } from '../src/utils/motion.js';

/** Stub window.matchMedia so that only the reduced-motion query matches when `reduce` is true. */
const stubMotionPreference = (reduce) =>
  vi.stubGlobal('window', {
    matchMedia: (query) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }),
  });

describe('flightDuration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('jumps instantly (0 s) when the user prefers reduced motion', () => {
    stubMotionPreference(true);
    expect(flightDuration()).toBe(0);
  });

  it('leaves the duration to Cesium otherwise', () => {
    stubMotionPreference(false);
    expect(flightDuration()).toBeUndefined();
  });
});
