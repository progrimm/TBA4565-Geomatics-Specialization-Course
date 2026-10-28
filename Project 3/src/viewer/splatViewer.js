// three.js + Spark scene for one splat file. No React here: the hook in
// hooks/useSplatViewer.js creates it and calls its methods.
// Spark: https://sparkjs.dev/docs/  three.js: https://threejs.org/docs/
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { CAMERA, CORE_FRACTION, CORE_MAX_SAMPLES, DEFAULT_UP_AXIS, MARKER } from '../config.js';
import {
  boundsSize,
  cameraForBounds,
  collectCentres,
  coreBounds,
  fullBounds,
} from '../utils/bounds.js';
import { upAxisRotation } from '../utils/orientation.js';

/**
 * @typedef {{numSplats: number, fullSize: number[], coreSize: number[]}} SplatStats
 *   Sizes are bounding-box extents of the splat centres in file units, along the
 *   file's own x, y, z axes. core = without floaters (see CORE_FRACTION).
 */

/** A white disc on a transparent background, tinted by the sprite colour. */
function circleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.strokeStyle = '#000';
  context.lineWidth = size / 10;
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - context.lineWidth, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  return new THREE.CanvasTexture(canvas);
}

/**
 * Create the viewer on a canvas that fills its parent.
 * @param {HTMLCanvasElement} canvas
 * @returns {{
 *   load: (bytes: Uint8Array, fileName: string) => Promise<SplatStats>,
 *   resetView: () => void,
 *   setUpAxis: (axis: string) => void,
 *   pick: (clientX: number, clientY: number) => number[] | null,
 *   setMarkers: (points: number[][]) => void,
 *   dispose: () => void,
 * }}
 */
export function createSplatViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  const camera = new THREE.PerspectiveCamera(CAMERA.verticalFovDeg, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, canvas);
  // Arrow keys pan (Shift + arrows orbit) while the canvas has focus.
  controls.listenToKeyEvents(canvas);

  // Holds the splat and the markers, so one rotation (the up-axis fix) applies to both
  // and picked points stay in file coordinates.
  const model = new THREE.Group();
  model.quaternion.fromArray(upAxisRotation(DEFAULT_UP_AXIS));
  scene.add(model);

  let mesh = null;
  let core = null;
  const markers = new THREE.Group();
  model.add(markers);

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  function resetView() {
    if (!core) return;
    model.updateMatrixWorld();
    // Frame the core bounds as they are oriented now (after the up-axis rotation).
    const box = new THREE.Box3(
      new THREE.Vector3(...core.min),
      new THREE.Vector3(...core.max),
    ).applyMatrix4(model.matrixWorld);
    const view = cameraForBounds(
      { min: box.min.toArray(), max: box.max.toArray() },
      CAMERA.verticalFovDeg,
      CAMERA.viewDirection,
    );
    camera.near = view.distance * CAMERA.nearFactor;
    camera.far = view.distance * CAMERA.farFactor;
    camera.updateProjectionMatrix();
    camera.position.fromArray(view.position);
    controls.target.fromArray(view.target);
    controls.update();
  }

  async function load(bytes, fileName) {
    const next = new SplatMesh({ fileBytes: bytes, fileName });
    try {
      await next.initialized;
    } catch (error) {
      next.dispose();
      throw error;
    }
    // Centres in file coordinates; non-finite (NaN) splats are skipped.
    const centres = collectCentres((callback) => next.forEachSplat(callback));
    if (centres.length === 0) {
      next.dispose();
      throw new Error('The file contains no splats.');
    }
    // Only replace the current splat once the new one has loaded.
    if (mesh) {
      model.remove(mesh);
      mesh.dispose();
    }
    mesh = next;
    model.add(mesh);
    const full = fullBounds(centres);
    core = coreBounds(centres, CORE_FRACTION, CORE_MAX_SAMPLES);
    setMarkers([]);
    resetView();
    return {
      numSplats: centres.length / 3,
      fullSize: boundsSize(full),
      coreSize: boundsSize(core),
    };
  }

  function setUpAxis(axis) {
    model.quaternion.fromArray(upAxisRotation(axis));
    resetView();
  }

  const raycaster = new THREE.Raycaster();
  function pick(clientX, clientY) {
    if (!mesh) return null;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    // Spark's SplatMesh.raycast hits the splat ellipsoids, nearest first.
    const [hit] = raycaster.intersectObject(mesh, false);
    return hit ? model.worldToLocal(hit.point.clone()).toArray() : null;
  }

  // Markers: round sprites of a fixed screen size, and a line between them. Spark
  // draws the splats in the transparent pass, so the markers are transparent too
  // and come after it (renderOrder 1); without depth test they stay visible even
  // where the picked point is inside the splat.
  const markerMaterial = new THREE.SpriteMaterial({
    map: circleTexture(),
    color: MARKER.color,
    sizeAttenuation: false,
    depthTest: false,
    transparent: true,
  });
  const lineMaterial = new THREE.LineBasicMaterial({
    color: MARKER.color,
    depthTest: false,
    transparent: true,
  });
  function setMarkers(points) {
    for (const child of [...markers.children]) {
      if (child.isLine) child.geometry.dispose();
      markers.remove(child);
    }
    for (const point of points) {
      const sprite = new THREE.Sprite(markerMaterial);
      sprite.position.fromArray(point);
      sprite.scale.setScalar(MARKER.screenSize);
      sprite.renderOrder = 1;
      markers.add(sprite);
    }
    if (points.length === 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map((point) => new THREE.Vector3(...point)),
      );
      const line = new THREE.Line(geometry, lineMaterial);
      line.renderOrder = 1;
      markers.add(line);
    }
  }

  function dispose() {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    controls.dispose();
    setMarkers([]);
    markerMaterial.map.dispose();
    markerMaterial.dispose();
    lineMaterial.dispose();
    mesh?.dispose();
    spark.dispose();
    renderer.dispose();
  }

  return { load, resetView, setUpAxis, pick, setMarkers, dispose };
}
