import { SPLATS } from '../config.js';
import SplatButton from './SplatButton.jsx';

/**
 * List of gallery splats plus a button back to the globe overview.
 * @param {{gallery: ReturnType<typeof import('../hooks/useGallery.js').useGallery>}} props
 */
export default function Gallery({ gallery }) {
  const { selected, states, select, showGlobe } = gallery;
  return (
    <section aria-labelledby="splats-heading">
      <h2 className="panel__heading" id="splats-heading">
        Splats
      </h2>
      <div className="views">
        {SPLATS.map((splat) => (
          <SplatButton
            key={splat.id}
            splat={splat}
            state={states[splat.id]}
            selected={selected?.id === splat.id}
            onSelect={select}
          />
        ))}
        <button type="button" className="view-button view-button--quiet" onClick={showGlobe}>
          Globe overview
        </button>
      </div>
      {selected && (
        <dl className="facts">
          <dt>Capture</dt>
          <dd>{selected.capture}</dd>
          <dt>Data</dt>
          <dd>{selected.dataType}</dd>
          <dt>Credits</dt>
          <dd>{selected.credits}</dd>
        </dl>
      )}
    </section>
  );
}
