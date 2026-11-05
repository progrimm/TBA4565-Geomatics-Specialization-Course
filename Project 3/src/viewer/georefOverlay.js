// Georeference overlay: numbered control-point markers and the user's frame (origin and
// X/Y/Z axes), drawn in the model group so they share its rotation. No React here.
import * as THREE from 'three';
import { GEOREF, MARKER } from '../config.js';

/** A disc with a number, tinted by the sprite colour (white disc, black outline and digits). */
function numberTexture(label) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.strokeStyle = '#000';
  context.lineWidth = size / 16;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - context.lineWidth, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  context.fillStyle = '#000';
  context.font = `bold ${size * 0.5}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, size / 2, size / 2 + size * 0.03);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Create the overlay inside a parent group (the model, in file coordinates).
 * @param {THREE.Group} parent
 * @returns {{
 *   setControlPoints: (points: (number[] | null)[]) => void,
 *   setFrame: (frame: {origin: number[], axes: number[][]} | null, length: number) => void,
 *   setVisible: (visible: boolean) => void,
 *   dispose: () => void,
 * }}
 */
export function createGeorefOverlay(parent) {
  const group = new THREE.Group();
  parent.add(group);
  const points = new THREE.Group();
  const frame = new THREE.Group();
  group.add(points, frame);

  // One material per number, made when first needed.
  const materials = new Map();
  const materialFor = (label) => {
    if (!materials.has(label)) {
      materials.set(
        label,
        new THREE.SpriteMaterial({
          map: numberTexture(label),
          color: GEOREF.markerColor,
          sizeAttenuation: false,
          depthTest: false,
          transparent: true,
        }),
      );
    }
    return materials.get(label);
  };
  const axisMaterials = GEOREF.axesColors.map(
    (color) => new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true }),
  );

  // Drawn after the splats and without depth test, like the measurement markers.
  function setControlPoints(list) {
    points.clear();
    list.forEach((point, index) => {
      if (!point) return;
      const sprite = new THREE.Sprite(materialFor(String(index + 1)));
      sprite.position.fromArray(point);
      sprite.scale.setScalar(MARKER.screenSize * 1.2);
      sprite.renderOrder = 2;
      points.add(sprite);
    });
  }

  function clearFrame() {
    for (const child of frame.children) if (child.isLine) child.geometry.dispose();
    frame.clear();
  }

  function setFrame(next, length) {
    clearFrame();
    if (!next || !(length > 0)) return;
    const origin = new THREE.Vector3(...next.origin);
    next.axes.forEach((axis, i) => {
      const end = new THREE.Vector3(...axis).multiplyScalar(length).add(origin);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([origin, end]),
        axisMaterials[i],
      );
      line.renderOrder = 2;
      frame.add(line);
    });
    // The origin as a marker labelled O.
    const sprite = new THREE.Sprite(materialFor('O'));
    sprite.position.copy(origin);
    sprite.scale.setScalar(MARKER.screenSize * 1.2);
    sprite.renderOrder = 3;
    frame.add(sprite);
  }

  return {
    setControlPoints,
    setFrame,
    setVisible: (visible) => {
      group.visible = visible;
    },
    dispose() {
      clearFrame();
      points.clear();
      for (const material of materials.values()) {
        material.map.dispose();
        material.dispose();
      }
      axisMaterials.forEach((material) => material.dispose());
      parent.remove(group);
    },
  };
}
