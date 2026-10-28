const HALF = Math.SQRT1_2;

/**
 * Rotations that turn a file's up axis into the viewer's +y (three.js convention).
 * Quaternions [x, y, z, w]; all are rotations about the x axis.
 */
const ROTATIONS = {
  '+y': [0, 0, 0, 1], // as stored
  '-y': [1, 0, 0, 0], // 180°: 3DGS/COLMAP output (camera y points down)
  '+z': [-HALF, 0, 0, HALF], // −90°: most GIS and CAD data (z up)
  '-z': [HALF, 0, 0, HALF], // +90°
};

/**
 * Quaternion for the mesh, given which axis is up in the file.
 * @param {'+y' | '-y' | '+z' | '-z'} axis
 * @returns {number[]} [x, y, z, w]
 * @throws {Error} for an unknown axis.
 */
export function upAxisRotation(axis) {
  const rotation = ROTATIONS[axis];
  if (!rotation) throw new Error(`Unknown up axis: ${axis}`);
  return rotation;
}
