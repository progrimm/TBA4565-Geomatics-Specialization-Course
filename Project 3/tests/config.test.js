import { describe, it, expect } from 'vitest';
import { SPLAT } from '../src/config.js';

describe('config', () => {
  it('has a valid Cesium ion asset ID and tileset settings for the splat', () => {
    expect(Number.isInteger(SPLAT.ionAssetId)).toBe(true);
    expect(SPLAT.ionAssetId).toBeGreaterThan(0);
    expect(SPLAT.tilesetSettings.maximumScreenSpaceError).toBeGreaterThan(0);
  });
});
