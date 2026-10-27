import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv } from '../src/utils/csv.js';

describe('parseCsv', () => {
  it('reads quoted strings and numbers', () => {
    const text = 'viewer,run,fps\n"Spark",1,58.20\r\n"Babylon.js",2,61.00\n';
    expect(parseCsv(text)).toEqual([
      { viewer: 'Spark', run: 1, fps: 58.2 },
      { viewer: 'Babylon.js', run: 2, fps: 61 },
    ]);
  });

  it('keeps empty cells as empty strings', () => {
    expect(parseCsv('a,b\n1,\n')).toEqual([{ a: 1, b: '' }]);
  });
});

describe('toCsv', () => {
  it('round-trips through parseCsv', () => {
    const rows = [
      { viewer: 'Spark', run: 1, fps: 58.234 },
      { viewer: 'PlayCanvas', run: 2, fps: 40 },
    ];
    const text = toCsv(rows);
    expect(text).toBe('viewer,run,fps\n"Spark",1.00,58.23\n"PlayCanvas",2.00,40.00\n');
    expect(parseCsv(text)).toEqual([
      { viewer: 'Spark', run: 1, fps: 58.23 },
      { viewer: 'PlayCanvas', run: 2, fps: 40 },
    ]);
  });
});
