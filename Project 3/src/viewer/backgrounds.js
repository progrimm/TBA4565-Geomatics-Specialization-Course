// Backgrounds behind the splat: a colour or a sky cube map. No React here.
// They are set as scene.background, which three.js draws at infinity in the world frame
// (+y up), so they turn with the camera but not with the up-axis fix of the model.
// three.js: https://threejs.org/docs/#api/en/scenes/Scene.background
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { BACKGROUNDS, SKY } from '../config.js';

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
  return createSky(renderer);
}
