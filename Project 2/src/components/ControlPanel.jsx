import { useId, useState } from 'react';
import { HOME_URL, MOBILE_QUERY } from '../config.js';

/**
 * Collapsible control panel. Starts collapsed on mobile so the map is visible. The
 * homepage link and the "How it works" button sit outside the collapsible body, so
 * they stay reachable when the mobile sheet is collapsed.
 * @param {{children: import('react').ReactNode, onAbout: () => void}} props
 */
export default function ControlPanel({ children, onAbout }) {
  const [expanded, setExpanded] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);
  const bodyId = useId();

  return (
    <aside className="panel" aria-label="Map controls">
      <nav className="panel__links" aria-label="Page">
        <a className="panel__link" href={HOME_URL}>
          ← My GIS module
        </a>
        <button className="panel__link" type="button" aria-haspopup="dialog" onClick={onAbout}>
          How it works
        </button>
      </nav>
      <header className="panel__header">
        <div>
          <h1 className="panel__title">Trondheim Shelter Analysis</h1>
          <p className="panel__subtitle">Walking access to public shelters</p>
        </div>
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
