// Builds the whole "My GIS module" website into dist-site/:
//   dist-site/                 homepage (site/)
//   dist-site/projection-lab/  Project 1, static data mode
//   dist-site/trondheim-3d/    Project 2
//   dist-site/3dgs-viewer/     Project 3
// Every app uses a relative Vite base, so this folder works at any URL prefix.
//
// Usage: node scripts/build-site.mjs            build everything
//        node scripts/build-site.mjs --install  only run npm ci in every app
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'dist-site');

const apps = [
  { name: 'homepage', dir: 'site', path: '' },
  {
    name: 'Project 1',
    dir: 'Project 1/frontend',
    path: 'projection-lab',
    // No FastAPI or PostGIS on Pages: read the exported JSON in public/data.
    env: { VITE_DATA_MODE: 'static' },
  },
  { name: 'Project 2', dir: 'Project 2', path: 'trondheim-3d' },
  { name: 'Project 3', dir: 'Project 3', path: '3dgs-viewer' },
];

function npm(args, cwd, env = {}) {
  // shell: true lets Windows resolve npm.cmd; the arguments are fixed strings.
  const result = spawnSync('npm', args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`npm ${args.join(' ')} failed in ${cwd}`);
    process.exit(result.status ?? 1);
  }
}

if (process.argv.includes('--install')) {
  for (const app of apps) npm(['ci'], join(root, app.dir));
  process.exit(0);
}

// Project 2 needs a Cesium ion token at build time. Locally Vite reads it from
// Project 2/.env; in CI it must come from the CESIUM_ION_TOKEN secret.
if (process.env.CI && !process.env.VITE_CESIUM_TOKEN) {
  console.error('VITE_CESIUM_TOKEN is not set; add the CESIUM_ION_TOKEN repository secret.');
  process.exit(1);
}

for (const app of apps) {
  console.log(`\n=== Building ${app.name} (${app.dir}) ===`);
  npm(['run', 'build'], join(root, app.dir), app.env);
}

rmSync(out, { recursive: true, force: true });
for (const app of apps) {
  const dist = join(root, app.dir, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`${app.dir}/dist/index.html is missing`);
    process.exit(1);
  }
  cpSync(dist, join(out, app.path), { recursive: true });
}
console.log(`\nWebsite assembled in ${out}`);
