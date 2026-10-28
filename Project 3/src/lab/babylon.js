// Babylon.js, GaussianSplattingMesh through the SPLAT loader:
// https://doc.babylonjs.com/features/featuresDeepDive/mesh/gaussianSplatting
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Scene } from '@babylonjs/core/scene.js';
// Side effect: registers the loader for .ply/.splat/.spz/.sog.
import '@babylonjs/loaders/SPLAT/splatFileLoader.js';
import { CAMERA, CANVAS, SPLAT_URL } from './config.js';
import { createLabPage, START_POSE } from './harness.js';

const page = createLabPage({
  title: 'Babylon.js',
  engine: 'Babylon.js 9.32.1, GaussianSplattingMesh (WebGL2)',
  controls: 'Drag to orbit, scroll to zoom. With the view focused: arrow keys orbit.',
  credit: 'Babylon.js: Apache 2.0',
});

// Babylon keeps its default left-handed, +y-up scene. Found by comparing screenshots
// with the other viewers: the image matches them when the shared poses (PLY
// coordinates, -y up) have y negated, i.e. the splat ends up upright in Babylon's
// frame with y -> -y. A right-handed scene (useRightHandedSystem) showed it mirrored.
const toBabylon = ([x, y, z]) => new Vector3(x, -y, z);

try {
  // adaptToDeviceRatio = false and a fixed size keep the drawing buffer at 1280 × 720.
  const engine = new Engine(page.canvas, false, {}, false);
  engine.setSize(CANVAS.width, CANVAS.height);

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 1);

  const camera = new ArcRotateCamera('camera', 0, 0, CAMERA.radius, Vector3.Zero(), scene);
  camera.fov = (CAMERA.verticalFovDeg * Math.PI) / 180;
  camera.minZ = CAMERA.near;
  camera.maxZ = CAMERA.far;
  const applyPose = ({ position, target }) => {
    camera.setTarget(toBabylon(target));
    camera.setPosition(toBabylon(position));
  };
  applyPose(START_POSE);
  if (!page.bench) camera.attachControl(true);

  page.status('Loading the splat…');
  engine.runRenderLoop(() => scene.render());
  await ImportMeshAsync(SPLAT_URL, scene);
  await page.splatShown(applyPose);
} catch (error) {
  page.fail(error);
}
