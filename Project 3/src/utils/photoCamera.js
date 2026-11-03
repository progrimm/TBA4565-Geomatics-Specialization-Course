// From a COLMAP photo to a three.js camera: pose, projection and train/test role. Pure maths.
//
// COLMAP stores the world-to-camera rotation R (quaternion w, x, y, z) and translation t, and
// its camera looks along +z with x right and y down. A three.js camera looks along −z with y
// up, so its axes are COLMAP's turned 180° about x: diag(1, −1, −1).

/**
 * Rotation matrix (rows) of a unit quaternion [w, x, y, z].
 * @param {number[]} q
 * @returns {number[][]}
 */
function rotationMatrix([w, x, y, z]) {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}

/**
 * Where a photo was taken, as a three.js camera pose in the COLMAP world frame.
 * @param {{qvec: number[], tvec: number[]}} image - world-to-camera rotation [w, x, y, z]
 *   and translation.
 * @returns {{position: number[], quaternion: number[]}} quaternion in three.js order
 *   [x, y, z, w].
 */
export function cameraPose({ qvec, tvec }) {
  const norm = Math.hypot(...qvec);
  const [w, x, y, z] = qvec.map((value) => value / norm);
  const r = rotationMatrix([w, x, y, z]);
  // Camera centre C = −Rᵀt.
  const position = [0, 1, 2].map(
    (i) => -(r[0][i] * tvec[0] + r[1][i] * tvec[1] + r[2][i] * tvec[2]),
  );
  // Camera-to-world rotation Rᵀ · diag(1, −1, −1) = conj(q) ⊗ (180° about x), worked out.
  return { position, quaternion: [w, -z, y, x] };
}

/**
 * Where a photo fits inside a view of another shape (letterboxed, like CSS object-fit: contain).
 * @param {number} photoWidth
 * @param {number} photoHeight
 * @param {number} viewWidth
 * @param {number} viewHeight
 * @returns {{x: number, y: number, w: number, h: number}} fractions of the view; y from the top.
 */
export function fitRect(photoWidth, photoHeight, viewWidth, viewHeight) {
  const scale = Math.min(viewWidth / photoWidth, viewHeight / photoHeight);
  const w = (photoWidth * scale) / viewWidth;
  const h = (photoHeight * scale) / viewHeight;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/**
 * Projection matrix of a pinhole photo camera, for a view in which the photo fills `rect`.
 * Pixel (u, v) of the photo, v down, lands at the same place in the view as in the photo; an
 * off-centre principal point is kept.
 * @param {import('./colmap.js').Intrinsics} intrinsics
 * @param {number} near
 * @param {number} far
 * @param {{x: number, y: number, w: number, h: number}} [rect] - default: the whole view.
 * @returns {number[]} 16 numbers, row-major (for three.js Matrix4.set).
 */
export function photoProjection({ fx, fy, cx, cy, width, height }, near, far, rect) {
  const { x, y, w, h } = rect ?? { x: 0, y: 0, w: 1, h: 1 };
  // Photo NDC → view NDC: scale to the rectangle and move to its centre.
  const sx = w;
  const sy = h;
  const ox = 2 * (x + w / 2) - 1;
  const oy = 1 - 2 * (y + h / 2);
  // A point (x, y, z) in front of the camera has depth d = −z and lands on pixel
  // u = fx x / d + cx, v = −fy y / d + cy (rows run down). In NDC, x = 2u / W − 1 and
  // y = 1 − 2v / H, so x_ndc = a x / d + b and y_ndc = c y / d + e with:
  const a = (2 * fx) / width;
  const b = (2 * cx) / width - 1;
  const c = (2 * fy) / height;
  const e = 1 - (2 * cy) / height;
  const depthA = -(far + near) / (far - near);
  const depthB = (-2 * far * near) / (far - near);
  // Row 0 and 1 are scaled by the rectangle, and the offset is added via w_clip = −z (row 3).
  return [
    sx * a, 0, sx * -b - ox, 0,
    0, sy * c, sy * -e - oy, 0,
    0, 0, depthA, depthB,
    0, 0, -1, 0,
  ]; // prettier-ignore
}

/**
 * Train or test role of each photo: with hold-out N, every Nth photo by sorted name (index 0,
 * N, 2N, …) is a test photo, as in the reference 3DGS code (llffhold = 8) and gsplat
 * (test_every = 8). N = 0: all photos are training photos.
 * @param {string[]} names
 * @param {number} holdOut
 * @returns {Map<string, 'train' | 'test'>}
 */
export function photoRoles(names, holdOut) {
  // Python's sorted(): by code point, not by locale.
  const sorted = [...names].sort((p, q) => (p < q ? -1 : p > q ? 1 : 0));
  return new Map(
    sorted.map((name, index) => [name, holdOut > 0 && index % holdOut === 0 ? 'test' : 'train']),
  );
}

/**
 * The corners of a photo's image plane at a given depth, in three.js camera coordinates
 * (looking along −z, y up): for drawing camera frustums.
 * @param {import('./colmap.js').Intrinsics} intrinsics
 * @param {number} depth - distance in front of the camera.
 * @returns {number[][]} top-left, top-right, bottom-right, bottom-left.
 */
export function frustumCorners({ fx, fy, cx, cy, width, height }, depth) {
  return [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ].map(([u, v]) => [((u - cx) / fx) * depth, (-(v - cy) / fy) * depth, -depth]);
}
