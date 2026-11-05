// three.js + Spark scene for one splat file. No React here: the hook in
// hooks/useSplatViewer.js creates it and calls its methods.
// Spark: https://sparkjs.dev/docs/  three.js: https://threejs.org/docs/
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh, dyno } from '@sparkjsdev/spark';
import {
  CAMERA,
  CORE_FRACTION,
  CORE_MAX_SAMPLES,
  DEFAULT_BACKGROUND,
  DEFAULT_UP_AXIS,
  GEOREF,
  MARKER,
  PHOTOS,
} from '../config.js';
import { createBackground } from './backgrounds.js';
import { createGeorefOverlay } from './georefOverlay.js';
import { createPhotoCameras } from './photoCameras.js';
import {
  boundsSize,
  cameraForBounds,
  collectCentres,
  coreBounds,
  fullBounds,
} from '../utils/bounds.js';
import { ellipsoidSettings } from '../utils/ellipsoidView.js';
import { upAxisRotation } from '../utils/orientation.js';
import { fitRect, photoProjection } from '../utils/photoCamera.js';
import { flipRows } from '../utils/metrics.js';

/**
 * @typedef {{numSplats: number, fullSize: number[], coreSize: number[]}} SplatStats
 *   Sizes are bounding-box extents of the splat centres in file units, along the
 *   file's own x, y, z axes. core = without floaters (see CORE_FRACTION).
 */

/**
 * @typedef {{position: number[], target: number[]}} CameraView
 *   Camera position and orbit target in the viewer frame (+y up, after the up-axis fix).
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
 * A Spark object modifier (a dyno graph, run on the GPU for every splat) that pulls each splat's
 * opacity towards 1 by `amount` (0..1). It never lowers an opacity. The stored splat data is not
 * changed, so the modifier can be undone at any time. Spark docs: https://sparkjs.dev/docs/
 * @param {ReturnType<typeof dyno.dynoFloat>} amount - uniform, 0 = unchanged, 1 = all opaque.
 */
function opacityModifier(amount) {
  return dyno.dynoBlock({ gsplat: dyno.Gsplat }, { gsplat: dyno.Gsplat }, ({ gsplat }) => {
    const { opacity } = dyno.splitGsplat(gsplat).outputs;
    const raised = dyno.mix(opacity, dyno.dynoConst('float', 1), amount);
    return { gsplat: dyno.combineGsplat({ gsplat, opacity: dyno.max(opacity, raised) }) };
  });
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
 *   getView: () => CameraView,
 *   setView: (view: CameraView) => void,
 *   onViewChange: (callback: () => void) => () => void,
 *   setBackground: (id: string) => void,
 *   setPhotos: (photos: import('./photoCameras.js').Photo[], selected: string | null) => void,
 *   setPhotosVisible: (visible: boolean) => void,
 *   viewPhoto: (photo: import('./photoCameras.js').Photo) => void,
 *   exitPhotoView: () => void,
 *   photoName: () => string | null,
 *   onPhotoView: (callback: (name: string | null) => void) => () => void,
 *   renderPhoto: (photo: import('./photoCameras.js').Photo) => Promise<Uint8Array>,
 *   setEllipsoidView: (amount: number) => void,
 *   setLevelRotation: (quaternion: number[] | null) => void,
 *   setControlPoints: (points: (number[] | null)[]) => void,
 *   setFrameAxes: (frame: {origin: number[], axes: number[][]} | null) => void,
 *   dispose: () => void,
 * }}
 */
