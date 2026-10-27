import { describe, it, expect } from 'vitest';
import { CAMERA_VIEWS } from '../src/config.js';

describe('config', () => {
  it.each(Object.entries(CAMERA_VIEWS))(
    '%s view targets Trondheim with a valid range and downward pitch',
    (_key, { target, pitch, range }) => {
      // Rough Trondheim bounding box, WGS84 degrees.
      expect(target.longitude).toBeGreaterThan(10.2);
      expect(target.longitude).toBeLessThan(10.6);
      expect(target.latitude).toBeGreaterThan(63.35);
      expect(target.latitude).toBeLessThan(63.48);
      expect(range).toBeGreaterThan(0);
      expect(pitch).toBeLessThan(0);
    },
  );
});
