import { useCallback, useEffect } from 'react';

/**
 * Linked cameras: while linked, moving the view in one pane moves all the others to the same
 * camera position and orbit target. This only lines the splats up when they share a frame,
 * e.g. two trainings or exports of the same capture with the same up axis.
 * @param {Record<string, ReturnType<typeof import('../viewer/splatViewer.js').createSplatViewer>>}
 *   viewers - the open panes' viewers by pane id.
 * @param {boolean} linked
 * @returns {(sourceId: string) => void} copy one pane's view to all others (call when linking).
 */
export function useLinkedCameras(viewers, linked) {
  const syncFrom = useCallback(
    (sourceId) => {
      const source = viewers[sourceId];
      if (!source) return;
      const view = source.getView();
      for (const [id, viewer] of Object.entries(viewers)) {
        if (id !== sourceId) viewer.setView(view);
      }
    },
    [viewers],
  );

  useEffect(() => {
    if (!linked) return undefined;
    const unsubscribes = Object.entries(viewers).map(([id, viewer]) =>
      viewer.onViewChange(() => syncFrom(id)),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [viewers, linked, syncFrom]);

  return syncFrom;
}
