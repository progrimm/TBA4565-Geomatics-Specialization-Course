import { useCallback, useEffect, useRef, useState } from 'react';
import { GLOBE_VIEW, MOBILE_QUERY, SPLATS } from '../config.js';
import { addSplatMarkers } from '../layers/markers.js';
import { loadSplat, viewSplat } from '../layers/splat.js';
import { setLayerVisible } from '../layers/visibility.js';
import { toGlobeCameraOptions } from '../utils/camera.js';
import { flightDuration } from '../utils/motion.js';

/** @typedef {{status: 'loading' | 'ready' | 'error', tileset?: import('cesium').Cesium3DTileset}} SplatState */

/**
 * Gallery state: which splat is selected, and the loading state of each splat.
 * Splats load lazily on first selection. Only the selected one is shown, so
 * hidden tilesets neither render nor request tiles.
 * @param {import('cesium').Viewer | undefined} viewer
 * @returns {{
 *   selected: import('../config.js').Splat | undefined,
 *   states: Record<string, SplatState>,
 *   select: (id: string) => void,
 *   showGlobe: () => void,
 * }}
 */
export function useGallery(viewer) {
  const [selectedId, setSelectedId] = useState();
  const [states, setStates] = useState({});
  // Mutable mirrors for async callbacks and Cesium events; only touched in handlers.
  const registry = useRef(new Map());
  const selectedRef = useRef();

  const setSplatState = useCallback((id, state) => {
    registry.current.set(id, state);
    setStates(Object.fromEntries(registry.current));
  }, []);

  const showOnly = useCallback(
    (id) => {
      selectedRef.current = id;
      setSelectedId(id);
      for (const [splatId, state] of registry.current) {
        if (state.tileset) setLayerVisible(viewer.scene, state.tileset, splatId === id);
      }
    },
    [viewer],
  );

  const select = useCallback(
    async (id) => {
      if (!viewer) return;
      showOnly(id);
      const current = registry.current.get(id);
      if (current?.status === 'ready') {
        viewSplat(viewer.camera, current.tileset, flightDuration());
        return;
      }
      if (current?.status === 'loading') return;

      setSplatState(id, { status: 'loading' });
      const tileset = await loadSplat(
        viewer,
        SPLATS.find((splat) => splat.id === id),
      );
      if (viewer.isDestroyed()) return;
      setSplatState(id, tileset ? { status: 'ready', tileset } : { status: 'error' });
      if (!tileset) return;
      // The user may have picked another splat while this one was loading.
      const stillSelected = selectedRef.current === id;
      setLayerVisible(viewer.scene, tileset, stillSelected);
      if (stillSelected) viewSplat(viewer.camera, tileset, flightDuration());
    },
    [viewer, showOnly, setSplatState],
  );

  const showGlobe = useCallback(() => {
    if (!viewer) return;
    showOnly(undefined);
    viewer.camera.flyTo({
      ...toGlobeCameraOptions(GLOBE_VIEW, window.matchMedia(MOBILE_QUERY).matches),
      duration: flightDuration(),
    });
  }, [viewer, showOnly]);

  // Markers on the globe; clicking one selects its splat.
  useEffect(() => {
    if (!viewer) return undefined;
    const loaded = registry.current;
    let markers;
    addSplatMarkers(viewer, SPLATS).then((dataSource) => {
      if (viewer.isDestroyed()) return;
      markers = dataSource;
      viewer.scene.requestRender();
    });
    const removeListener = viewer.selectedEntityChanged.addEventListener((entity) => {
      if (entity && markers?.entities.contains(entity)) select(entity.id);
    });
    return () => {
      removeListener();
      // A destroyed viewer has destroyed its tilesets: forget them.
      loaded.clear();
      setStates({});
      setSelectedId(undefined);
      if (markers && !viewer.isDestroyed()) viewer.dataSources.remove(markers, true);
    };
  }, [viewer, select]);

  return {
    selected: SPLATS.find((splat) => splat.id === selectedId),
    states,
    select,
    showGlobe,
  };
}
