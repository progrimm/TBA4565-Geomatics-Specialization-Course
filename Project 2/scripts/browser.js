/**
 * Shared setup for the Playwright check and benchmark scripts.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

/** Launch Chromium with the GPU enabled (ANGLE on Direct3D 11 on Windows). */
export const launchBrowser = () =>
  chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

/**
 * Directory for check screenshots: the given argument, or a folder in the OS temp
 * directory, so nothing untracked lands in the repo by default.
 * @param {string | undefined} arg
 * @returns {string} the created directory.
 */
export function screenshotDir(arg) {
  const dir = arg ?? join(tmpdir(), 'shelter-analysis-checks');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Record a failed expectation: print it and make the script exit with code 1.
 * @param {boolean} ok
 * @param {string} message
 */
export function expect(ok, message) {
  if (ok) return;
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

/** Run vite (build or preview) through npx; shell is needed for npx on Windows. */
export const vite = (args, env) => ({ command: `npx vite ${args}`, options: { env, shell: true } });

/**
 * Start `vite preview` for one build and resolve once it accepts requests.
 * @param {string} outDir
 * @param {number} port
 */
export async function startPreview(outDir, port) {
  const url = `http://localhost:${port}/`;
  // A server left on the port would be measured instead of this build.
  const alreadyUp = await fetch(url).then(
    () => true,
    () => false,
  );
  if (alreadyUp) throw new Error(`port ${port} is already in use`);
  const { command, options } = vite(`preview --outDir ${outDir} --port ${port} --strictPort`);
  // detached: own process group on Linux/macOS, so stopPreview can kill the whole tree.
  const server = spawn(command, { ...options, stdio: 'ignore', detached: true });
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(url)).ok) return { server, url };
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`vite preview did not start on port ${port}`);
}

/** Stop the preview server: the shell, npx and vite. */
export function stopPreview(server) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']);
  else process.kill(-server.pid); // negative pid = the whole process group
}
