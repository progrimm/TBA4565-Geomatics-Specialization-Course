import { useState } from 'react';
import { EVALUATION } from '../config.js';
import { histogramStats } from '../utils/metrics.js';
import ErrorHistogram from './ErrorHistogram.jsx';

/** An error level (0–255) as a share of the range. */
const percent = (level) => (Number.isFinite(level) ? `${((level / 255) * 100).toFixed(1)} %` : '–');
const signed = (value) =>
  Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}` : '–';
const db = (value) => (Number.isFinite(value) ? `${value.toFixed(2)} dB` : '–');
const ratio = (value) => (Number.isFinite(value) ? value.toFixed(3) : '–');

/** Error level that counts as a large error in the summary: 10 % of the range. */
const LARGE_ERROR = Math.round(0.1 * 255);

/**
 * One photo against the render in numbers: PSNR/SSIM, the error distribution (summary and
 * histogram) for the splat area or the whole photo, and the colour offset render − photo.
 * @param {{detail: import('../hooks/useEvaluation.js').PhotoDetail, role: string | undefined,
 *   onShowDifference: () => void}} props
 */
export default function PhotoDetail({ detail, role, onShowDifference }) {
  const [area, setArea] = useState('splat');
  const levels = area === 'splat' ? detail.histogramSplat : detail.histogram;
  const stats = histogramStats(levels, LARGE_ERROR);
  const { metrics, offset } = detail;
  const areaLabel = area === 'splat' ? 'splat area' : 'whole photo';

  return (
    <div className="photo-detail">
      <h3 className="photo-detail__title">
        {detail.name}
        {role === 'test' ? ' (test photo)' : role === 'train' ? ' (training photo)' : ''}
      </h3>
      <dl className="facts">
        <dt>PSNR</dt>
        <dd>
          {db(metrics.psnr)} whole, {db(metrics.psnrSplat)} splat area
        </dd>
        <dt>SSIM</dt>
        <dd>
          {ratio(metrics.ssim)} whole, {ratio(metrics.ssimSplat)} splat area
        </dd>
        <dt>Coverage</dt>
        <dd>{(metrics.coverage * 100).toFixed(1)} % of the photo</dd>
        <dt title="Mean of render − photo over the splat area, per channel, in 8-bit levels">
          Offset
        </dt>
        <dd>
          R {signed(offset[0])}, G {signed(offset[1])}, B {signed(offset[2])} levels
          {Number.isFinite(offset[0]) &&
            (offset[0] + offset[1] + offset[2] > 0 ? ' (render brighter)' : ' (render darker)')}
        </dd>
      </dl>
      <div className="tool__actions tool__actions--spaced" role="group" aria-label="Error over">
        <span className="tool__label">Error over</span>
        {[
          ['splat', 'Splat area'],
          ['whole', 'Whole photo'],
        ].map(([id, label]) => (
          <button
            key={id}
            className="chip"
            type="button"
            aria-pressed={area === id}
            onClick={() => setArea(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <dl className="facts facts--spaced">
        <dt>Mean error</dt>
        <dd>{percent(stats.mean)}</dd>
        <dt>Median</dt>
        <dd>{percent(stats.median)}</dd>
        <dt>95th pct.</dt>
        <dd>{percent(stats.p95)}</dd>
        <dt>Error ≥ 10 %</dt>
        <dd>
          {Number.isFinite(stats.over) ? `${(stats.over * 100).toFixed(1)} % of pixels` : '–'}
        </dd>
      </dl>
      <ErrorHistogram levels={levels} caption={`Error per pixel, ${areaLabel}, ${detail.name}`} />
      <div className="tool__actions tool__actions--spaced">
        <button className="chip" type="button" onClick={onShowDifference}>
          Show difference in the pane
        </button>
      </div>
      <p className="tool__note">
        Error per pixel = mean |render − photo| over R, G, B, as a share of the 0–255 range. In the
        difference image, white is ≥ {Math.round(100 / EVALUATION.differenceGain)} %; hover it for
        the values of single pixels.
      </p>
    </div>
  );
}
