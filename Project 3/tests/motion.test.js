import { afterEach, describe, it, expect, vi } from 'vitest';
import { flightDuration } from '../src/utils/motion.js';

const stubReducedMotion = (reduce) =>
  vi.stubGlobal('window', {
    matchMedia: (query) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }),
  });

describe('flightDuration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('jumps instantly when the user prefers reduced motion', () => {
    stubReducedMotion(true);
    expect(flightDuration()).toBe(0);
  });

  it('leaves the duration to Cesium otherwise', () => {
    stubReducedMotion(false);
    expect(flightDuration()).toBeUndefined();
  });
});
