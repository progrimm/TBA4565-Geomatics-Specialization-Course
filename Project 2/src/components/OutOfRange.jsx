import { useEffect, useId, useRef } from 'react';
import { NEAREST } from '../config.js';
import { formatDistance } from '../utils/nearest.js';

/**
 * Popup shown instead of a route when a click is out of the walking network's
 * range (see findWalkInRange in utils/network.js). Not modal: the map stays usable,
 * and the next click replaces or closes it. Focus moves to the close button so
 * keyboard and screen-reader users notice it; Escape closes it.
 * @param {object} props
 * @param {import('../hooks/useNearestShelter.js').OutOfRange} [props.outOfRange]
 * @param {() => void} props.onClose
 */
export default function OutOfRange({ outOfRange, onClose }) {
  const buttonRef = useRef(null);
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    if (!outOfRange) return undefined;
    buttonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [outOfRange, onClose]);

  if (!outOfRange) return null;
  const { reason, connector } = outOfRange;

  return (
    <div className="popup-layer">
      <div
        className="popup"
        role="alertdialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={textId}
      >
        <p className="popup__kicker">No route</p>
        <h2 className="popup__title" id={titleId}>
          Good luck, champ. You won’t make it…
        </h2>
        <p className="popup__text" id={textId}>
          {reason === 'far'
            ? `That spot is ${formatDistance(connector)} from the nearest mapped path. Routes start at most ${NEAREST.maxConnector} m from the walking network.`
            : 'No path from there reaches a shelter: that part of the network is cut off.'}{' '}
          Pick a spot on a street or path.
        </p>
        <button ref={buttonRef} type="button" className="popup__button" onClick={onClose}>
          Try again
        </button>
      </div>
    </div>
  );
}
