import { NEAREST } from '../config.js';
import { formatDistance, summarizeShelters } from '../utils/nearest.js';

const STATUS_TEXT = { loading: 'Loading shelters…', error: 'Shelter data is unavailable.' };
const NETWORK_TEXT = {
  loading: 'Walking network loading: straight-line distances for now.',
  error: 'Walking network unavailable: straight-line distances only.',
};
const numberFormat = new Intl.NumberFormat('en-GB');
/** Height in metres with one decimal, e.g. "12.3 m". */
const formatHeight = (metres) => `${metres.toFixed(1)} m`;
/** Walking time, rounded to whole minutes, e.g. "14 min". */
const formatMinutes = (seconds) => (seconds < 60 ? '< 1 min' : `${Math.round(seconds / 60)} min`);

/**
 * "Name (type)" for a building, e.g. "Trondheim Torg (retail)". `building=yes`
 * says nothing about the type, so it is left out.
 * @param {import('../utils/passages.js').PassageBuilding} building
 */
const describeBuilding = ({ name, building }) => {
  const type = building === 'yes' ? '' : building.replaceAll('_', ' ');
  if (!name) return type ? `a ${type} building` : 'a building';
  return type ? `${name} (${type})` : name;
};

/**
 * Panel section for the "Nearest shelter" analysis: shelter totals, an
 * instruction, and the result of the last ground click.
 * @param {object} props
 * @param {'loading' | 'ready' | 'error'} props.status - shelter layer status.
 * @param {'loading' | 'ready' | 'error'} props.networkStatus - walking network status.
 * @param {import('../utils/nearest.js').Shelter[]} props.shelters
 * @param {import('../hooks/useNearestShelter.js').NearestResult} [props.nearest]
 * @param {import('../hooks/useNearestShelter.js').OutOfRange} [props.outOfRange]
 * @param {import('../hooks/useNearestShelter.js').GroundHeight} [props.ground] - clicked point.
 */
export default function NearestShelter({
  status,
  networkStatus,
  shelters,
  nearest,
  outOfRange,
  ground,
}) {
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
                    <dd>
                      {formatDistance(nearest.walk.distance)}
                      {nearest.walk.seconds === undefined
                        ? ' along streets and paths'
                        : ` · ${formatMinutes(nearest.walk.seconds)}`}{' '}
                      {nearest.by === 'time' && (
                        <span className="analysis__sub">(fastest, slopes included)</span>
                      )}
                    </dd>
                  </>
                )}
                {nearest.shortest && (
                  <>
                    <dt>Shortest</dt>
                    <dd>
                      No. {nearest.shortest.shelter.romnr}:{' '}
                      {formatDistance(nearest.shortest.walk.distance)} ·{' '}
                      {formatMinutes(nearest.shortest.walk.seconds)}{' '}
                      <span className="analysis__sub">(shorter, but slower on the slopes)</span>
                    </dd>
                  </>
                )}
                {nearest.through?.length > 0 && (
                  <>
                    <dt>Through</dt>
                    <dd>
                      {nearest.through.map(describeBuilding).join('; ')}{' '}
                      <span className="analysis__note">(highlighted on the map)</span>
                    </dd>
                  </>
                )}
                <dt>Straight</dt>
                <dd>{formatDistance(nearest.distance)} (geodesic)</dd>
                <dt>Capacity</dt>
                <dd>{numberFormat.format(nearest.shelter.plasser)} people</dd>
                {ground && (
                  <>
                    <dt>Ground</dt>
                    <dd>
                      {ground.nn2000 === undefined ? (
                        `${formatHeight(ground.ellipsoidal)} above the ellipsoid`
                      ) : (
                        <>
                          {formatHeight(ground.nn2000)} NN2000{' '}
                          <span className="analysis__sub">
                            (ellipsoidal {formatHeight(ground.ellipsoidal)} − geoid{' '}
                            {formatHeight(ground.geoid)})
                          </span>
                        </>
                      )}
                    </dd>
                  </>
                )}
              </dl>
            ) : (
              <p className={`analysis__hint${outOfRange ? ' analysis__hint--danger' : ''}`}>
                {outOfRange
                  ? 'Out of range: no walking route from there.'
                  : 'Click the ground to find the nearest shelter.'}
              </p>
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
