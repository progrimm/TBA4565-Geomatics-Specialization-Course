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
