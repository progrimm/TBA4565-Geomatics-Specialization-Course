import { NEAREST, SHELTERS } from '../config.js';

/** Map key entries: symbol shape, colour (from config.js, so it matches the map) and label. */
const ENTRIES = [
  { shape: 'point', color: SHELTERS.style.color, label: 'Public shelter (DSB)' },
  { shape: 'line', color: NEAREST.style.color, label: 'Walking route' },
  { shape: 'area', color: NEAREST.style.passageColor, label: 'Building on the route' },
  { shape: 'point', color: NEAREST.style.pointColor, label: 'Clicked point' },
  { shape: 'point', color: NEAREST.style.outOfRangeColor, label: 'Clicked point, out of range' },
];

/**
 * Map key: what each symbol on the map means. The symbols are decorative; the text
 * carries the meaning.
 */
export default function Legend() {
  return (
    <section aria-labelledby="legend-heading">
      <h2 className="panel__heading" id="legend-heading">
        Map key
      </h2>
      <ul className="legend">
        {ENTRIES.map(({ shape, color, label }) => (
          <li key={label} className="legend__item">
            <span
              className={`legend__symbol legend__symbol--${shape}`}
              style={{ '--symbol': color }}
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
