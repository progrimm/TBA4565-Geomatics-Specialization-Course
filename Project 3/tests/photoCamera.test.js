import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  cameraPose,
  fitRect,
  frustumCorners,
  photoProjection,
  photoRoles,
} from '../src/utils/photoCamera.js';

const INTRINSICS = { fx: 1591.52, fy: 1500, cx: 700.25, cy: 1100.5, width: 1539, height: 2058 };

/** Pixel of a world point in the photo, the COLMAP way: x_cam = R X + t, then the pinhole. */
function colmapPixel({ qvec, tvec }, point, { fx, fy, cx, cy }) {
  const [w, x, y, z] = qvec.map((value) => value / Math.hypot(...qvec));
  const r = [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
  const cam = r.map(
    (row, i) => row[0] * point[0] + row[1] * point[1] + row[2] * point[2] + tvec[i],
  );
  return { u: (fx * cam[0]) / cam[2] + cx, v: (fy * cam[1]) / cam[2] + cy, depth: cam[2] };
}

/** A three.js camera set up from a photo, as the viewer does. */
function threeCamera(image, rect) {
  const camera = new PerspectiveCamera();
  const { position, quaternion } = cameraPose(image);
  camera.position.fromArray(position);
  camera.quaternion.fromArray(quaternion);
  camera.updateMatrixWorld();
  camera.projectionMatrix.set(...photoProjection(INTRINSICS, 0.01, 100, rect));
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return camera;
}

// A real nugatti pose (IMG_6461) and a point in front of it.
const IMAGE = { qvec: [0.98, 0.017, -0.179, -0.085], tvec: [-0.168, -1.512, 2.922] };
const POINT = [0.3, 2.1, 0.7];

describe('cameraPose + photoProjection', () => {
  it('puts a world point on the same pixel as COLMAP', () => {
    const { u, v, depth } = colmapPixel(IMAGE, POINT, INTRINSICS);
    expect(depth).toBeGreaterThan(0);
    const ndc = new Vector3(...POINT).project(threeCamera(IMAGE));
    expect(((ndc.x + 1) / 2) * INTRINSICS.width).toBeCloseTo(u, 6);
    expect(((1 - ndc.y) / 2) * INTRINSICS.height).toBeCloseTo(v, 6);
    expect(Math.abs(ndc.z)).toBeLessThan(1);
  });

  it('places the camera at C = −Rᵀt', () => {
    // Identity rotation: the centre is −t, and the camera looks along COLMAP's +z.
    const { position } = cameraPose({ qvec: [1, 0, 0, 0], tvec: [1, 2, 3] });
    expect(position).toEqual([-1, -2, -3]);
    const camera = threeCamera({ qvec: [1, 0, 0, 0], tvec: [0, 0, 0] });
    const direction = camera.getWorldDirection(new Vector3());
    expect(direction.distanceTo(new Vector3(0, 0, 1))).toBeCloseTo(0, 10);
    // COLMAP's y points down, so the three.js camera's up is −y.
    expect(new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).y).toBeCloseTo(-1);
  });

  it('keeps the pixel inside a letterboxed rectangle', () => {
    const rect = fitRect(INTRINSICS.width, INTRINSICS.height, 1200, 800);
    const { u, v } = colmapPixel(IMAGE, POINT, INTRINSICS);
    const ndc = new Vector3(...POINT).project(threeCamera(IMAGE, rect));
    // View fraction of the pixel = rectangle origin + pixel fraction × rectangle size.
    expect((ndc.x + 1) / 2).toBeCloseTo(rect.x + (u / INTRINSICS.width) * rect.w, 6);
    expect((1 - ndc.y) / 2).toBeCloseTo(rect.y + (v / INTRINSICS.height) * rect.h, 6);
  });
});

describe('fitRect', () => {
  it('fits a portrait photo into a landscape view, centred', () => {
    const rect = fitRect(1000, 2000, 1600, 800);
    expect(rect).toEqual({ x: 0.375, y: 0, w: 0.25, h: 1 });
  });
});

describe('photoRoles', () => {
  const names = Array.from({ length: 44 }, (_, i) => `IMG_${6424 + i}.JPEG`).reverse();

  it('holds out every Nth photo by sorted name', () => {
    const roles = photoRoles(names, 8);
    const test = [...roles].filter(([, role]) => role === 'test').map(([name]) => name);
    expect(test).toEqual([0, 8, 16, 24, 32, 40].map((i) => `IMG_${6424 + i}.JPEG`));
  });

  it('makes every photo a training photo without hold-out', () => {
    expect([...photoRoles(names, 0).values()].every((role) => role === 'train')).toBe(true);
  });

  it('sorts by code point like Python', () => {
    const roles = photoRoles(['b.jpg', 'B.jpg', 'a.jpg'], 2);
    expect([...roles.keys()]).toEqual(['B.jpg', 'a.jpg', 'b.jpg']);
  });
});

describe('frustumCorners', () => {
  it('puts the image corners on the photo frustum at the given depth', () => {
    const camera = threeCamera({ qvec: [1, 0, 0, 0], tvec: [0, 0, 0] });
    const [topLeft, , bottomRight] = frustumCorners(INTRINSICS, 2);
    // In camera coordinates; the camera above sits at the origin with this orientation.
    const toWorld = (p) => new Vector3(...p).applyQuaternion(camera.quaternion);
    const a = toWorld(topLeft).project(camera);
    const b = toWorld(bottomRight).project(camera);
    expect([a.x, a.y]).toEqual([expect.closeTo(-1, 6), expect.closeTo(1, 6)]);
    expect([b.x, b.y]).toEqual([expect.closeTo(1, 6), expect.closeTo(-1, 6)]);
  });
});
