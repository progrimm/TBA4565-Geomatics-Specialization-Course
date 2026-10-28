import { ACCEPT, FORMATS } from '../config.js';
import { FILE_INPUT_ID } from '../hooks/useFileOpener.js';

const EXTENSIONS = Object.keys(FORMATS).map((extension) => `.${extension}`);

/**
 * The file button in the panel (and the hidden file input it opens).
 * @param {{opener: ReturnType<typeof import('../hooks/useFileOpener.js').useFileOpener>,
 *   loading: boolean}} props
 */
export default function FileOpener({ opener, loading }) {
  return (
    <>
      <input
        id={FILE_INPUT_ID}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={opener.onInputChange}
      />
      <button className="open-button" type="button" onClick={opener.choose} disabled={loading}>
        {loading ? 'Opening…' : 'Open splat file'}
      </button>
      <p className="tool__note">
        Or drop a file anywhere: {EXTENSIONS.join(', ')}. The file stays in this browser; nothing is
        uploaded.
      </p>
    </>
  );
}

/**
 * Prompt in the middle of the empty view.
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

/** Shown over the page while a file is dragged over it. */
export function DropOverlay() {
  return (
    <div className="drop-overlay" aria-hidden="true">
      Drop to open
    </div>
  );
}
