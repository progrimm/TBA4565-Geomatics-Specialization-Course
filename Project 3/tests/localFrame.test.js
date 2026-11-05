import { describe, it, expect } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { LOCAL_FRAME } from '../src/config.js';
import {
  applyLocalFrame,
  fitSimilarity,
  frameInFile,
  levelQuaternion,
  parseLocalFrame,
  rotate,
  rotationAngleAxis,
  scaleFromDistance,
  serializeLocalFrame,
  symmetricEigen,
} from '../src/utils/localFrame.js';

const expectPoint = (actual, expected, digits = 9) =>
  expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, digits));

// A known transform: scale 2.5, 40° about a tilted axis, a large offset.
const AXIS = new Vector3(1, -2, 0.5).normalize();
const Q = new Quaternion().setFromAxisAngle(AXIS, (40 * Math.PI) / 180).toArray();
const KNOWN = { scale: 2.5, quaternion: Q, translation: [6_000_000, 500_000, 120] };
const SOURCE = [
  [0.1, 0.2, 0.3],
  [1.2, -0.4, 0.8],
  [-0.7, 0.9, 0.1],
  [0.3, 0.5, -1.1],
  [0.9, 1.1, 0.6],
];
const TARGET = SOURCE.map((p) => applyLocalFrame(KNOWN, p));

describe('symmetric eigen-solver', () => {
  it('satisfies A v = λ v', () => {
    const A = [
      [4, 1, -2, 0.5],
      [1, 3, 0, 1],
      [-2, 0, 5, -1],
      [0.5, 1, -1, 2],
    ];
    const { values, vectors } = symmetricEigen(A);
    values.forEach((lambda, k) => {
      const v = vectors[k];
      const Av = A.map((row) => row.reduce((sum, a, j) => sum + a * v[j], 0));
      expectPoint(
        Av,
        v.map((x) => lambda * x),
      );
    });
  });
});

describe('rotate', () => {
  it('matches three.js', () => {
    const expected = new Vector3(0.3, -1.2, 2).applyQuaternion(new Quaternion(...Q)).toArray();
    expectPoint(rotate(Q, [0.3, -1.2, 2]), expected, 12);
  });
});

describe('similarity transform (Helmert)', () => {
  it('recovers a known transform exactly', () => {
    const fit = fitSimilarity(SOURCE, TARGET, 'm');
    expect(fit.method).toBe('coordinates');
    expect(fit.scale).toBeCloseTo(2.5, 8);
    // q and −q are the same rotation; the fit returns w ≥ 0, as Q has.
    expectPoint(fit.quaternion, Q, 8);
    expectPoint(fit.translation, KNOWN.translation, 6);
    expect(fit.rmse).toBeLessThan(1e-6);
    expect(fit.residuals).toHaveLength(SOURCE.length);
  });

  it('works with exactly three points', () => {
    const fit = fitSimilarity(SOURCE.slice(0, 3), TARGET.slice(0, 3), 'cm');
    expect(fit.scale).toBeCloseTo(2.5, 9);
    expect(fit.rmse).toBeLessThan(1e-6);
  });

  it('gives an RMSE of the size of the noise, with residuals that sum to zero', () => {
    const noise = [
      [0.01, -0.02, 0.0],
      [-0.01, 0.01, 0.02],
      [0.02, 0.0, -0.01],
      [0.0, 0.01, -0.02],
      [-0.02, 0.0, 0.01],
    ];
    const noisy = TARGET.map((p, i) => p.map((v, j) => v + noise[i][j]));
    const fit = fitSimilarity(SOURCE, noisy, 'm');
    expect(fit.scale).toBeCloseTo(2.5, 2);
    expect(fit.rmse).toBeGreaterThan(0.001);
    expect(fit.rmse).toBeLessThan(0.03);
    const sum = fit.residuals.reduce((acc, r) => acc.map((v, i) => v + r[i]), [0, 0, 0]);
    expectPoint(sum, [0, 0, 0], 6);
  });

  it('puts the user origin and axes back at the right place in the file', () => {
    const fit = fitSimilarity(SOURCE, TARGET, 'm');
    const { origin, axes } = frameInFile(fit);
    expectPoint(applyLocalFrame(fit, origin), [0, 0, 0], 6);
    axes.forEach((axis, i) => {
      const unit = [0, 0, 0];
      unit[i] = 1;
      expectPoint(rotate(fit.quaternion, axis), unit, 9);
    });
  });

  it('rejects too few, incomplete and collinear points', () => {
    expect(() => fitSimilarity(SOURCE.slice(0, 2), TARGET.slice(0, 2), 'm')).toThrow(
      `At least ${LOCAL_FRAME.minPoints}`,
    );
    expect(() =>
      fitSimilarity([...SOURCE.slice(0, 2), [0, NaN, 0]], TARGET.slice(0, 3), 'm'),
    ).toThrow('three numbers');
    const line = [
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
      [3, 3, 3],
    ];
    expect(() => fitSimilarity(line, line, 'm')).toThrow('one line');
  });
});

describe('scale from a known distance', () => {
  it('is the known length over the measured one, keeping the file frame', () => {
    const frame = scaleFromDistance([0, 0, 0], [0, 3, 4], 12, 'cm');
    expect(frame.scale).toBeCloseTo(12 / 5, 12);
    expectPoint(applyLocalFrame(frame, [1, 2, 3]), [2.4, 4.8, 7.2], 12);
    expect(frame.rmse).toBeNull();
  });

  it('rejects coincident points and bad lengths', () => {
    expect(() => scaleFromDistance([1, 1, 1], [1, 1, 1], 1, 'm')).toThrow('the same');
    expect(() => scaleFromDistance([0, 0, 0], [1, 0, 0], 0, 'm')).toThrow('above 0');
    expect(() => scaleFromDistance([0, 0, 0], [1, 0, 0], NaN, 'm')).toThrow('above 0');
  });
});

describe('levelling and display', () => {
  it("turns the user's +Z into three.js +Y", () => {
    const level = new Quaternion(...levelQuaternion(Q));
    // The file direction of the user's Z axis must end up pointing up on screen.
    const userZInFile = new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...Q).invert());
    expectPoint(userZInFile.applyQuaternion(level).toArray(), [0, 1, 0], 12);
  });

  it('reports the rotation angle and axis', () => {
    const { degrees, axis } = rotationAngleAxis(Q);
    expect(degrees).toBeCloseTo(40, 10);
    expectPoint(axis, AXIS.toArray(), 10);
  });
});

describe('saved coordinate system (JSON)', () => {
  const input = {
    file: { name: 'nugatti.ply', numSplats: 154055 },
    method: 'coordinates',
    unit: 'cm',
    knownLength: null,
    points: [
      { file: [0.1, 0.2, 0.3], target: [0, 0, 0] },
      { file: null, target: [10, null, 0] },
    ],
  };

  it('round-trips', () => {
    expect(parseLocalFrame(serializeLocalFrame(input))).toEqual(input);
  });

  it('rejects other files with a reason', () => {
    expect(() => parseLocalFrame('not json')).toThrow('not JSON');
    expect(() => parseLocalFrame('{"a": 1}')).toThrow('not a saved coordinate system');
    const data = JSON.parse(serializeLocalFrame(input));
    expect(() => parseLocalFrame(JSON.stringify({ ...data, version: 99 }))).toThrow('version 99');
    expect(() => parseLocalFrame(JSON.stringify({ ...data, unit: 'ft' }))).toThrow('unit');
    expect(() => parseLocalFrame(JSON.stringify({ ...data, method: 'x' }))).toThrow('method');
  });
});
