import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { UP_AXES } from '../src/config.js';
import { upAxisRotation } from '../src/utils/orientation.js';

const AXIS_VECTORS = { '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };

describe('up-axis rotation', () => {
  it.each(UP_AXES)('turns the file axis %s into +y', (axis) => {
    const rotation = new Quaternion().fromArray(upAxisRotation(axis));
    const up = new Vector3(...AXIS_VECTORS[axis]).applyQuaternion(rotation);
    expect(up.x).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(1);
    expect(up.z).toBeCloseTo(0);
  });

  it('is a pure rotation (unit quaternion, no mirroring)', () => {
    for (const axis of UP_AXES) {
      expect(new Quaternion().fromArray(upAxisRotation(axis)).length()).toBeCloseTo(1);
    }
  });

  it('rejects unknown axes', () => {
    expect(() => upAxisRotation('x')).toThrow('Unknown up axis');
  });
});
