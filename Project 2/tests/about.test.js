import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONCEPTS,
  DATA_SOURCES,
  LIMITATIONS,
  formatDate,
  keyResults,
} from '../src/content/about.js';

const isHttps = (url) => new URL(url).protocol === 'https:';

describe('"How it works" content', () => {
  it('names a licence and a source link for every dataset', () => {
    for (const source of DATA_SOURCES) {
      expect(source.licence.name, source.name).toBeTruthy();
      expect(isHttps(source.licence.url), source.name).toBe(true);
      expect(isHttps(source.source.url), source.name).toBe(true);
      expect(source.crs, source.name).toBeTruthy();
      if (source.date) expect(source.dateLabel, source.name).toBeTruthy();
    }
  });

  it('links every concept to a reference, with unique titles', () => {
    for (const concept of CONCEPTS) {
      expect(concept.text.length, concept.title).toBeGreaterThan(80);
      expect(isHttps(concept.link.url), concept.title).toBe(true);
    }
    expect(new Set(CONCEPTS.map((concept) => concept.title)).size).toBe(CONCEPTS.length);
    expect(LIMITATIONS.length).toBeGreaterThan(0);
  });

  it('turns the committed analysis summary into result rows', () => {
    const summary = JSON.parse(
      readFileSync(new URL('../public/data/analysis-summary.json', import.meta.url), 'utf8'),
    );
    const rows = keyResults(summary);
    expect(rows.map((row) => row.label)).toEqual([
      'Test points',
      'Walk ÷ straight line',
      'Different shelter',
      'Through a building',
      'Residents covered',
      'Capacity',
      'Terrain check',
    ]);
    expect(rows[6].value).toContain(`RMSE ${summary.terrainCheck.rmseMetres.toFixed(1)} m`);
    expect(rows[5].value).toContain(summary.coverage.residentsPerPlace.toFixed(1));
    expect(rows[0].value).toContain(`${summary.routed} routed`);
    expect(rows[1].value).toContain(summary.detourRatio.median.toFixed(2));
    expect(rows.every((row) => !row.value.includes('undefined'))).toBe(true);
  });

  it('formats dates and timestamps as YYYY-MM-DD', () => {
    expect(formatDate('2026-10-27T10:35:02Z')).toBe('2026-10-27');
    expect(formatDate('2026-10-28')).toBe('2026-10-28');
    expect(formatDate(undefined)).toBeUndefined();
    expect(formatDate('yesterday')).toBeUndefined();
  });
});
