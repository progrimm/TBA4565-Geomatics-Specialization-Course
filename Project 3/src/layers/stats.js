/**
 * Load statistics per tileset, collected from public Cesium3DTileset events.
 * Kept outside React; the performance panel reads them once per second.
 */

/** @typedef {{startedAt: number, readyMs?: number, initialTilesMs?: number, tilesLoaded: number}} TilesetStats */

/** @type {WeakMap<object, TilesetStats>} */
const stats = new WeakMap();

/**
 * Start timing a tileset load. Call before the tileset is requested.
 * @returns {() => number} elapsed milliseconds since the start.
 */
export function startTimer() {
  const startedAt = performance.now();
  return () => performance.now() - startedAt;
}

/**
 * Track a loaded tileset: time until tileset.json was ready, time until the tiles
 * of the first view were loaded (initialTilesLoaded), and tiles currently in memory.
 * @param {import('cesium').Cesium3DTileset} tileset
 * @param {() => number} elapsed - timer from startTimer, started before the request.
 */
export function trackTileset(tileset, elapsed) {
  const entry = { startedAt: performance.now() - elapsed(), readyMs: elapsed(), tilesLoaded: 0 };
  stats.set(tileset, entry);
  tileset.tileLoad.addEventListener(() => {
    entry.tilesLoaded += 1;
  });
  tileset.tileUnload.addEventListener(() => {
    entry.tilesLoaded -= 1;
  });
  tileset.initialTilesLoaded.addEventListener(() => {
    entry.initialTilesMs ??= elapsed();
  });
}

/**
 * @param {import('cesium').Cesium3DTileset} tileset
 * @returns {TilesetStats | undefined}
 */
export function getTilesetStats(tileset) {
  return stats.get(tileset);
}
