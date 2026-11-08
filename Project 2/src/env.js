/**
 * Build-time values from .env. Browser code only: Node scripts must not import this file.
 *
 * Vite replaces each `import.meta.env.VITE_…` expression with its value at build time.
 * Always read one key at a time: an expression that uses the whole `import.meta.env`
 * object makes Vite paste the whole object, with every VITE_ variable, into the public
 * bundle.
 */

/**
 * Cesium ion token (VITE_CESIUM_TOKEN). It has to be in the browser bundle, so the
 * production token is read-only and restricted to the site's URL in Cesium ion.
 */
export const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN;

/**
 * maximumScreenSpaceError override for Cesium OSM Buildings (VITE_BUILDINGS_SSE), used
 * only by scripts/benchmark-buildings.js. Undefined unless it is a positive number.
 */
export const BUILDINGS_SSE = Number(import.meta.env.VITE_BUILDINGS_SSE) || undefined;
