import { describe, it, expect } from 'vitest';
import { CAMERA_VIEWS } from '../src/config.js';

describe('config', () => {
  it('has a Trondheim start view with valid WGS84 coordinates', () => {
    const { longitude, latitude } = CAMERA_VIEWS.trondheimCentre;
    expect(longitude).toBeGreaterThanOrEqual(-180);
    expect(longitude).toBeLessThanOrEqual(180);
    expect(latitude).toBeGreaterThanOrEqual(-90);
    expect(latitude).toBeLessThanOrEqual(90);
  });
});
