import { afterEach, describe, it, expect } from 'vitest';
import { Ion } from 'cesium';
import { CESIUM_EVALUATION_TOKEN, configureIon } from '../src/viewer.js';

const original = Ion.defaultAccessToken;

describe('Cesium ion tokens', () => {
  afterEach(() => {
    Ion.defaultAccessToken = original;
  });

  it("keeps Cesium's evaluation token after our own token is configured", () => {
    configureIon('our-token');
    expect(Ion.defaultAccessToken).toBe('our-token');
    expect(CESIUM_EVALUATION_TOKEN).toBe(original);
    expect(CESIUM_EVALUATION_TOKEN).not.toBe('our-token');
  });
});
