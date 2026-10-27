import { describe, it, expect } from 'vitest';
import { formatBytes, formatDegrees, formatDistance, formatSigned } from '../src/utils/format.js';

describe('format helpers', () => {
  it('switches from metres to kilometres at 1 km', () => {
    expect(formatDistance(999.994)).toBe('999.99 m');
    expect(formatDistance(1234.5)).toBe('1.234 km');
  });

  it('signs height differences with a proper minus sign', () => {
    expect(formatSigned(1.234)).toBe('+1.23 m');
    expect(formatSigned(-12.08)).toBe('−12.08 m');
    expect(formatSigned(0)).toBe('±0.00 m');
  });

  it('formats degrees and binary byte units', () => {
    expect(formatDegrees(47.647851, 5)).toBe('47.64785°');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(3 * 1024 ** 2)).toBe('3.0 MiB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GiB');
  });
});
