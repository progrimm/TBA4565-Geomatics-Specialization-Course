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
          {reason === 'far' ? 'Outside the walking network' : 'No path to a shelter'}
        </h2>
        <p className="popup__text" id={textId}>
          {reason === 'far'
            ? `This point is ${formatDistance(connector)} from the nearest mapped path (limit ${NEAREST.maxConnector} m).`
            : 'The paths at this point are not connected to any shelter in the network.'}{' '}
          Choose a point on or near a street or path.
        </p>
        <button ref={buttonRef} type="button" className="popup__button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
