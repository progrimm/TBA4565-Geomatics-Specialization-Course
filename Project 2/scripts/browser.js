/**
 * Shared setup for the Playwright check and benchmark scripts.
 */
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
  const dir = arg ?? join(tmpdir(), 'trondheim-3d-checks');
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
