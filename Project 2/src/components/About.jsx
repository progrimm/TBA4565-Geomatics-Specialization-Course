import { useEffect, useId, useRef } from 'react';
import {
  CONCEPTS,
  DATA_SOURCES,
  LIMITATIONS,
  QUESTION,
  formatDate,
  keyResults,
} from '../content/about.js';
import { useAboutFacts } from '../hooks/useAboutFacts.js';
import { GEOID_GRID } from '../utils/geoidGrid.js';

const README_URL =
  'https://github.com/progrimm/TBA4565-Geomatics-Specialization-Course/tree/main/Project%202#readme';
const numberFormat = new Intl.NumberFormat('en-GB');

/** One data source as a definition list. */
function DataSource({ source, dates }) {
  const date = source.date && formatDate(dates[source.date]);
  return (
    <li className="about__card">
      <h4 className="about__card-title">{source.name}</h4>
      <dl className="about__facts">
        <dt>Provider</dt>
        <dd>{source.provider}</dd>
        <dt>Format</dt>
        <dd>{source.format}</dd>
        <dt>CRS</dt>
        <dd>{source.crs}</dd>
        <dt>Date</dt>
        <dd>{source.date ? (date ? `${source.dateLabel} ${date}` : 'unavailable') : 'streamed'}</dd>
        <dt>Used for</dt>
        <dd>{source.use}</dd>
        <dt>Licence</dt>
        <dd>
          <a href={source.licence.url}>{source.licence.name}</a> ·{' '}
          <a href={source.source.url}>{source.source.name}</a>
        </dd>
      </dl>
    </li>
  );
}

/**
 * "How it works": a modal side sheet that explains the question, the data and its
 * sources, the GIS concepts, the key results and the limitations. A native <dialog>
 * opened with showModal(), so the browser handles the focus trap and Escape; focus
 * returns to the element that opened it.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{osmTimestamp?: string, passagesTimestamp?: string}} props.network - from useWalkingNetwork.
 * @param {{count: number, capacity: number}} props.shelterTotals
 */
export default function About({ open, onClose, network, shelterTotals }) {
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const facts = useAboutFacts(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // The dialog's close event fires for Escape, the close button and dialog.close().
  const onDialogClose = () => {
    openerRef.current?.focus();
    onClose();
  };
  // A click on the backdrop lands on the <dialog> element itself, outside its content.
  const onDialogClick = (event) => {
    if (event.target === dialogRef.current) dialogRef.current.close();
  };

  const dates = {
    sheltersFetched: facts.sheltersFetched,
    networkTimestamp: network.osmTimestamp,
    passagesTimestamp: network.passagesTimestamp,
    geoidFetched: GEOID_GRID.fetched,
    terrainChecked: facts.summary?.terrainCheck?.date,
  };

  return (
    <dialog
      ref={dialogRef}
      className="about"
      aria-labelledby={titleId}
      onClose={onDialogClose}
      onClick={onDialogClick}
    >
      <div className="about__content">
        <header className="about__header">
          <h2 className="about__title" id={titleId}>
            How it works
          </h2>
          <button
            type="button"
            className="about__close"
            aria-label="Close"
            onClick={() => dialogRef.current.close()}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </header>

        <section className="about__section">
          <h3 className="about__heading">The question</h3>
          <p>{QUESTION}</p>
        </section>

        <section className="about__section">
          <h3 className="about__heading">Data</h3>
          <ul className="about__cards">
            {DATA_SOURCES.map((source) => (
              <DataSource key={source.name} source={source} dates={dates} />
            ))}
          </ul>
        </section>

        <section className="about__section">
          <h3 className="about__heading">GIS concepts, in the order a click uses them</h3>
          <ol className="about__concepts">
            {CONCEPTS.map(({ title, text, link }) => (
              <li key={title}>
                <h4 className="about__card-title">{title}</h4>
                <p>{text}</p>
                <a href={link.url}>{link.name}</a>
              </li>
            ))}
          </ol>
        </section>

        <section className="about__section">
          <h3 className="about__heading">Key results</h3>
          <dl className="about__facts">
            <div className="about__row">
              <dt>Shelters</dt>
              <dd>
                {shelterTotals.count > 0
                  ? `${shelterTotals.count} public shelters, ${numberFormat.format(shelterTotals.capacity)} places in total`
                  : 'not loaded'}
              </dd>
            </div>
            {facts.summary &&
              keyResults(facts.summary).map(({ label, value }) => (
                <div key={label} className="about__row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          {facts.status === 'loading' && <p className="about__note">Loading results…</p>}
          {facts.status === 'ready' && !facts.summary && (
            <p className="about__note">The analysis results could not be loaded.</p>
          )}
          {facts.summary && (
            <p className="about__note">
              From <code>scripts/analyse-grid.js</code>, run {facts.summary.generated}: the same
              search as a click, from every grid point.
            </p>
          )}
        </section>

        <section className="about__section">
          <h3 className="about__heading">Limitations</h3>
          <ul className="about__list">
            {LIMITATIONS.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>

        <p className="about__note">
          Methods, tests and measurements in full: <a href={README_URL}>the project README</a>.
        </p>
      </div>
    </dialog>
  );
}
