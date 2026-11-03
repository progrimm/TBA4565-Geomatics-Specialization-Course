// Backgrounds behind the splat: a colour, a sky cube map or a starfield. No React here.
// They are set as scene.background, which three.js draws at infinity in the world frame
// (+y up), so they turn with the camera but not with the up-axis fix of the model.
// three.js: https://threejs.org/docs/#api/en/scenes/Scene.background
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { BACKGROUNDS, SKY, STARS } from '../config.js';
import { bandPoint, seededRandom, toEquirect, uniformSpherePoint } from '../utils/stars.js';

/** Ground colour below the horizon, in the renderer's linear working space. */
const GROUND = new THREE.Color(SKY.groundColor);

/**
 * The Sky shader gives high-dynamic-range light and expects the renderer to tone-map it. A
 * render target gets no renderer tone mapping, and the splats must keep their own colours,
 * so a filmic curve (Narkowicz's ACES fit) is baked into the sky shader instead. Below the
 * horizon the sky fades into a plain ground, so a view from above does not look into haze.
 */
const SKY_TONE_MAPPING = `
  vec3 exposed = gl_FragColor.rgb * ${SKY.exposure.toFixed(3)};
  gl_FragColor.rgb = clamp(
    (exposed * (2.51 * exposed + 0.03)) / (exposed * (2.43 * exposed + 0.59) + 0.14),
    0.0, 1.0);
  float ground = smoothstep(0.0, -${SKY.groundFade.toFixed(3)}, direction.y);
  gl_FragColor.rgb = mix(gl_FragColor.rgb,
    vec3(${GROUND.r.toFixed(4)}, ${GROUND.g.toFixed(4)}, ${GROUND.b.toFixed(4)}), ground);
`;

/** Star colours from hot (blue-white) to cool (orange), as CSS rgb triples. */
const STAR_COLOURS = ['200 215 255', '235 240 255', '255 250 240', '255 230 200', '255 205 160'];

/**
 * Sky: render three.js's Sky shader once into a cube map with a CubeCamera
 * (https://threejs.org/docs/#api/en/cameras/CubeCamera). Unlike a Sky mesh in the scene, the
 * cube map costs nothing per frame and does not depend on the camera's near and far planes.
 * @param {THREE.WebGLRenderer} renderer
 */
function createSky(renderer) {
  const sky = new Sky();
  sky.material.fragmentShader = sky.material.fragmentShader.replace(
    '#include <tonemapping_fragment>',
    SKY_TONE_MAPPING,
  );
  const { uniforms } = sky.material;
  uniforms.turbidity.value = SKY.turbidity;
  uniforms.rayleigh.value = SKY.rayleigh;
  uniforms.mieCoefficient.value = SKY.mieCoefficient;
  uniforms.mieDirectionalG.value = SKY.mieDirectionalG;
  uniforms.cloudCoverage.value = SKY.cloudCoverage;
  // Sun direction from elevation above the horizon and azimuth (spherical coordinates, +y up).
  uniforms.sunPosition.value.setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - SKY.sunElevationDeg),
    THREE.MathUtils.degToRad(SKY.sunAzimuthDeg),
  );
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  const target = new THREE.WebGLCubeRenderTarget(SKY.cubeSize);
  new THREE.CubeCamera(0.1, 10, target).update(renderer, skyScene);
  sky.geometry.dispose();
  sky.material.dispose();
  return { value: target.texture, dispose: () => target.dispose() };
}

/** The starfield canvas, drawn once and shared by all panes (each uploads its own texture). */
let starCanvas = null;

/**
 * Draw an ellipse that is wider towards the poles, so a round star or glow stays round once
 * the plate carrée image is wrapped onto the sphere (a circle of radius r at latitude φ spans
 * r / cos φ in longitude: Tissot's indicatrix of the projection). Drawn twice near the
 * left/right edge, where the image wraps around.
 */
function drawDot(context, width, height, direction, radius, fill) {
  const { u, v, latitude } = toEquirect(direction);
  const x = u * width;
  const y = (1 - v) * height; // canvas y runs down; v = 1 is the top (+y)
  const rx = Math.min(width / 4, radius / Math.max(Math.cos(latitude), 0.02));
  context.fillStyle = fill;
  for (const offset of [0, -width, width]) {
    if (offset !== 0 && Math.abs(x + offset - width / 2) > width / 2 + rx) continue;
    context.beginPath();
    context.ellipse(x + offset, y, rx, radius, 0, 0, 2 * Math.PI);
    context.fill();
  }
}

function drawStarfield() {
  const width = STARS.textureWidth;
  const height = width / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
  const random = seededRandom(STARS.seed);
  const band = () => bandPoint(random, STARS.bandTiltDeg, STARS.bandWidthDeg);

  // Milky Way: soft glow, then many faint stars, both concentrated along the band.
  for (let i = 0; i < STARS.bandGlowCount; i++) {
    const tint = random() < 0.5 ? '150 160 220' : '200 180 210';
    drawDot(context, width, height, band(), 20 + 60 * random(), `rgb(${tint} / 3%)`);
  }
  for (let i = 0; i < STARS.bandCount; i++) {
    drawDot(context, width, height, band(), 0.6 + 0.6 * random(), `rgb(220 225 255 / 35%)`);
  }
  // Stars all over the sky: most are faint (brightness ~ random³).
  for (let i = 0; i < STARS.count; i++) {
    const brightness = random() ** 3;
    const colour = STAR_COLOURS[Math.floor(random() * STAR_COLOURS.length)];
    const alpha = Math.round(30 + 70 * brightness);
    drawDot(
      context,
      width,
      height,
      uniformSpherePoint(random),
      0.7 + 1.8 * brightness,
      `rgb(${colour} / ${alpha}%)`,
    );
  }
  return canvas;
}

/** Space: the starfield as an equirectangular background texture. */
function createSpace() {
  starCanvas ??= drawStarfield();
  const texture = new THREE.CanvasTexture(starCanvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return { value: texture, dispose: () => texture.dispose() };
}

/**
 * Create a background for one renderer (textures belong to one WebGL context).
 * @param {THREE.WebGLRenderer} renderer
 * @param {string} id - one of BACKGROUNDS in config.js.
 * @returns {{value: THREE.Color | THREE.Texture, dispose: () => void}} value goes to
 *   scene.background.
 * @throws {Error} for an unknown id.
 */
export function createBackground(renderer, id) {
  const entry = BACKGROUNDS.find((background) => background.id === id);
  if (!entry) throw new Error(`Unknown background: ${id}`);
  if (entry.color) return { value: new THREE.Color(entry.color), dispose() {} };
  return id === 'sky' ? createSky(renderer) : createSpace();
}
