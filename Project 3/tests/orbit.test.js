import { describe, it, expect } from 'vitest';
import { horizontalBasis, orbitAngle, orbitPosition } from '../src/utils/orbit.js';

const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

describe('horizontalBasis', () => {
  it.each([[[0, 1, 0]], [[0, -1, 0]], [[1, 0, 0]], [[0, 0, 2]]])(
    'gives two unit vectors perpendicular to up %j',
    (up) => {
      const [e1, e2] = horizontalBasis(up);
      expect(Math.hypot(...e1)).toBeCloseTo(1, 12);
      expect(Math.hypot(...e2)).toBeCloseTo(1, 12);
      expect(dot(e1, e2)).toBeCloseTo(0, 12);
      expect(dot(e1, up)).toBeCloseTo(0, 12);
      expect(dot(e2, up)).toBeCloseTo(0, 12);
    },
  );
});

describe('orbitPosition', () => {
  const camera = { target: [1, -2, 3], up: [0, -1, 0], radius: 9, height: 3 };

  it('stays at the orbit radius and height above the target', () => {
    for (const angle of [0, 45, 200, 359]) {
      const position = orbitPosition(camera, angle);
      // Height along up (-y here): 3 m above the target means y = -2 - 3.
      expect(position[1]).toBeCloseTo(-5, 12);
      expect(distance(position, camera.target)).toBeCloseTo(Math.hypot(9, 3), 12);
    }
  });

  it('is opposite after half a turn', () => {
    const a = orbitPosition(camera, 30);
    const b = orbitPosition(camera, 210);
    expect((a[0] + b[0]) / 2).toBeCloseTo(1, 12);
    expect((a[2] + b[2]) / 2).toBeCloseTo(3, 12);
  });
});

describe('orbitAngle', () => {
  it('makes one full turn per duration', () => {
    expect(orbitAngle(0, 10000, 200)).toBe(200);
    expect(orbitAngle(5000, 10000, 200)).toBe(380);
    expect(orbitAngle(10000, 10000, 0)).toBe(360);
  });
});
