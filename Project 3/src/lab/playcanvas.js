// PlayCanvas engine, gsplat component: https://developer.playcanvas.com/user-manual/gaussian-splatting/
import {
  AppBase,
  AppOptions,
  Asset,
  CameraComponentSystem,
  Color,
  Entity,
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

/**
 * CameraControls only reads the keyboard in fly mode (arrows/WASD move the camera),
 * and it listens on `window`, so it would also react while the user tabs through the
 * page. Fly mode is therefore on only while the canvas has focus. On blur, keys still
 * held are released, because CameraControls never sees their keyup.
 * @param {HTMLCanvasElement} canvas
 * @param {{enableFly: boolean}} controls - the CameraControls script instance.
 */
function enableKeyboardWhileFocused(canvas, controls) {
  const held = new Set();
  canvas.addEventListener('focus', () => {
    controls.enableFly = true;
  });
  canvas.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  });
  canvas.addEventListener('keyup', (event) => held.delete(event.code));
  canvas.addEventListener('blur', () => {
    for (const code of held) window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    held.clear();
    controls.enableFly = false;
  });
}

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
  // Fixed drawing buffer; the lab stylesheet sizes the canvas. No setCanvasFillMode:
  // it writes an inline 1280 × 720 px CSS size, which clipped the view on narrow screens.
  app.setCanvasResolution(RESOLUTION_FIXED, CANVAS.width, CANVAS.height);

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
    const controls = camera.script.create(CameraControls, {
      properties: { enableFly: false, focusPoint: turn(CAMERA.target) },
    });
    enableKeyboardWhileFocused(page.canvas, controls);
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
