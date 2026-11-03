import { BACKGROUNDS } from '../config.js';
import Tool from './Tool.jsx';

/**
 * Settings for all panes: background and linked cameras.
 * @param {{background: string, onBackground: (id: string) => void, linked: boolean,
 *   onLinked: (linked: boolean) => void, canLink: boolean}} props
 */
export default function ViewTool({ background, onBackground, linked, onLinked, canLink }) {
  return (
    <Tool id="view" title="All panes">
      <div className="tool__actions" role="group" aria-label="Background">
        <span className="tool__label">Background</span>
        {BACKGROUNDS.map(({ id, label }) => (
          <button
            key={id}
            className="chip"
            type="button"
            aria-pressed={background === id}
            onClick={() => onBackground(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="tool__note">The sky is drawn in the browser and stays level (+Y up).</p>
      <div className="tool__actions tool__actions--spaced">
        <button
          className="chip"
          type="button"
          aria-pressed={linked}
          disabled={!canLink}
          onClick={() => onLinked(!linked)}
        >
          Link cameras
        </button>
      </div>
      <p className="tool__note">
        {canLink
          ? 'Linked panes follow the one you move. Useful when the splats share a frame, e.g. exports of the same capture with the same up axis.'
          : 'Split a pane to compare splats side by side (up to 4).'}
      </p>
    </Tool>
  );
}
