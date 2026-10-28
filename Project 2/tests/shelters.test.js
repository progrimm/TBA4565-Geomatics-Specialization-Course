import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSheltersGml } from '../src/utils/shelters.js';

const gml = readFileSync(new URL('./fixtures/shelters.gml', import.meta.url), 'utf8');

describe('parseSheltersGml', () => {
  it('returns one GeoJSON point feature per WFS member', () => {
    const { type, features } = parseSheltersGml(gml);
    expect(type).toBe('FeatureCollection');
    expect(features).toHaveLength(2);
    expect(features[0].geometry.type).toBe('Point');
  });

  it('converts UTM32 to WGS84 [lon, lat] rounded to 7 decimals', () => {
    const [, second] = parseSheltersGml(gml).features;
    expect(second.geometry.coordinates).toEqual([9, 0]);
  });

  it('parses attributes as numbers and keeps Norwegian characters', () => {
    const [first, second] = parseSheltersGml(gml).features;
    expect(first.properties).toEqual({
      romnr: 6870,
      plasser: 630,
      adresse: 'Westermannsveita 4 Tidl. Nordre gate 1',
    });
    expect(second.properties.adresse).toBe('Øvre Flatåsveg 2 A');
  });

  it('returns an empty collection when there are no members', () => {
    const empty = '<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0"/>';
    expect(parseSheltersGml(empty).features).toEqual([]);
  });
});

describe('parseSheltersGml with bad or missing attributes', () => {
  const invalid = readFileSync(new URL('./fixtures/shelters-invalid.gml', import.meta.url), 'utf8');

  it('keeps only valid members, with an empty address when it is missing', () => {
    const { features } = parseSheltersGml(invalid);
    expect(features).toHaveLength(1);
    expect(features[0].properties).toEqual({ romnr: 6870, plasser: 630, adresse: '' });
  });

  it('reports every member it leaves out, with the reason', () => {
    const skipped = [];
    parseSheltersGml(invalid, { onInvalid: (reason, index) => skipped.push([index, reason]) });
    expect(skipped).toEqual([
      [1, 'missing or invalid point geometry'],
      [2, 'missing or invalid point geometry'],
      [3, 'missing or invalid capacity (plasser)'],
      [4, 'missing or invalid capacity (plasser)'],
      [5, 'missing or invalid shelter number (romnr)'],
      [6, 'not a layer_340 feature'],
    ]);
  });

  it('returns an empty collection for a response that is not a FeatureCollection', () => {
    expect(parseSheltersGml('<ExceptionReport/>').features).toEqual([]);
  });
});
