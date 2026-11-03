/**
 * Settings for all panes: linked cameras.
 * @param {{linked: boolean, onLinked: (linked: boolean) => void, canLink: boolean}} props
 */
export default function ViewTool({ linked, onLinked, canLink }) {
  return (
    <section className="tool" aria-labelledby="view-heading">
      <h2 className="tool__summary" id="view-heading">
        All panes
      </h2>
      <div className="tool__actions">
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
    </section>
  );
}
