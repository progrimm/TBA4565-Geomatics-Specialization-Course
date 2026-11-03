import { useEffect, useId, useRef, useState } from 'react';
import { HOME_URL, MOBILE_QUERY, PANEL } from '../config.js';

const WIDTH_KEY = '3dgs-viewer.panelWidth';

/** The widest the panel may be now: its maximum, but always leaving room for the panes. */
const maxWidth = () =>
  Math.max(PANEL.minWidth, Math.min(PANEL.maxWidth, window.innerWidth - PANEL.paneRoom));
const clampWidth = (width) => Math.round(Math.min(maxWidth(), Math.max(PANEL.minWidth, width)));

function savedWidth() {
  try {
    const saved = Number(localStorage.getItem(WIDTH_KEY));
    return saved > 0 ? clampWidth(saved) : PANEL.width;
  } catch {
    return PANEL.width;
  }
}

/**
 * Drag handle on the panel's right edge (wide screens): the ARIA window splitter pattern, with
 * the arrow keys as for the pane dividers.
 * @param {{width: number, onWidth: (width: number) => void,
 *   panelRef: import('react').RefObject<HTMLElement>}} props
 */
function ResizeHandle({ width, onWidth, panelRef }) {
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const left = panelRef.current.getBoundingClientRect().left;
    const onMove = (move) => onWidth(clampWidth(move.clientX - left));
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };
  const onKeyDown = (event) => {
    const step = { ArrowLeft: -PANEL.keyStep, ArrowRight: PANEL.keyStep }[event.key];
    if (!step) return;
    event.preventDefault();
    onWidth(clampWidth(width + step));
  };
  return (
    <div
      className="panel-resize"
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize the controls panel"
      aria-valuenow={width}
      aria-valuemin={PANEL.minWidth}
      aria-valuemax={maxWidth()}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}

/**
 * Collapsible glass panel. Starts collapsed on mobile so the view is visible. On wide screens
 * its width can be dragged; the panes start right of it (CSS variable --panel-width).
 * @param {{children: import('react').ReactNode}} props
 */
export default function ControlPanel({ children }) {
  const [expanded, setExpanded] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);
  const bodyId = useId();
  const panelRef = useRef(null);
  const [width, setWidth] = useState(savedWidth);

  // The width is a CSS variable, so the stage (in another part of the page) follows it.
  useEffect(() => {
    document.documentElement.style.setProperty('--panel-width', `${width}px`);
    try {
      localStorage.setItem(WIDTH_KEY, String(width));
    } catch {
      // Storage blocked: the width lasts for this visit only.
    }
  }, [width]);

  // A smaller window can make the saved width too wide.
  useEffect(() => {
    const onResize = () => setWidth((current) => clampWidth(current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
      <aside ref={panelRef} className="panel" aria-label="Viewer controls">
        <a className="panel__home" href={HOME_URL}>
          ← My GIS module
        </a>
        <header className="panel__header">
          <h1 className="panel__title">3DGS Viewer</h1>
          <button
            className="panel__toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            aria-label={expanded ? 'Hide controls' : 'Show controls'}
            onClick={() => setExpanded((value) => !value)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </header>
        <div className="panel__body" id={bodyId} hidden={!expanded}>
          {children}
        </div>
      </aside>
      <ResizeHandle width={width} onWidth={setWidth} panelRef={panelRef} />
    </>
  );
}
