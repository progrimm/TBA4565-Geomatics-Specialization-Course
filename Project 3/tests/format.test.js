import { describe, it, expect } from 'vitest';
import { formatBytes, formatCount, formatLength, formatNumber } from '../src/utils/format.js';

describe('format helpers', () => {
  it('formats lengths in file units, with fewer decimals for large values', () => {
    expect(formatNumber(1.23456)).toBe('1.235');
    expect(formatNumber(1234.56)).toBe('1234.6');
    expect(formatNumber(-250)).toBe('-250.0');
    expect(formatLength(2.5)).toBe('2.500 units');
  });

  it('groups thousands with thin spaces', () => {
    expect(formatCount(200258)).toBe('200 258');
    expect(formatCount(110_000_000)).toBe('110 000 000');
    expect(formatCount(999)).toBe('999');
  });

  it('formats binary byte units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(3 * 1024 ** 2)).toBe('3.0 MiB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GiB');
  });
});
