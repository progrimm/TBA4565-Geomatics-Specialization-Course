import { useRef, useState } from 'react';
import { MAX_PANES, MIN_PANE_FRACTION, MOBILE_QUERY } from './config.js';
import { useFileDropGuard } from './hooks/useFileOpener.js';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { closePane, createLayout, paneIds, setRatio, splitPane } from './utils/layout.js';
import ControlPanel from './components/ControlPanel.jsx';
import PaneLayout from './components/PaneLayout.jsx';
import SplatPane from './components/SplatPane.jsx';
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
  const stacked = useMediaQuery(MOBILE_QUERY);
  useFileDropGuard();

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

  const moveDivider = (splitId, ratio) =>
    setLayout((current) => setRatio(current, splitId, ratio, MIN_PANE_FRACTION));

  return (
    <>
      {/* The panel comes first, so keyboard users reach the file button before the views. */}
      <ControlPanel>
        <div ref={setPanelSlot} />
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
