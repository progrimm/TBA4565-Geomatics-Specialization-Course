const STATUS_TEXT = { loading: 'Loading…', error: 'Unavailable' };

/**
 * Gallery entry: selecting it loads the splat (first time) and flies there.
 * @param {object} props
 * @param {import('../config.js').Splat} props.splat
 * @param {import('../hooks/useGallery.js').SplatState} [props.state] - undefined until first selected.
 * @param {boolean} props.selected
 * @param {(id: string) => void} props.onSelect
 */
export default function SplatButton({ splat, state, selected, onSelect }) {
  return (
    <button
      type="button"
      className="view-button"
      aria-pressed={selected}
      aria-busy={state?.status === 'loading'}
      onClick={() => onSelect(splat.id)}
    >
      {splat.label}
      <span className="view-button__meta">
        {STATUS_TEXT[state?.status] ?? `${splat.place}, ${splat.country}`}
      </span>
    </button>
  );
}
