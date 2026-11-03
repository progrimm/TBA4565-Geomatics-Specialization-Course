import { FORMATS } from '../config.js';

const EXTENSIONS = Object.keys(FORMATS).map((extension) => `.${extension}`);

/**
 * The file button in the panel, for the active pane.
 * @param {{paneLabel: string, onChoose: () => void, loading: boolean}} props
 */
export default function FileOpener({ paneLabel, onChoose, loading }) {
  return (
    <>
      <button className="open-button" type="button" onClick={onChoose} disabled={loading}>
        {loading ? 'Opening…' : `Open splat file in ${paneLabel}`}
      </button>
      <p className="tool__note">
        {paneLabel} is the outlined pane. Or drop a file on any pane: {EXTENSIONS.join(', ')}. The
        file stays in this browser; nothing is uploaded.
      </p>
    </>
  );
}

/**
 * Prompt in the middle of an empty pane.
 * @param {{onChoose: () => void}} props
 */
export function EmptyState({ onChoose }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">Open a 3D Gaussian splat</p>
      <p className="empty-state__text">
        Drop a {EXTENSIONS.slice(0, -1).join(', ')} or {EXTENSIONS.at(-1)} file here, or{' '}
        <button className="link-button" type="button" onClick={onChoose}>
          choose one
        </button>
        .
      </p>
    </div>
  );
}

/** Shown over a pane while a file is dragged over it. */
export function DropOverlay() {
  return (
    <div className="drop-overlay" aria-hidden="true">
      Drop to open here
    </div>
  );
}
