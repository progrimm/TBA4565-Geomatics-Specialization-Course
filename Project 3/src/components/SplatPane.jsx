import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ACCEPT, MAX_PANES } from '../config.js';
import { useFileOpener } from '../hooks/useFileOpener.js';
import { useMeasurement } from '../hooks/useMeasurement.js';
import { useSplatViewer } from '../hooks/useSplatViewer.js';
import FileOpener, { DropOverlay, EmptyState } from './FileOpener.jsx';
import MeasureTool from './MeasureTool.jsx';
import OrientationTool from './OrientationTool.jsx';
import SplatFacts from './SplatFacts.jsx';

/** 16 px line icons for the pane bar, drawn in currentColor. */
const ICONS = {
  open: 'M3 6h6l2 2h10v11H3z',
  splitRight: 'M3 5h18v14H3zM12 5v14',
  splitDown: 'M3 5h18v14H3zM3 12h18',
  close: 'M6 6l12 12M18 6L6 18',
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * One tile of the layout: its own 3D view, splat, file opener and measurement. The active
 * pane renders its tools into the panel (a portal), so the panel always shows the outlined pane.
 * @param {{id: string, label: string, rect: import('../utils/layout.js').Rect, active: boolean,
 *   canSplit: boolean, canClose: boolean, panelSlot: HTMLElement | null,
 *   onActivate: (id: string) => void, onSplit: (id: string, direction: 'row' | 'column') => void,
 *   onClose: (id: string) => void, describedBy: string,
 *   onViewer: (id: string, viewer: object | null) => void}} props
 *   onViewer: reports this pane's viewer to the app (for linked cameras and backgrounds).
 */
export default function SplatPane({
  id,
  label,
  rect,
  active,
  canSplit,
  canClose,
  panelSlot,
  onActivate,
  onSplit,
  onClose,
  describedBy,
  onViewer,
}) {
  const paneRef = useRef(null);
  const { canvasRef, viewer, loading, facts, upAxis, setUpAxis, open } = useSplatViewer();
  const measurement = useMeasurement(viewer, canvasRef, facts);
  const { inputRef, onInputChange, choose, dragging } = useFileOpener(open, paneRef);
  useEffect(() => {
    onViewer(id, viewer);
    return () => onViewer(id, null);
  }, [id, viewer, onViewer]);

  const splitTitle = canSplit ? undefined : `At most ${MAX_PANES} panes`;

  let title = 'Empty';
  if (facts) title = facts.name;
  if (loading) title = 'Opening…';

  const tools = (
    <>
      <FileOpener paneLabel={label} onChoose={choose} loading={loading} />
      {facts && (
        <>
          <SplatFacts facts={facts} />
          <OrientationTool
            upAxis={upAxis}
            onUpAxis={setUpAxis}
            onReset={() => viewer?.resetView()}
          />
          <MeasureTool measurement={measurement} />
        </>
      )}
    </>
  );

  const pct = (fraction) => `${fraction * 100}%`;
  return (
    <section
      ref={paneRef}
      className={`pane${active ? ' pane--active' : ''}`}
      style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
      aria-label={facts ? `${label}: ${facts.name}` : label}
      onPointerDownCapture={() => onActivate(id)}
      onFocus={() => onActivate(id)}
    >
      <div className="pane__frame">
        <div className="pane__bar">
          <span className="pane__label">{label}</span>
          <span className="pane__title" title={facts?.name}>
            {title}
          </span>
          <button
            className="pane__button"
            type="button"
            onClick={choose}
            disabled={loading}
            aria-label={`Open a splat file in ${label}`}
            title="Open file"
          >
            <Icon name="open" />
          </button>
          <button
            className="pane__button"
            type="button"
            onClick={() => onSplit(id, 'row')}
            disabled={!canSplit}
            aria-label={`Split ${label} right`}
            title={splitTitle ?? 'Split right'}
          >
            <Icon name="splitRight" />
          </button>
          <button
            className="pane__button"
            type="button"
            onClick={() => onSplit(id, 'column')}
            disabled={!canSplit}
            aria-label={`Split ${label} down`}
            title={splitTitle ?? 'Split down'}
          >
            <Icon name="splitDown" />
          </button>
          <button
            className="pane__button"
            type="button"
            onClick={() => onClose(id)}
            disabled={!canClose}
            aria-label={`Close ${label}`}
            title={canClose ? 'Close pane' : 'The last pane stays open'}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="pane__view">
          <canvas
            ref={canvasRef}
            className="pane__canvas"
            tabIndex={0}
            aria-label={
              facts ? `${label}, 3D view of ${facts.name}` : `${label}, 3D view, no splat open`
            }
            aria-describedby={describedBy}
          />
          {!facts && !loading && <EmptyState onChoose={choose} />}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={onInputChange} />
        {dragging && <DropOverlay />}
      </div>
      {active && panelSlot && createPortal(tools, panelSlot)}
    </section>
  );
}
