import { CORE_FRACTION } from '../config.js';
import { formatBytes, formatCount, formatNumber } from '../utils/format.js';

const size = (extent) => extent.map(formatNumber).join(' × ');

/**
 * What the opened file contains.
 * @param {{facts: import('../hooks/useSplatViewer.js').SplatFacts}} props
 */
export default function SplatFacts({ facts }) {
  const { header } = facts;
  return (
    <section className="tool" aria-labelledby="facts-heading">
      <h2 className="tool__summary" id="facts-heading">
        File
      </h2>
      <dl className="facts">
        <dt>Name</dt>
        <dd>{facts.name}</dd>
        <dt>Format</dt>
        <dd>{facts.formatLabel}</dd>
        <dt>Size</dt>
        <dd>{formatBytes(facts.fileBytes)}</dd>
        <dt>Splats</dt>
        <dd>{formatCount(facts.numSplats)}</dd>
        <dt>Extent</dt>
        <dd
          title={`Bounding box of the central ${CORE_FRACTION * 100} % of splat centres per axis (x × y × z, file axes)`}
        >
          {size(facts.coreSize)} units
        </dd>
        <dt>Full extent</dt>
        <dd title="Bounding box of all splat centres, including floaters">
          {size(facts.fullSize)} units
        </dd>
        <dt>Opened in</dt>
        <dd>{facts.loadSeconds.toFixed(2)} s</dd>
        {header && (
          <>
            <dt>PLY encoding</dt>
            <dd>
              {header.format}
              {header.compressed && ' (compressed)'}
            </dd>
            <dt>SH degree</dt>
            <dd>{header.shDegree ?? 'unknown'}</dd>
            <dt>Per splat</dt>
            <dd>{header.properties.length} properties</dd>
          </>
        )}
      </dl>
      {header && (
        <details className="tool__details">
          <summary>PLY properties</summary>
          <p className="tool__note tool__mono">
            {header.properties.map(({ type, name }) => `${type} ${name}`).join(', ')}
          </p>
        </details>
      )}
      <p className="tool__note">
        Units are the file&apos;s own: metres only if the capture was scaled.
      </p>
    </section>
  );
}
