// Shared harness for every viewer page: page chrome (navigation bar, status line,
// credits), the shared camera pose, and the benchmark hooks. Viewer modules only
// create their engine, load the splat and apply camera poses.
import { summariseRun } from '../utils/benchmark.js';
import { orbitAngle, orbitPosition } from '../utils/orbit.js';
import { CAMERA, CANVAS, GALLERY_URL, HOME_URL, LAB_URL, ORBIT, SPLAT_CREDIT } from './config.js';
import './lab.css';

/**
 * @typedef {{position: number[], target: number[], up: number[]}} Pose
 *   Camera pose in the splat's PLY coordinates (metres).
 */

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Camera pose at an orbit angle.
 * @param {number} angleDeg
 * @returns {Pose}
 */
export function poseAt(angleDeg) {
  return { position: orbitPosition(CAMERA, angleDeg), target: CAMERA.target, up: CAMERA.up };
}

/** The pose every viewer starts from. */
export const START_POSE = poseAt(CAMERA.startAngleDeg);

function navigationBar(title) {
  const nav = document.createElement('nav');
  nav.className = 'lab-bar';
  nav.setAttribute('aria-label', 'Site');
  // The lab index is itself "Viewer lab", so it has no separate lab link.
  const labLink = title === 'Viewer lab' ? '' : `<a href="${LAB_URL}">Viewer lab</a> /`;
  nav.innerHTML = `
    <a class="lab-bar__home" href="${HOME_URL}">← My GIS module</a>
    <span class="lab-bar__trail">
      <a href="${GALLERY_URL}">3DGS Viewer</a> /
      ${labLink}
      <span aria-current="page"></span>
    </span>`;
  nav.querySelector('[aria-current]').textContent = title;
  return nav;
}

function creditLine(splatCredit, extra) {
  const footer = document.createElement('footer');
  footer.className = 'lab-credit';
  const link = (href, text) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.rel = 'noreferrer';
    return a;
  };
  footer.append(
    `${splatCredit.text}. `,
    link(splatCredit.sourceUrl, 'Source'),
    ' · ',
    link(splatCredit.licenceUrl, 'Licence'),
  );
  if (extra) footer.append(` · ${extra}`);
  return footer;
}

/**
 * Build the page around a fixed-size canvas and return the harness API.
 * @param {{title: string, engine: string, credit?: string, createCanvas?: boolean,
 *   splatCredit?: {text: string, sourceUrl: string, licenceUrl: string}}} options
 *   title = viewer name; engine = short description shown under it; credit = extra
 *   engine credit; createCanvas = false when the engine creates its own canvas
 *   (the stage element is then its container); splatCredit = credit of the data
 *   shown, when it is not the shared test splat.
 * @returns {{canvas: HTMLCanvasElement | null, stage: HTMLElement, bench: boolean,
 *   status: (text: string) => void, fail: (error: unknown) => void,
 *   splatShown: (applyPose: (pose: Pose) => void) => Promise<void>}}
 */
export function createLabPage({
  title,
  engine,
  credit,
  createCanvas = true,
  splatCredit = SPLAT_CREDIT,
}) {
  document.title = title === 'Viewer lab' ? title : `${title} · Viewer lab`;
  const bench = new URLSearchParams(window.location.search).has('bench');

  const main = document.createElement('main');
  main.className = 'lab-page';
  main.innerHTML = `
    <header class="lab-page__header">
      <h1></h1>
      <p class="lab-page__engine"></p>
    </header>
    <div class="lab-stage"></div>
    <p class="lab-status" role="status" aria-live="polite"></p>`;
  main.querySelector('h1').textContent = title;
  main.querySelector('.lab-page__engine').textContent = engine;
  const stage = main.querySelector('.lab-stage');
  const statusLine = main.querySelector('.lab-status');

  let canvas = null;
  if (createCanvas) {
    canvas = document.createElement('canvas');
    canvas.width = CANVAS.width;
    canvas.height = CANVAS.height;
    canvas.setAttribute('aria-label', `${title} rendering of the test splat`);
    stage.append(canvas);
  }
  document.body.append(navigationBar(title), main, creditLine(splatCredit, credit));

  const status = (text) => {
    statusLine.textContent = text;
    statusLine.classList.remove('lab-status--error');
  };
  const fail = (error) => {
    console.error(error);
    statusLine.textContent = `Could not show the splat: ${error?.message ?? error}`;
    statusLine.classList.add('lab-status--error');
    window.__labResult = { error: String(error?.message ?? error) };
  };

  /**
   * Call once the engine reports the splat as loaded. Waits for two frames so the
   * splat has been drawn, records the time to first frame and, in benchmark mode
   * (?bench), runs the scripted orbit.
   */
  const splatShown = async (applyPose) => {
    await nextFrame();
    await nextFrame();
    // performance.now() counts from navigation start, so this includes download,
    // parsing and upload of the splat.
    const firstFrameMs = performance.now();
    status(`First frame with the splat after ${(firstFrameMs / 1000).toFixed(2)} s.`);
    if (!bench) return;
    await wait(ORBIT.settleMs);
    const timestamps = await runOrbit(applyPose);
    window.__labResult = { firstFrameMs, ...summariseRun(timestamps) };
    status(`Benchmark done: ${window.__labResult.meanFps.toFixed(1)} fps mean.`);
  };

  return { canvas, stage, bench, status, fail, splatShown };
}

/**
 * Move the camera around the target once, one pose per animation frame.
 * @param {(pose: Pose) => void} applyPose
 * @returns {Promise<number[]>} the timestamp of every frame (ms).
 */
async function runOrbit(applyPose) {
  const timestamps = [];
  let now = await nextFrame();
  const start = now;
  while (now - start < ORBIT.durationMs) {
    applyPose(poseAt(orbitAngle(now - start, ORBIT.durationMs, CAMERA.startAngleDeg)));
    timestamps.push(now);
    now = await nextFrame();
  }
  timestamps.push(now);
  return timestamps;
}
