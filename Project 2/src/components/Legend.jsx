import { COVERAGE, NEAREST, SHELTERS } from '../config.js';

/** Map key entries: symbol shape, colour (from config.js, so it matches the map) and label. */
const ENTRIES = [
  { shape: 'point', color: SHELTERS.style.color, label: 'Public shelter (DSB)' },
  { shape: 'line', color: NEAREST.style.color, label: 'Walking route' },
  { shape: 'area', color: NEAREST.style.passageColor, label: 'Building on the route' },
  { shape: 'point', color: NEAREST.style.pointColor, label: 'Clicked point' },
  { shape: 'point', color: NEAREST.style.outOfRangeColor, label: 'Clicked point, out of range' },
];

/** Coverage classes, shown while the walking-distance layer is on. */
const COVERAGE_ENTRIES = [
  ...COVERAGE.classes.map(({ label, color }) => ({ shape: 'area', color, label })),
  { shape: 'area', color: COVERAGE.noRouteColor, label: 'No route' },
];

/** One list of map key entries. */
function Entries({ entries, label }) {
  return (
    <ul className="legend" aria-label={label}>
      {entries.map(({ shape, color, label: text }) => (
        <li key={text} className="legend__item">
          <span
            className={`legend__symbol legend__symbol--${shape}`}
            style={{ '--symbol': color }}
            aria-hidden="true"
          />
          {text}
        </li>
      ))}
    </ul>
  );
}

/**
 * Map key: what each symbol on the map means. The symbols are decorative; the text
 * carries the meaning.
 * @param {{coverageVisible?: boolean}} props - show the walking-distance classes.
 */
export default function Legend({ coverageVisible = false }) {
  return (
    <section aria-labelledby="legend-heading">
      <h2 className="panel__heading" id="legend-heading">
        Map key
      </h2>
      <Entries entries={ENTRIES} label="Symbols" />
      {coverageVisible && (
        <>
          <p className="legend__title">Walk from home to the nearest shelter (250 m cells)</p>
          <Entries entries={COVERAGE_ENTRIES} label="Walking distance classes" />
        </>
      )}
    </section>
  );
}
