import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  findNearest,
  formatDistance,
  geodesicDistance,
  summarizeShelters,
} from '../src/utils/nearest.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/nearest-shelters.json', import.meta.url), 'utf8'),
);
const { point, shelters, distances } = fixture;

describe('geodesicDistance', () => {
  // Textbook WGS84 values (also given by GeographicLib): 1° of longitude along the
  // equator = a · π / 180, and the meridian arc from 0° to 1° latitude.
  it('matches known distances on the WGS84 ellipsoid', () => {
    const origin = { longitude: 0, latitude: 0 };
    expect(geodesicDistance(origin, { longitude: 1, latitude: 0 })).toBeCloseTo(111319.4908, 3);
    expect(geodesicDistance(origin, { longitude: 0, latitude: 1 })).toBeCloseTo(110574.3886, 3);
  });

  it.each(shelters)('matches GeographicLib from Torvet to shelter $romnr', (shelter) => {
    expect(geodesicDistance(point, shelter)).toBeCloseTo(distances[shelter.romnr], 3);
  });

  it('is symmetric and zero for identical points', () => {
    const [a, b] = shelters;
    expect(geodesicDistance(a, b)).toBeCloseTo(geodesicDistance(b, a), 6);
    expect(geodesicDistance(a, a)).toBe(0);
  });
});

describe('findNearest', () => {
  it('returns the closest shelter and its distance', () => {
    const nearest = findNearest(point, shelters);
    expect(nearest.shelter.romnr).toBe(6870);
    expect(nearest.distance).toBeCloseTo(distances[6870], 3);
  });

  it('does not depend on the order of the list', () => {
    expect(findNearest(point, [...shelters].reverse()).shelter.romnr).toBe(6870);
  });

  it('returns distance 0 when the point is a shelter', () => {
    const [, second] = shelters;
    expect(findNearest(second, shelters)).toEqual({ shelter: second, distance: 0 });
  });

  it('returns undefined for an empty list', () => {
    expect(findNearest(point, [])).toBeUndefined();
  });
});

describe('summarizeShelters', () => {
  it('counts shelters and sums their capacity', () => {
    expect(summarizeShelters(shelters)).toEqual({ count: 4, capacity: 630 + 200 + 200 + 45 });
    expect(summarizeShelters([])).toEqual({ count: 0, capacity: 0 });
  });
});

describe('formatDistance', () => {
  it('uses metres below 1 km and kilometres above', () => {
    expect(formatDistance(199.2548)).toBe('199 m');
    expect(formatDistance(4132.8812)).toBe('4.13 km');
  });
});
