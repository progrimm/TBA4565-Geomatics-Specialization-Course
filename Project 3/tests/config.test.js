import { describe, it, expect } from 'vitest';
import { ITWIN_SHARE_KEY, SPLATS, SPLAT_TILESET_SETTINGS } from '../src/config.js';

describe('config', () => {
  it('has unique IDs and a valid source for every gallery splat', () => {
    expect(new Set(SPLATS.map((splat) => splat.id)).size).toBe(SPLATS.length);
    for (const { source } of SPLATS) {
      if (source.type === 'ion') {
        expect(Number.isInteger(source.assetId) && source.assetId > 0).toBe(true);
      } else {
        expect(source.type).toBe('itwin');
        expect(source.iTwinId).toMatch(/^[0-9a-f-]{36}$/);
        expect(source.realityDataId).toMatch(/^[0-9a-f-]{36}$/);
      }
    }
  });

  it('places every marker inside WGS84 lon/lat bounds and credits every splat', () => {
    for (const { marker, credits } of SPLATS) {
      expect(Math.abs(marker.longitude)).toBeLessThanOrEqual(180);
      expect(Math.abs(marker.latitude)).toBeLessThanOrEqual(90);
      expect(credits.length).toBeGreaterThan(0);
    }
  });

  it('has a positive screen-space error', () => {
    expect(SPLAT_TILESET_SETTINGS.maximumScreenSpaceError).toBeGreaterThan(0);
  });

  it('documents the expiry date of the iTwin share key', () => {
    // The key is a JWT; its payload holds the expiry (`exp`, seconds since 1970).
    const payload = JSON.parse(atob(ITWIN_SHARE_KEY.split('.')[1]));
    expect(new Date(payload.exp * 1000).toISOString()).toBe('2026-12-01T05:13:34.000Z');
  });
});
