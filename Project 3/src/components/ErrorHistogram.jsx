import { useState } from 'react';
import { formatCount } from '../utils/format.js';

/** 1 % wide bins of the error (share of the 0–255 range), the last one open-ended. */
const BIN_COUNT = 30;
const WIDTH = 260;
const HEIGHT = 120;
const MARGIN = { top: 8, right: 12, bottom: 18, left: 30 };
const GAP = 2;

/** Counts per 8-bit error level → counts per 1 % bin (0–1 %, …, 29–30 %, ≥ 30 %). */
function toBins(levels) {
  const bins = new Array(BIN_COUNT + 1).fill(0);
  levels.forEach((n, level) => {
    bins[Math.min(BIN_COUNT, Math.floor((level / 255) * 100))] += n;
  });
  return bins;
}

/** A clean axis maximum (1, 2, 5 × 10^k) at or above `value`. */
function niceMax(value) {
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((step) => step * power).find((candidate) => candidate >= value);
}

const binLabel = (i) => (i === BIN_COUNT ? `≥ ${BIN_COUNT} %` : `${i}–${i + 1} %`);

/**
 * Histogram of the per-pixel error (mean |render − photo| over R, G, B), as the share of
 * pixels per 1 % bin. Hovering a bar shows its value; a hidden table carries all values.
 * @param {{levels: Uint32Array, caption: string}} props - levels: counts per 8-bit level.
 */
export default function ErrorHistogram({ levels, caption }) {
  const [hovered, setHovered] = useState(null);
  const bins = toBins(levels);
  const total = bins.reduce((sum, n) => sum + n, 0);
  if (total === 0) return <p className="tool__note">No pixels to show.</p>;
  const shares = bins.map((n) => (n / total) * 100);
  const yMax = niceMax(Math.max(...shares));
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const slot = plotW / bins.length;
  const barW = Math.min(24, slot - GAP);
  const y = (share) => MARGIN.top + plotH * (1 - share / yMax);
  const baseline = MARGIN.top + plotH;

  return (
    <figure className="histogram">
      <figcaption className="histogram__caption">{caption}</figcaption>
      <p className="histogram__readout" aria-live="polite">
        {hovered === null
          ? 'Hover a bar for its value.'
          : `Error ${binLabel(hovered)}: ${shares[hovered].toFixed(2)} % of pixels (${formatCount(bins[hovered])})`}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="histogram__chart"
        role="img"
        aria-label={`${caption}. Share of pixels per 1 % error bin; full values in the table below.`}
        onPointerLeave={() => setHovered(null)}
      >
        {[0, yMax / 2, yMax].map((tick) => (
          <g key={tick}>
            <line
              className="histogram__grid"
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="histogram__tick" x={MARGIN.left - 4} y={y(tick) + 3} textAnchor="end">
              {tick} %
            </text>
          </g>
        ))}
        {shares.map((share, i) => {
          const x = MARGIN.left + i * slot + (slot - barW) / 2;
          const top = y(share);
          const r = Math.min(2, barW / 2, baseline - top);
          return (
            <g key={i} onPointerEnter={() => setHovered(i)}>
              {share > 0 && (
                // Rounded data end, square at the baseline.
                <path
                  className={`histogram__bar${hovered === i ? ' histogram__bar--hover' : ''}`}
                  d={`M${x},${baseline} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${baseline} Z`}
                />
              )}
              {/* Hit target: the whole slot, taller than the bar. */}
              <rect
                x={MARGIN.left + i * slot}
                y={MARGIN.top}
                width={slot}
                height={plotH}
                fill="transparent"
              />
            </g>
          );
        })}
        {[0, 10, 20, BIN_COUNT].map((value) => (
          <text
            key={value}
            className="histogram__tick"
            x={MARGIN.left + (value + 0.5) * slot}
            y={HEIGHT - 4}
            textAnchor="middle"
          >
            {value === BIN_COUNT ? `≥${value}` : value}
          </text>
        ))}
      </svg>
      <p className="histogram__axis">Error per pixel, % of the 0–255 range</p>
      {/* In a div: a table ignores a 1 px width and would widen the panel. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Error</th>
              <th scope="col">Share of pixels</th>
            </tr>
          </thead>
          <tbody>
            {shares.map((share, i) => (
              <tr key={i}>
                <th scope="row">{binLabel(i)}</th>
                <td>{share.toFixed(2)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
