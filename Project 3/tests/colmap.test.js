import { describe, it, expect } from 'vitest';
import {
  findColmapFiles,
  parseCamerasBin,
  parseCamerasTxt,
  parseImagesBin,
  parseImagesTxt,
  pinholeIntrinsics,
} from '../src/utils/colmap.js';

/** Little-endian byte writer for synthetic COLMAP files. */
function writer() {
  const parts = [];
  const push = (size, write) => {
    const view = new DataView(new ArrayBuffer(size));
    write(view);
    parts.push(new Uint8Array(view.buffer));
  };
  return {
    int32: (v) => push(4, (view) => view.setInt32(0, v, true)),
    uint64: (v) => push(8, (view) => view.setBigUint64(0, BigInt(v), true)),
    int64: (v) => push(8, (view) => view.setBigInt64(0, BigInt(v), true)),
    float64: (v) => push(8, (view) => view.setFloat64(0, v, true)),
    text: (s) => parts.push(new TextEncoder().encode(`${s}\0`)),
    bytes() {
      const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
      let offset = 0;
      for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
      }
      return out;
    },
  };
}

function camerasBin() {
  const w = writer();
  w.uint64(2);
  w.int32(1);
  w.int32(1); // PINHOLE
  w.uint64(1539);
  w.uint64(2058);
  [1591.52, 1591.52, 769.5, 1029].forEach(w.float64);
  w.int32(2);
  w.int32(2); // SIMPLE_RADIAL
  w.uint64(640);
  w.uint64(480);
  [500, 320, 240, 0.01].forEach(w.float64);
  return w.bytes();
}

function imagesBin() {
  const w = writer();
  w.uint64(2);
  for (const [id, name, points] of [
    [40, 'IMG_6463.JPEG', 2],
    [7, 'sub/IMG_1.JPEG', 0],
  ]) {
    w.int32(id);
    [1, 0, 0, 0].forEach(w.float64);
    [0.1, -1.4, 2.9].forEach(w.float64);
    w.int32(1);
    w.text(name);
    w.uint64(points);
    for (let i = 0; i < points; i++) {
      w.float64(10.5);
      w.float64(20.5);
      w.int64(i === 0 ? -1 : 123);
    }
  }
  return w.bytes();
}

describe('COLMAP binary files', () => {
  it('reads cameras.bin, including distorted models', () => {
    const [pinhole, radial] = parseCamerasBin(camerasBin());
    expect(pinhole).toEqual({
      id: 1,
      model: 'PINHOLE',
      width: 1539,
      height: 2058,
      params: [1591.52, 1591.52, 769.5, 1029],
    });
    expect(radial.model).toBe('SIMPLE_RADIAL');
    expect(radial.params).toHaveLength(4);
  });

  it('reads images.bin and skips the 2D points', () => {
    const images = parseImagesBin(imagesBin());
    expect(images).toEqual([
      { id: 40, qvec: [1, 0, 0, 0], tvec: [0.1, -1.4, 2.9], cameraId: 1, name: 'IMG_6463.JPEG' },
      { id: 7, qvec: [1, 0, 0, 0], tvec: [0.1, -1.4, 2.9], cameraId: 1, name: 'sub/IMG_1.JPEG' },
    ]);
  });

  it('rejects truncated files', () => {
    expect(() => parseImagesBin(imagesBin().subarray(0, 100))).toThrow('ends too early');
  });
});

describe('COLMAP text files', () => {
  it('reads cameras.txt and images.txt, also with empty 2D point lines', () => {
    const cameras = parseCamerasTxt(
      '# Camera list\n# CAMERA_ID, MODEL, WIDTH, HEIGHT, PARAMS[]\n1 SIMPLE_PINHOLE 640 480 500 320 240\n',
    );
    expect(cameras).toEqual([
      { id: 1, model: 'SIMPLE_PINHOLE', width: 640, height: 480, params: [500, 320, 240] },
    ]);
    const images = parseImagesTxt(
      '# Image list\n1 0.9 0.1 0.2 0.3 1 2 3 1 a.jpg\n\n2 1 0 0 0 0 0 0 1 b.jpg\n10.5 20.5 -1\n',
    );
    expect(images.map((image) => image.name)).toEqual(['a.jpg', 'b.jpg']);
    expect(images[0].qvec).toEqual([0.9, 0.1, 0.2, 0.3]);
    expect(images[0].tvec).toEqual([1, 2, 3]);
  });
});

describe('pinholeIntrinsics', () => {
  it('accepts only pinhole models', () => {
    const [pinhole, radial] = parseCamerasBin(camerasBin());
    expect(pinholeIntrinsics(pinhole)).toEqual({
      fx: 1591.52,
      fy: 1591.52,
      cx: 769.5,
      cy: 1029,
      width: 1539,
      height: 2058,
    });
    expect(pinholeIntrinsics(radial)).toBeNull();
    expect(
      pinholeIntrinsics({ model: 'SIMPLE_PINHOLE', width: 4, height: 2, params: [3, 2, 1] }),
    ).toMatchObject({ fx: 3, fy: 3 });
  });
});

describe('findColmapFiles', () => {
  const entries = (paths) => paths.map((path) => ({ path }));

  it('finds an undistorted workspace (dense/sparse + dense/images)', () => {
    const found = findColmapFiles(
      entries([
        'dense/sparse/cameras.bin',
        'dense/sparse/images.bin',
        'dense/sparse/points3D.bin',
        'dense/images/IMG_1.JPEG',
        'dense/stereo/depth_maps/IMG_1.JPEG.geometric.bin',
      ]),
    );
    expect(found.format).toBe('bin');
    expect(found.cameras.path).toBe('dense/sparse/cameras.bin');
    expect(found.photoPath('IMG_1.JPEG')).toBe('dense/images/IMG_1.JPEG');
  });

  it('finds a project model (sparse/0) and prefers binary and the shallowest model', () => {
    const found = findColmapFiles(
      entries([
        'project/sparse/0/cameras.txt',
        'project/sparse/0/images.txt',
        'project/sparse/0/cameras.bin',
        'project/sparse/0/images.bin',
        'project/dense/sparse/0/deeper/cameras.bin',
        'project/dense/sparse/0/deeper/images.bin',
      ]),
    );
    expect(found.cameras.path).toBe('project/sparse/0/cameras.bin');
    expect(found.photoPath('a.jpg')).toBe('project/images/a.jpg');
  });

  it('explains what is missing', () => {
    expect(() => findColmapFiles(entries(['dense/sparse/cameras.bin']))).toThrow('images.bin');
  });
});
