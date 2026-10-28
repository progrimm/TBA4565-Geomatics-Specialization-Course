import { useId, useState } from 'react';
import { HOME_URL, MOBILE_QUERY } from '../config.js';

/**
 * Collapsible glass panel. Starts collapsed on mobile so the view is visible.
 * @param {{children: import('react').ReactNode}} props
 */
export default function ControlPanel({ children }) {
  const [expanded, setExpanded] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);
  const bodyId = useId();

  return (
    <aside className="panel" aria-label="Viewer controls">
      <a className="panel__home" href={HOME_URL}>
        ← My GIS module
      </a>
      <header className="panel__header">
        <h1 className="panel__title">
          3DGS <span className="panel__accent">Viewer</span>
        </h1>
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
  );
}
