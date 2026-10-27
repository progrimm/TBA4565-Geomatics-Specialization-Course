import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMesh } from '../layers/splat.js';
import {
  loadBuildings,
  setImageryVisible,
  setSplit,
  setTerrainEnabled,
  setTilesetOffset,
} from '../layers/reference.js';
import { setLayerVisible } from '../layers/visibility.js';

const DEFAULT_SPLIT = 0.5;

/** @typedef {{status: 'loading' | 'ready' | 'error', tileset?: import('cesium').Cesium3DTileset}} LayerState */

/**
 * Alignment-check state: reference layers (terrain, imagery, OSM buildings), the
 * selected splat's visibility and optional offset, and the swipe comparison
 * (splat left, its mesh or the bare reference layers right).
 * @param {import('cesium').Viewer | undefined} viewer
 * @param {import('../config.js').Splat | undefined} splat - selected splat.
 * @param {import('cesium').Cesium3DTileset | undefined} tileset - its loaded tileset.
 */
export function useAlignment(viewer, splat, tileset) {
  const [terrain, setTerrain] = useState(true);
  const [imagery, setImagery] = useState(true);
  const [buildings, setBuildings] = useState(/** @type {LayerState | undefined} */ (undefined));
  const [buildingsOn, setBuildingsOn] = useState(false);
  const [hiddenTileset, setHiddenTileset] = useState();
  const [offsetOn, setOffsetOn] = useState(false);
  const [swipe, setSwipe] = useState(false);
  const [splitPosition, setSplitPosition] = useState(DEFAULT_SPLIT);
  const [meshes, setMeshes] = useState(/** @type {Record<string, LayerState>} */ ({}));
  const worldTerrain = useRef();

  const mesh = splat?.mesh ? meshes[splat.id] : undefined;

  const toggleTerrain = useCallback(
    (enabled) => {
      worldTerrain.current ??= viewer.terrainProvider;
      setTerrainEnabled(viewer, worldTerrain.current, enabled);
      setTerrain(enabled);
    },
    [viewer],
  );

  const toggleImagery = useCallback(
    (visible) => {
      setImageryVisible(viewer, visible);
      setImagery(visible);
    },
    [viewer],
  );

  const toggleBuildings = useCallback(
    async (visible) => {
      setBuildingsOn(visible);
      if (!visible || buildings) return;
      setBuildings({ status: 'loading' });
      const loaded = await loadBuildings(viewer);
      setBuildings(loaded ? { status: 'ready', tileset: loaded } : { status: 'error' });
    },
    [viewer, buildings],
  );

  // Suggested offset (only splats that define one, e.g. the iTwin dam). Applied in
  // the handler, not an effect, so the inspector re-renders with the new modelMatrix.
  const toggleOffset = useCallback(
    (on) => {
      setTilesetOffset(viewer.scene, tileset, on ? splat.offset : undefined);
      setOffsetOn(on);
    },
    [viewer, splat, tileset],
  );

  const toggleSwipe = useCallback(
    async (enabled) => {
      setSwipe(enabled);
      if (!enabled || !splat?.mesh || meshes[splat.id]) return;
      const id = splat.id;
      setMeshes((previous) => ({ ...previous, [id]: { status: 'loading' } }));
      const loaded = await loadMesh(viewer, splat.mesh);
      setMeshes((previous) => ({
        ...previous,
        [id]: loaded ? { status: 'ready', tileset: loaded } : { status: 'error' },
      }));
    },
    [viewer, splat, meshes],
  );

  // OSM buildings visibility.
  useEffect(() => {
    if (buildings?.tileset && !viewer.isDestroyed()) {
      setLayerVisible(viewer.scene, buildings.tileset, buildingsOn);
    }
  }, [viewer, buildings, buildingsOn]);

  // Selected splat visibility (hiding is per tileset, so a newly selected splat shows).
  useEffect(() => {
    if (tileset && !viewer.isDestroyed()) {
      setLayerVisible(viewer.scene, tileset, hiddenTileset !== tileset);
    }
  }, [viewer, tileset, hiddenTileset]);

  // Swipe: splat left, mesh (if any) right. Reset when the selection changes.
  useEffect(() => {
    if (!tileset || viewer.isDestroyed()) return undefined;
    const right = mesh?.tileset;
    if (right) setLayerVisible(viewer.scene, right, swipe);
    setSplit(viewer.scene, { left: tileset, right, position: swipe ? splitPosition : undefined });
    return () => {
      if (viewer.isDestroyed()) return;
      if (right) setLayerVisible(viewer.scene, right, false);
      setSplit(viewer.scene, { left: tileset, right });
    };
  }, [viewer, tileset, mesh, swipe, splitPosition]);

  return {
    terrain,
    imagery,
    buildings: { state: buildings, on: buildingsOn },
    splatVisible: Boolean(tileset) && hiddenTileset !== tileset,
    offsetOn,
    swipe,
    splitPosition,
    mesh,
    toggleTerrain,
    toggleImagery,
    toggleBuildings,
    toggleSplat: (visible) => setHiddenTileset(visible ? undefined : tileset),
    toggleOffset,
    toggleSwipe,
    setSplitPosition,
  };
}
