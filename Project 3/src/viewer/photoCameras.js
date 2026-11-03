// Camera frustums of the COLMAP photos: a small pyramid from each camera centre to its image
// plane. They live in the model group, so the up-axis fix turns them with the splat.
import * as THREE from 'three';
import { PHOTOS } from '../config.js';
import { frustumCorners } from '../utils/photoCamera.js';

/**
 * @typedef {{name: string, position: number[], quaternion: number[],
 *   intrinsics: import('../utils/colmap.js').Intrinsics, role: 'train' | 'test'}} Photo
 *   position and quaternion: the photo's three.js camera pose in the file (COLMAP) frame.
 */

/** The eight line segments of one frustum: apex to each corner, and the image rectangle. */
const EDGES = [
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
];

/**
 * Frustums for a list of photos, added to `parent`.
 * @param {THREE.Object3D} parent - the model group.
 * @returns {{set: (photos: Photo[], depth: number, selected: string | null) => void,
 *   setVisible: (visible: boolean) => void, dispose: () => void}}
 */
export function createPhotoCameras(parent) {
  // Drawn after the splats without a depth test, like the measurement markers.
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    depthTest: false,
    transparent: true,
  });
  let lines = null;
  let visible = true;
  const colours = {
    train: new THREE.Color(PHOTOS.trainColor),
    test: new THREE.Color(PHOTOS.testColor),
    selected: new THREE.Color(PHOTOS.selectedColor),
  };

  function clear() {
    if (!lines) return;
    parent.remove(lines);
    lines.geometry.dispose();
    lines = null;
  }

  function set(photos, depth, selected) {
    clear();
    if (photos.length === 0) return;
    const positions = [];
    const vertexColours = [];
    const matrix = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);
    for (const photo of photos) {
      matrix.compose(
        new THREE.Vector3(...photo.position),
        new THREE.Quaternion(...photo.quaternion),
        one,
      );
      const points = [...frustumCorners(photo.intrinsics, depth), [0, 0, 0]].map((point) =>
        new THREE.Vector3(...point).applyMatrix4(matrix),
      );
      const colour = photo.name === selected ? colours.selected : colours[photo.role];
      for (const [from, to] of EDGES) {
        positions.push(...points[from].toArray(), ...points[to].toArray());
        vertexColours.push(...colour.toArray(), ...colour.toArray());
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColours, 3));
    lines = new THREE.LineSegments(geometry, material);
    lines.renderOrder = 1;
    lines.visible = visible;
    parent.add(lines);
  }

  function setVisible(value) {
    visible = value;
    if (lines) lines.visible = value;
  }

  function dispose() {
    clear();
    material.dispose();
  }

  return { set, setVisible, dispose };
}
