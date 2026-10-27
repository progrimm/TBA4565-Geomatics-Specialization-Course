import { NEAREST } from '../config.js';
import { formatDistance, summarizeShelters } from '../utils/nearest.js';

const STATUS_TEXT = { loading: 'Loading shelters…', error: 'Shelter data is unavailable.' };
const NETWORK_TEXT = {
  loading: 'Walking network loading: straight-line distances for now.',
  error: 'Walking network unavailable: straight-line distances only.',
};
const numberFormat = new Intl.NumberFormat('en-GB');

/**
 * Panel section for the "Nearest shelter" analysis: shelter totals, an
 * instruction, and the result of the last ground click.
 * @param {object} props
 * @param {'loading' | 'ready' | 'error'} props.status - shelter layer status.
 * @param {'loading' | 'ready' | 'error'} props.networkStatus - walking network status.
 * @param {import('../utils/nearest.js').Shelter[]} props.shelters
 * @param {import('../hooks/useNearestShelter.js').NearestResult} [props.nearest]
 */
export default function NearestShelter({ status, networkStatus, shelters, nearest }) {
  const { count, capacity } = summarizeShelters(shelters);

  return (
    <section aria-labelledby="nearest-heading">
      <h2 className="panel__heading" id="nearest-heading">
        Nearest shelter
      </h2>
      {status === 'ready' ? (
        <div className="analysis">
          <p className="analysis__totals">
            {numberFormat.format(count)} public shelters · {numberFormat.format(capacity)} places in
            total
          </p>
          <div aria-live="polite">
            {nearest ? (
              <dl className="analysis__result">
                <dt>Shelter</dt>
                <dd>
                  No. {nearest.shelter.romnr}, {nearest.shelter.adresse}
                </dd>
                {nearest.walk && (
                  <>
                    <dt>Walk</dt>
                    <dd>{formatDistance(nearest.walk.distance)} along streets and paths</dd>
                  </>
                )}
                <dt>Straight</dt>
                <dd>{formatDistance(nearest.distance)} (geodesic)</dd>
                <dt>Capacity</dt>
                <dd>{numberFormat.format(nearest.shelter.plasser)} people</dd>
              </dl>
            ) : (
              <p className="analysis__hint">Click the ground to find the nearest shelter.</p>
            )}
          </div>
          {networkStatus === 'ready' ? (
            <p className="analysis__credit">{NEAREST.network.credit}</p>
          ) : (
            <p className="analysis__hint">{NETWORK_TEXT[networkStatus]}</p>
          )}
        </div>
      ) : (
        <p className="analysis__hint">{STATUS_TEXT[status]}</p>
      )}
    </section>
  );
}
