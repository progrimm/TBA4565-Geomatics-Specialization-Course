import { useMemo } from 'react';
import { NEAREST } from '../config.js';
import { coverageFile } from '../layers/coverage.js';
import { summarizeCoverage } from '../utils/coverage.js';

const THRESHOLDS = [500, 1000, 2000];
const MINUTES = [10, 20];
const integer = new Intl.NumberFormat('en-GB');
const percent = (share) => `${(share * 100).toFixed(0)} %`;
const distance = (metres) => (metres < 1000 ? `${metres} m` : `${metres / 1000} km`);

/**
 * Panel section for the coverage analysis: how far the residents of the study area live
 * from a shelter on foot, and how many residents there are per shelter place.
 * @param {object} props
 * @param {import('../hooks/useAsyncLayer.js').LayerState} props.state - coverage layer.
 * @param {import('../utils/nearest.js').Shelter[]} props.shelters
 * @param {boolean} props.layerVisible - whether the walking-distance layer is on.
 */
export default function Coverage({ state, shelters, layerVisible }) {
  const summary = useMemo(() => {
    const file = coverageFile(state.layer);
    if (!file || shelters.length === 0) return undefined;
    const cells = file.cells.map(([, population, walk, romnr]) => ({
      population,
      walk,
      romnr,
      connector: 0,
    }));
    const residents = file.cells.reduce((sum, cell) => sum + cell[1], 0);
    const withinMinutes = MINUTES.map((minutes) => ({
      minutes,
      share:
        file.cells
          .filter((cell) => cell[4] !== null && cell[4] !== undefined && cell[4] <= minutes)
          .reduce((sum, cell) => sum + cell[1], 0) / residents,
    }));
    return {
      ...summarizeCoverage(cells, shelters, THRESHOLDS, NEAREST.maxConnector),
      withinMinutes: file.cells[0]?.length > 4 ? withinMinutes : [],
    };
  }, [state.layer, shelters]);

  return (
    <section aria-labelledby="coverage-heading">
      <h2 className="panel__heading" id="coverage-heading">
        Coverage
      </h2>
      {summary ? (
        <div className="analysis">
          <p className="analysis__totals">
            {integer.format(summary.residents)} residents in the study area (SSB 2026),{' '}
            {summary.residentsPerPlace.toFixed(1)} per shelter place.
          </p>
          <dl className="analysis__result">
            {summary.within.map(({ metres, share }) => (
              <div key={metres} className="analysis__row">
                <dt>≤ {distance(metres)}</dt>
                <dd>{percent(share)} live within this walk</dd>
              </div>
            ))}
          </dl>
          {summary.withinMinutes.length > 0 && (
            <p className="analysis__minutes">
              Walking time with slopes:{' '}
              {summary.withinMinutes
                .map(({ minutes, share }) => `${percent(share)} within ${minutes} min`)
                .join(', ')}
              .
            </p>
          )}
          <p className="analysis__credit">
            {layerVisible
              ? 'Click a cell for its residents and walk. “Whole study area” shows all of it.'
              : 'Switch on “Walking distance” to see the map.'}
          </p>
        </div>
      ) : (
        <p className="analysis__hint">
          {state.status === 'error' ? 'Coverage data is unavailable.' : 'Loading coverage…'}
        </p>
      )}
    </section>
  );
}
