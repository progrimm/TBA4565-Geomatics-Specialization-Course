import { describe, it, expect } from 'vitest';
import { Event } from 'cesium';
import { getTilesetStats, trackTileset } from '../src/layers/stats.js';

/** Stand-in for a Cesium3DTileset: only the three events trackTileset listens to. */
const fakeTileset = () => ({
  tileLoad: new Event(),
  tileUnload: new Event(),
  initialTilesLoaded: new Event(),
});

describe('tileset load statistics', () => {
  it('records the ready time and counts tiles in memory', () => {
    const tileset = fakeTileset();
    trackTileset(tileset, () => 120);

    tileset.tileLoad.raiseEvent();
    tileset.tileLoad.raiseEvent();
    tileset.tileLoad.raiseEvent();
    tileset.tileUnload.raiseEvent();

    expect(getTilesetStats(tileset)).toMatchObject({ readyMs: 120, tilesLoaded: 2 });
  });

  it('keeps the first initialTilesLoaded time, not later ones', () => {
    // initialTilesLoaded fires again after the camera moves away and back.
    const tileset = fakeTileset();
    let now = 100;
    trackTileset(tileset, () => now);

    now = 900;
    tileset.initialTilesLoaded.raiseEvent();
    now = 5000;
    tileset.initialTilesLoaded.raiseEvent();

    expect(getTilesetStats(tileset).initialTilesMs).toBe(900);
  });

  it('returns undefined for a tileset that is not tracked', () => {
    expect(getTilesetStats(fakeTileset())).toBeUndefined();
  });
});
