import { CORE_FRACTION } from '../config.js';
import { formatBytes, formatCount, formatNumber } from '../utils/format.js';
import Tool from './Tool.jsx';

/** An extent along the file axes, scaled into the user's unit when georeferenced. */
const size = (extent, georef) =>
  `${extent.map((value) => formatNumber(value * (georef?.scale ?? 1))).join(' × ')} ${georef ? `${georef.unit} (file axes)` : 'units'}`;

/**
 * What the opened file contains.
 * @param {{facts: import('../hooks/useSplatViewer.js').SplatFacts,
 *   georef: import('../utils/georef.js').Georeference | null}} props
 */
export default function SplatFacts({ facts, georef }) {
  const { header } = facts;
  return (
    <Tool id="facts" title="File">
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
          {size(facts.coreSize, georef)}
        </dd>
        <dt>Full extent</dt>
        <dd title="Bounding box of all splat centres, including floaters">
          {size(facts.fullSize, georef)}
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
        {georef
          ? `Scaled by the georeference: 1 file unit = ${formatNumber(georef.scale)} ${georef.unit}.`
          : 'Units are the file’s own: metres only if the capture was scaled.'}
      </p>
    </Tool>
  );
}
