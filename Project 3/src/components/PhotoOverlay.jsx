import { useEffect, useRef, useState } from 'react';
import { fitRect } from '../utils/photoCamera.js';

/**
 * The photo over a pane in photo view, in the same letterboxed rectangle as the render (see
 * photoProjection), shown as the comparison mode asks: an outline only, the photo, a swipe
 * (photo left of the line) or a blend.
 * @param {{url: string | null, width: number, height: number, name: string, note: string | null,
 *   mode: string, amount: number, onAmount: (amount: number) => void}} props
 *   url: the photo, or in difference mode the difference image (null while computing).
 */
export default function PhotoOverlay({ url, width, height, name, note, mode, amount, onAmount }) {
  const ref = useRef(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    const parent = ref.current.parentElement;
    const observer = new ResizeObserver(() =>
      setView({ w: parent.clientWidth, h: parent.clientHeight }),
    );
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const rect = view && fitRect(width, height, view.w, view.h);
  const pct = (fraction) => `${fraction * 100}%`;
  const showPhoto = url && mode !== 'splat';

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const frame = handle.parentElement.getBoundingClientRect();
    const onMove = (move) =>
      onAmount(Math.min(1, Math.max(0, (move.clientX - frame.left) / frame.width)));
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  };

  return (
    <div ref={ref} className="photo-overlay">
      {rect && (
        <div
          className="photo-overlay__frame"
          style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
        >
          {showPhoto && (
            <img
              className="photo-overlay__image"
              src={url}
              alt={`Photo ${name}`}
              style={{
                opacity: mode === 'blend' ? amount : 1,
                clipPath: mode === 'swipe' ? `inset(0 ${pct(1 - amount)} 0 0)` : undefined,
              }}
            />
          )}
          {showPhoto && mode === 'swipe' && (
            <div
              className="photo-overlay__handle"
              style={{ left: pct(amount) }}
              onPointerDown={onPointerDown}
              aria-hidden="true"
            />
          )}
          <span className="photo-overlay__tag">
            {name}
            {note && ` · ${note}`}
            {!url && (mode === 'difference' ? ' (computing…)' : ' (image file not found)')}
          </span>
        </div>
      )}
    </div>
  );
}
