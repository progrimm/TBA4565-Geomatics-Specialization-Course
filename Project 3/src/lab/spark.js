// Spark (World Labs) on Three.js: https://sparkjs.dev/docs/
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { CAMERA, CANVAS, SPLAT_URL } from './config.js';
import { createLabPage, START_POSE } from './harness.js';

const page = createLabPage({
  title: 'Spark',
  engine: 'Spark 2.4.0 on Three.js 0.186.1 (WebGL2)',
  credit: 'Spark: MIT, World Labs',
});

try {
  const renderer = new THREE.WebGLRenderer({ canvas: page.canvas, antialias: false });
  renderer.setPixelRatio(CANVAS.pixelRatio);
  // updateStyle = false: keep the CSS size, fix the drawing buffer.
  renderer.setSize(CANVAS.width, CANVAS.height, false);

  const scene = new THREE.Scene();
  scene.add(new SparkRenderer({ renderer }));

  const camera = new THREE.PerspectiveCamera(
    CAMERA.verticalFovDeg,
    CANVAS.width / CANVAS.height,
    CAMERA.near,
    CAMERA.far,
  );
  const applyPose = ({ position, target, up }) => {
    camera.up.set(...up);
    camera.position.set(...position);
    camera.lookAt(...target);
  };
  applyPose(START_POSE);

  // OrbitControls read camera.up when created, so they orbit around -y here.
  const controls = page.bench ? null : new OrbitControls(camera, page.canvas);
  controls?.target.set(...CAMERA.target);
  controls?.update();

  page.status('Loading the splat…');
  // The splat keeps its PLY coordinates; the camera's up vector handles y-down.
  const splat = new SplatMesh({ url: SPLAT_URL });
  scene.add(splat);
  renderer.setAnimationLoop(() => {
    controls?.update();
    renderer.render(scene, camera);
  });
  await splat.initialized;
  await page.splatShown(applyPose);
} catch (error) {
  page.fail(error);
}
