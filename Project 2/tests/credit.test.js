import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { withFetchDate } from '../src/utils/credit.js';

const CREDIT = 'Tilfluktsrom: © DSB, NLOD';

describe('withFetchDate', () => {
  it('appends an ISO fetch date', () => {
    expect(withFetchDate(CREDIT, { fetched: '2026-10-28' })).toBe(
      'Tilfluktsrom: © DSB, NLOD · data fetched 2026-10-28',
    );
  });

  it('leaves the credit unchanged without valid metadata', () => {
    expect(withFetchDate(CREDIT)).toBe(CREDIT);
    expect(withFetchDate(CREDIT, {})).toBe(CREDIT);
    expect(withFetchDate(CREDIT, { fetched: '28.10.2026' })).toBe(CREDIT);
    expect(withFetchDate(CREDIT, { fetched: 20261028 })).toBe(CREDIT);
  });

  it('matches the metadata in the committed shelter dataset', () => {
    const url = new URL('../public/data/shelters.geojson', import.meta.url);
    const { metadata, features } = JSON.parse(readFileSync(url, 'utf8'));
    expect(metadata.featureCount).toBe(features.length);
    expect(withFetchDate(CREDIT, metadata)).toMatch(/data fetched \d{4}-\d{2}-\d{2}$/);
  });
});
