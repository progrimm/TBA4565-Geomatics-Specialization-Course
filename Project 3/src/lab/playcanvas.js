// PlayCanvas engine, gsplat component: https://developer.playcanvas.com/user-manual/gaussian-splatting/
import {
  AppBase,
  AppOptions,
  Asset,
  CameraComponentSystem,
  Color,
  Entity,
  FILLMODE_NONE,
  GSplatComponentSystem,
  GSplatHandler,
  Mouse,
  RESOLUTION_FIXED,
  ScriptComponentSystem,
  ScriptHandler,
  TouchDevice,
  Vec3,
  createGraphicsDevice,
} from 'playcanvas';
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';
import { CAMERA, CANVAS, SPLAT_URL } from './config.js';
import { createLabPage, START_POSE } from './harness.js';

const page = createLabPage({
  title: 'PlayCanvas',
  engine: 'PlayCanvas engine 2.23.3, gsplat component (WebGL2)',
  controls:
    'Drag to orbit, scroll to zoom. Arrow keys or WASD fly the camera; drag to orbit again.',
  credit: 'PlayCanvas: MIT',
});

// CameraControls assume +y up, so the splat entity is turned 180° about z, as in
// PlayCanvas's own examples. Shared poses (PLY coordinates, -y up) get the same turn.
const turn = ([x, y, z]) => new Vec3(-x, -y, z);

try {
  const device = await createGraphicsDevice(page.canvas, {
    deviceTypes: ['webgl2'],
    antialias: false,
  });
  device.maxPixelRatio = CANVAS.pixelRatio;

  const options = new AppOptions();
  options.graphicsDevice = device;
  options.mouse = new Mouse(page.canvas);
  options.touch = new TouchDevice(page.canvas);
  options.componentSystems = [CameraComponentSystem, GSplatComponentSystem, ScriptComponentSystem];
  options.resourceHandlers = [GSplatHandler, ScriptHandler];

  const app = new AppBase(page.canvas);
  app.init(options);
  app.setCanvasFillMode(FILLMODE_NONE, CANVAS.width, CANVAS.height);
  app.setCanvasResolution(RESOLUTION_FIXED, CANVAS.width, CANVAS.height);
  // setCanvasFillMode writes an inline 1280 × 720 px CSS size, which overrides the lab
  // stylesheet and clipped the view on narrow screens. Let the stylesheet size the
  // canvas; the drawing buffer stays fixed (RESOLUTION_FIXED).
  page.canvas.style.removeProperty('width');
  page.canvas.style.removeProperty('height');

  const camera = new Entity('camera');
  camera.addComponent('camera', {
    clearColor: new Color(0, 0, 0),
    fov: CAMERA.verticalFovDeg,
    nearClip: CAMERA.near,
    farClip: CAMERA.far,
  });
  app.root.addChild(camera);
  const applyPose = ({ position, target }) => {
    camera.setPosition(turn(position));
    camera.lookAt(turn(target), Vec3.UP);
  };
  applyPose(START_POSE);

  if (!page.bench) {
    camera.addComponent('script');
    camera.script.create(CameraControls, {
      // Fly mode is what gives CameraControls keyboard input (arrows/WASD move the
      // camera); a mouse drag switches back to orbiting.
      properties: { enableFly: true, focusPoint: turn(CAMERA.target) },
    });
  }

  page.status('Loading the splat…');
  const asset = new Asset('soar', 'gsplat', { url: SPLAT_URL });
  app.assets.add(asset);
  await new Promise((resolve, reject) => {
    asset.once('load', resolve);
    asset.once('error', (message) => reject(new Error(message)));
    app.assets.load(asset);
  });

  const splat = new Entity('splat');
  splat.addComponent('gsplat', { asset });
  splat.setLocalEulerAngles(0, 0, 180);
  app.root.addChild(splat);
  app.start();
  await page.splatShown(applyPose);
} catch (error) {
  page.fail(error);
}