export function createSplatViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  let background = null;
  let backgroundId = null;
  function setBackground(id) {
    if (id === backgroundId) return;
    const next = createBackground(renderer, id);
    background?.dispose();
    background = next;
    backgroundId = id;
    scene.background = next.value;
  }
  setBackground(DEFAULT_BACKGROUND);
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
  // Ellipsoid view: one modifier for every splat this viewer loads, driven by a uniform.
  const opacityMix = dyno.dynoFloat(0);
  const objectModifier = opacityModifier(opacityMix);
  let ellipsoidAmount = 0;
  const markers = new THREE.Group();
  model.add(markers);
  const georefOverlay = createGeorefOverlay(model);
  const photoCameras = createPhotoCameras(model);
  let photos = [];
  let selectedPhoto = null;
  // The photo whose camera the view uses now (photo view), or null.
  let photoInView = null;

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    if (photoInView) applyPhotoProjection();
    else camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  function frame() {
    // In photo view the camera keeps the photo's exact orientation (incl. roll), which
    // OrbitControls' lookAt would level out.
    if (!photoInView) controls.update();
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  function resetView() {
    if (!core) return;
    exitPhotoView();
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
    const next = new SplatMesh({ fileBytes: bytes, fileName, objectModifier });
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
    drawPhotos();
    resetView();
    return {
      numSplats: centres.length / 3,
      fullSize: boundsSize(full),
      coreSize: boundsSize(core),
    };
  }

  /**
   * Ellipsoid view, 0 (normal render) to 1 (opaque splats, flat fill cut at the 1σ ellipse).
   * falloff and maxStdDev belong to this pane's SparkRenderer; opacity to the splat's modifier.
   */
  function applyEllipsoidView(amount) {
    const settings = ellipsoidSettings(amount);
    opacityMix.value = settings.opacityMix;
    spark.falloff = settings.falloff;
    spark.maxStdDev = settings.maxStdDev;
    // A changed dyno uniform takes effect once Spark regenerates the splats.
    mesh?.updateVersion();
  }

  function setEllipsoidView(amount) {
    ellipsoidAmount = amount;
    applyEllipsoidView(amount);
  }

  // The model's rotation: the up-axis fix, or a georeference's levelling while one is applied.
  let upAxis = DEFAULT_UP_AXIS;
  let levelRotation = null;
  function applyRotation() {
    model.quaternion.fromArray(levelRotation ?? upAxisRotation(upAxis));
    resetView();
  }

  function setUpAxis(axis) {
    upAxis = axis;
    applyRotation();
  }

  /** Rotate the model so the user's frame is level (+Z up); null goes back to the up axis. */
  function setLevelRotation(quaternion) {
    levelRotation = quaternion;
    applyRotation();
  }

  /** The user's origin and axes (file coordinates), drawn at a size that fits the scene. */
  function setFrameAxes(frame) {
    georefOverlay.setFrame(frame, frame ? sceneSize() * GEOREF.axesFraction : 0);
  }

  // Linked cameras: another pane copies this camera's pose. OrbitControls fires 'change'
  // when the user moves the view, and when resetView or setView call controls.update().
  let applyingView = false;
  function getView() {
    return { position: camera.position.toArray(), target: controls.target.toArray() };
  }

  function setView({ position, target }) {
    exitPhotoView();
    // Not reported to onViewChange, so two linked panes do not echo each other.
    applyingView = true;
    camera.position.fromArray(position);
    controls.target.fromArray(target);
    controls.update();
    applyingView = false;
  }

  function onViewChange(callback) {
    const listener = () => {
      if (!applyingView) callback();
    };
    controls.addEventListener('change', listener);
    return () => controls.removeEventListener('change', listener);
  }

  // ---- COLMAP photos: frustums and photo view.
  function sceneSize() {
    if (core) return Math.hypot(...boundsSize(core));
    // No splat yet: the spread of the camera centres.
    const centre = [0, 1, 2].map((i) => photos.reduce((sum, p) => sum + p.position[i], 0));
    const mean = centre.map((value) => value / photos.length);
    return 2 * Math.max(...photos.map((p) => Math.hypot(...p.position.map((v, i) => v - mean[i]))));
  }

  function drawPhotos() {
    // Only around a splat: in an empty pane the camera sits inside the ring of frustums.
    const shown = core ? photos : [];
    photoCameras.set(shown, shown.length ? sceneSize() * PHOTOS.frustumFraction : 0, selectedPhoto);
  }

  function setPhotos(next, selected) {
    photos = next;
    selectedPhoto = selected;
    if (photoInView && !photos.some((photo) => photo.name === photoInView.name)) exitPhotoView();
    drawPhotos();
  }

  function applyPhotoProjection() {
    const { intrinsics } = photoInView;
    const rect = fitRect(
      intrinsics.width,
      intrinsics.height,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    camera.projectionMatrix.set(...photoProjection(intrinsics, camera.near, camera.far, rect));
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  const photoListeners = new Set();
  const emitPhoto = () => photoListeners.forEach((listener) => listener(photoInView?.name ?? null));

  /** Put a camera at a photo's pose, in the world frame (after the up-axis fix). */
  function placeAtPhoto(target, photo) {
    model.updateMatrixWorld();
    new THREE.Matrix4()
      .compose(
        new THREE.Vector3(...photo.position),
        new THREE.Quaternion(...photo.quaternion),
        new THREE.Vector3(1, 1, 1),
      )
      .premultiply(model.matrixWorld)
      .decompose(target.position, target.quaternion, new THREE.Vector3());
    target.updateMatrixWorld();
  }

  /** Use a photo's camera: its pose (after the up-axis fix) and its intrinsics. */
  function viewPhoto(photo) {
    placeAtPhoto(camera, photo);
    // Orbit target on the view axis at the scene's depth, so orbiting turns around the scene.
    const forward = camera.getWorldDirection(new THREE.Vector3());
    let depth = sceneSize() / 2;
    if (core) {
      const centre = new THREE.Vector3(...core.min)
        .add(new THREE.Vector3(...core.max))
        .multiplyScalar(0.5)
        .applyMatrix4(model.matrixWorld);
      depth = Math.max(centre.sub(camera.position).dot(forward), depth * 0.1);
    }
    controls.target.copy(camera.position).addScaledVector(forward, depth);
    photoInView = photo;
    // The frustums would frame the photo's own border; hidden while looking through one.
    photoCameras.setVisible(false);
    applyPhotoProjection();
    emitPhoto();
  }

  let photosVisible = true;
  function setPhotosVisible(visible) {
    photosVisible = visible;
    if (!photoInView) photoCameras.setVisible(visible);
  }

  function exitPhotoView() {
    if (!photoInView) return;
    photoInView = null;
    camera.updateProjectionMatrix();
    photoCameras.setVisible(photosVisible);
    emitPhoto();
  }

  // Any orbit, pan or zoom leaves the photo view: the view becomes a novel view.
  controls.addEventListener('start', exitPhotoView);
  controls.addEventListener('change', () => {
    if (!applyingView) exitPhotoView();
  });

  function onPhotoView(callback) {
    photoListeners.add(callback);
    return () => photoListeners.delete(callback);
  }

  // Offscreen renders at a photo's exact size, through a second SparkRenderer with a render
  // target (Spark's "additional viewpoints"). It sorts the splats for its own camera.
  let photoSpark = null;
  const photoCamera = new THREE.PerspectiveCamera();

  /**
   * Render the splat from a photo's camera at the photo's size, on transparent black (the
   * 3DGS default background; alpha = splat coverage). Rows top-down, like the photo.
   */
  async function renderPhotoNow(photo) {
    if (!mesh) throw new Error('Open a splat first.');
    const { width, height } = photo.intrinsics;
    if (photoSpark?.target.width !== width || photoSpark?.target.height !== height) {
      photoSpark?.dispose();
      photoSpark = new SparkRenderer({ renderer, target: { width, height } });
    }
    placeAtPhoto(photoCamera, photo);
    photoCamera.projectionMatrix.set(...photoProjection(photo.intrinsics, camera.near, camera.far));
    photoCamera.projectionMatrixInverse.copy(photoCamera.projectionMatrix).invert();
    // Pause the view while the scene is set up for the offscreen render.
    renderer.setAnimationLoop(null);
    const saved = {
      background: scene.background,
      clearColor: renderer.getClearColor(new THREE.Color()),
      clearAlpha: renderer.getClearAlpha(),
    };
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
    markers.visible = false;
    georefOverlay.setVisible(false);
    photoCameras.setVisible(false);
    // PSNR/SSIM always measure the real splat, not the ellipsoid view.
    applyEllipsoidView(0);
    try {
      // update() waits until the splats are sorted for this camera.
      await photoSpark.update({ scene, camera: photoCamera });
      const pixels = await photoSpark.renderReadTarget({ scene, camera: photoCamera });
      return flipRows(pixels, width, height);
    } finally {
      scene.background = saved.background;
      renderer.setClearColor(saved.clearColor, saved.clearAlpha);
      markers.visible = true;
      georefOverlay.setVisible(true);
      photoCameras.setVisible(photosVisible && !photoInView);
      applyEllipsoidView(ellipsoidAmount);
      if (!disposed) renderer.setAnimationLoop(frame);
    }
  }

  // One offscreen render at a time: they share the photo SparkRenderer and the scene state.
  let renderQueue = Promise.resolve();
  function renderPhoto(photo) {
    const job = renderQueue.then(() => renderPhotoNow(photo));
    renderQueue = job.catch(() => {});
    return job;
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

  let disposed = false;
  function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    controls.dispose();
    setMarkers([]);
    georefOverlay.dispose();
    photoCameras.dispose();
    markerMaterial.map.dispose();
    markerMaterial.dispose();
    lineMaterial.dispose();
    mesh?.dispose();
    photoSpark?.dispose();
    spark.dispose();
    background.dispose();
    renderer.dispose();
  }

  return {
    load,
    resetView,
    setUpAxis,
    pick,
    setMarkers,
    getView,
    setView,
    onViewChange,
    setBackground,
    setPhotos,
    setPhotosVisible,
    viewPhoto,
    exitPhotoView,
    photoName: () => photoInView?.name ?? null,
    onPhotoView,
    renderPhoto,
    setEllipsoidView,
    setLevelRotation,
    setControlPoints: georefOverlay.setControlPoints,
    setFrameAxes,
    dispose,
  };
}
