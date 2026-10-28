import { describe, it, expect } from 'vitest';
import { COMPARISON, COMPARISON_COLUMNS } from '../src/lab/comparison.js';
import { VIEWERS } from '../src/lab/config.js';

describe('Viewer lab comparison table', () => {
  it('has a row for every lab viewer, plus CesiumJS from the gallery', () => {
    const ids = COMPARISON.map((row) => row.id);
    expect(ids).toEqual(expect.arrayContaining(VIEWERS.map((viewer) => viewer.id)));
    expect(ids).toContain('cesium');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills every column except the measured integration lines', () => {
    const textColumns = COMPARISON_COLUMNS.map((column) => column.key).filter((k) => k !== 'lines');
    for (const row of COMPARISON) {
      for (const key of textColumns) {
        expect(row[key], `${row.id}.${key}`).toEqual(expect.any(String));
        expect(row[key].trim().length, `${row.id}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
