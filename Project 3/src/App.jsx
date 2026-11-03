import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_BACKGROUND, MAX_PANES, MIN_PANE_FRACTION, MOBILE_QUERY } from './config.js';
import { useFileDropGuard } from './hooks/useFileOpener.js';
import { useLinkedCameras } from './hooks/useLinkedCameras.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { usePhotos } from './hooks/usePhotos.js';
import { closePane, createLayout, paneIds, setRatio, splitPane } from './utils/layout.js';
import ControlPanel from './components/ControlPanel.jsx';
import PaneLayout from './components/PaneLayout.jsx';
import SplatPane from './components/SplatPane.jsx';
import ViewTool from './components/ViewTool.jsx';
import PhotosTool from './components/PhotosTool.jsx';
import Messages from './components/Messages.jsx';

const paneId = (number) => `pane-${number}`;
const FIRST_PANE = paneId(1);
const CONTROLS_ID = 'view-controls';

/** "Pane 2" for pane-2. Numbers stay with a pane, so closing one does not rename the others. */
const paneLabel = (id) => `Pane ${id.slice('pane-'.length)}`;

export default function App() {
  const [layout, setLayout] = useState(() => createLayout(FIRST_PANE));
  const [activeId, setActiveId] = useState(FIRST_PANE);
  // Callback ref as state: the panes re-render (and portal their tools) once the slot exists.
  const [panelSlot, setPanelSlot] = useState(null);
  const nextSplit = useRef(1);
  // The panes' viewers by pane id, for the settings that span panes.
  const [viewers, setViewers] = useState({});
  const [linked, setLinked] = useState(false);
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const stacked = useMediaQuery(MOBILE_QUERY);
  useFileDropGuard();
  const syncFrom = useLinkedCameras(viewers, linked);
  const photos = usePhotos();
  const selectedName = photos.selected?.name ?? null;

  // Stable (no dependencies), so a pane's effect only re-runs when its own viewer changes.
  const onViewer = useCallback((id, viewer) => {
    setViewers((current) => {
      if ((current[id] ?? null) === viewer) return current;
      const next = { ...current };
      if (viewer) next[id] = viewer;
      else delete next[id];
      return next;
    });
  }, []);

  // One background for all panes, so they are compared on equal terms. A new pane gets it too.
  useEffect(() => {
    for (const viewer of Object.values(viewers)) viewer.setBackground(background);
  }, [viewers, background]);

  // The capture's cameras in every pane (frustums), with the chosen photo highlighted.
  useEffect(() => {
    for (const viewer of Object.values(viewers)) viewer.setPhotos(photos.photos, selectedName);
  }, [viewers, photos.photos, selectedName]);
  useEffect(() => {
    for (const viewer of Object.values(viewers)) viewer.setPhotosVisible(photos.visible);
  }, [viewers, photos.visible]);

  /** Look through a photo: the active pane, or all panes when the cameras are linked. */
  const selectPhoto = (name) => {
    const photo = photos.photos.find((candidate) => candidate.name === name);
    if (!photo) return;
    photos.select(name);
    for (const [id, viewer] of Object.entries(viewers)) {
      if (linked || id === activeId) viewer.viewPhoto(photo);
      // A pane still looking through the previous photo would no longer match the overlay.
      else if (viewer.photoName()) viewer.exitPhotoView();
    }
  };

  const ids = paneIds(layout);
  const canSplit = ids.length < MAX_PANES;

  const split = (id, direction) => {
    if (!canSplit) return;
    // The lowest free number, so labels stay within 1..MAX_PANES.
    let number = 1;
    while (ids.includes(paneId(number))) number += 1;
    const newId = paneId(number);
    setLayout(splitPane(layout, id, direction, newId, `split-${nextSplit.current++}`));
    setActiveId(newId);
  };

  const close = (id) => {
    const next = closePane(layout, id);
    if (next === layout) return;
    setLayout(next);
    if (id === activeId) {
      // The neighbour in reading order becomes active.
      const rest = paneIds(next);
      setActiveId(rest[Math.min(ids.indexOf(id), rest.length - 1)]);
    }
  };

  const link = (on) => {
    // Start from the active pane's view, then follow whichever pane moves.
    if (on) syncFrom(activeId);
    setLinked(on);
  };

  const moveDivider = (splitId, ratio) =>
    setLayout((current) => setRatio(current, splitId, ratio, MIN_PANE_FRACTION));

  return (
    <>
      {/* The panel comes first, so keyboard users reach the file button before the views. */}
      <ControlPanel>
        <div ref={setPanelSlot} />
        <ViewTool
          background={background}
          onBackground={setBackground}
          linked={linked}
          onLinked={link}
          canLink={ids.length > 1}
        />
        <PhotosTool photos={photos} onSelect={selectPhoto} />
      </ControlPanel>
      <main className="stage">
        <PaneLayout
          layout={layout}
          stacked={stacked}
          onRatio={moveDivider}
          renderPane={(id, rect) => (
            <SplatPane
              key={id}
              id={id}
              label={paneLabel(id)}
              rect={rect}
              active={id === activeId}
              canSplit={canSplit}
              canClose={ids.length > 1}
              panelSlot={panelSlot}
              onActivate={setActiveId}
              onSplit={split}
              onClose={close}
              onViewer={onViewer}
              photos={photos.photos}
              photo={photos.selected}
              compare={photos.compare}
              onCompare={photos.setCompare}
              describedBy={CONTROLS_ID}
            />
          )}
        />
        <p className="sr-only" id={CONTROLS_ID}>
          Drag to orbit, right-drag to pan, scroll to zoom. With the view focused: arrow keys pan,
          Shift + arrows orbit.
        </p>
      </main>
      <Messages />
    </>
  );
}
