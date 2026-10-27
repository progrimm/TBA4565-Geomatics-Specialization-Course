// Viewer lab constants: one source of truth for every viewer page, so all of them
// load the same file with the same canvas size and camera.

/** The shared test splat, relative to a page in lab/ (served from public/splats/). */
export const SPLAT_URL = '../splats/soar.ply';

export const SPLAT_CREDIT = {
  text: '"SOAR Telescope" splat by Luis Cerda, CC BY 4.0 (converted to standard PLY)',
  sourceUrl: 'https://github.com/khyron/Gaussian-Splatting',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

/**
 * Drawing-buffer scale from the page URL (?scale=2 renders 2560 × 1440, a heavier
 * load for the benchmark). 1 outside the browser (Node scripts) or if not given.
 */
const SCALE =
  typeof window === 'undefined'
    ? 1
    : Number(new URLSearchParams(window.location.search).get('scale')) || 1;

/**
 * Fixed drawing-buffer size in pixels, the same for every viewer, so runs are
 * comparable. The CSS size of the canvas follows the page layout.
 */
export const CANVAS = { width: 1280 * SCALE, height: 720 * SCALE, pixelRatio: 1 };

/**
 * Camera, in the splat's own PLY coordinates (metres, local frame, no CRS). This
 * PLY follows the 3DGS/COLMAP convention: +y points down, so "up" is -y. Every
 * viewer keeps the splat untransformed and sets this up vector on its camera.
 */
export const CAMERA = {
  target: [-0.1, -2.1, -1.1],
  up: [0, -1, 0],
  radius: 9,
  height: 3,
  startAngleDeg: 200,
  verticalFovDeg: 60,
  near: 0.05,
  far: 200,
};

/** Benchmark orbit: one full turn around the target. */
export const ORBIT = { durationMs: 10000, settleMs: 2000 };

/** Viewer pages, in table order. `benchmarked: false` = qualitative only. */
export const VIEWERS = [
  { id: 'spark', name: 'Spark', page: 'spark.html', benchmarked: true },
  { id: 'playcanvas', name: 'PlayCanvas', page: 'playcanvas.html', benchmarked: true },
  { id: 'babylon', name: 'Babylon.js', page: 'babylon.html', benchmarked: true },
  { id: 'arcgis', name: 'ArcGIS Maps SDK', page: 'arcgis.html', benchmarked: false },
];

/**
 * Esri's public GaussianSplatLayer sample (portal item, owner jsapi_team): an
 * industrial area in Vietnam. Used only on the ArcGIS page.
 */
export const ARCGIS_SAMPLE = {
  portalItemId: '01596d71a5ce40ec8a6f21baad6e5b6f',
  basemap: 'satellite',
  tiltDeg: 60,
  credit: {
    text: '"Portcoast industrial" splat layer © Portcoast Consultant Corporation, via Esri (no licence stated)',
    sourceUrl: 'https://www.arcgis.com/home/item.html?id=01596d71a5ce40ec8a6f21baad6e5b6f',
    licenceUrl: 'https://www.esri.com/en-us/legal/terms/full-master-agreement',
  },
};

/** Homepage of the whole site and the gallery, relative to a page in lab/. */
export const HOME_URL = '../../';
export const GALLERY_URL = '../';
export const LAB_URL = './';
