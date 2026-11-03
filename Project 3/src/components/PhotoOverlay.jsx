import { useEffect, useRef, useState } from 'react';
import { EVALUATION } from '../config.js';
import { fitRect } from '../utils/photoCamera.js';

const READOUT_WIDTH = 210;

/** The values of one photo pixel in the render and the photo, from an evaluated photo. */
function readPixel(detail, x, y) {
  const i = (y * detail.width + x) * 4;
  const render = [...detail.render.subarray(i, i + 3)];
  const photo = [...detail.photo.subarray(i, i + 3)];
  const error = render.reduce((sum, value, c) => sum + Math.abs(value - photo[c]), 0) / 3;
  return { x, y, render, photo, alpha: detail.render[i + 3], error };
}

/**
 * The photo over a pane in photo view, in the same letterboxed rectangle as the render (see
 * photoProjection), shown as the comparison mode asks: an outline only, the photo, a swipe
 * (photo left of the line), a blend or the difference image. With an evaluated photo
 * (detail), hovering shows the render and photo values of the pixel under the pointer.
 * @param {{url: string | null, width: number, height: number, name: string, note: string | null,
 *   mode: string, amount: number, onAmount: (amount: number) => void,
 *   detail: import('../hooks/useEvaluation.js').PhotoDetail | null}} props
 *   url: the photo, or in difference mode the difference image (null while computing).
 */
export default function PhotoOverlay({
  url,
  width,
  height,
  name,
  note,
  mode,
  amount,
  onAmount,
  detail,
}) {
  const ref = useRef(null);
  const frameRef = useRef(null);
  const [view, setView] = useState(null);
  const [readout, setReadout] = useState(null);

  // Pixel readout: the overlay lets the pointer through to the view, so listen on the pane view.
  useEffect(() => {
    if (!detail) return undefined;
    const parent = ref.current.parentElement;
    const onMove = (event) => {
      const frame = frameRef.current?.getBoundingClientRect();
      const box = parent.getBoundingClientRect();
      if (!frame) return;
      const fx = (event.clientX - frame.left) / frame.width;
      const fy = (event.clientY - frame.top) / frame.height;
      if (fx < 0 || fy < 0 || fx >= 1 || fy >= 1) {
        setReadout(null);
        return;
      }
      const left = event.clientX - box.left;
      const top = event.clientY - box.top;
      setReadout({
        ...readPixel(detail, Math.floor(fx * detail.width), Math.floor(fy * detail.height)),
        // Right of the pointer, or left of it near the right edge; always inside the pane.
        left: Math.max(
          4,
          Math.min(
            box.width - READOUT_WIDTH - 4,
            left + READOUT_WIDTH + 16 > box.width ? left - READOUT_WIDTH - 12 : left + 12,
          ),
        ),
        top: Math.min(top + 12, box.height - 90),
      });
    };
    const onLeave = () => setReadout(null);
    parent.addEventListener('pointermove', onMove);
    parent.addEventListener('pointerleave', onLeave);
    return () => {
      parent.removeEventListener('pointermove', onMove);
      parent.removeEventListener('pointerleave', onLeave);
    };
  }, [detail]);

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
          ref={frameRef}
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
          {url && mode === 'difference' && (
            <div className="photo-overlay__legend" aria-hidden="true">
              <span className="photo-overlay__ramp" />
              <span className="photo-overlay__ticks">
                <span>0</span>
                <span>{100 / EVALUATION.differenceGain / 2}</span>
                <span>≥{Math.round(100 / EVALUATION.differenceGain)} %</span>
              </span>
            </div>
          )}
          <span className="photo-overlay__tag">
            {name}
            {note && ` (${note})`}
            {!url && (mode === 'difference' ? ' (computing…)' : ' (image file not found)')}
          </span>
        </div>
      )}
      {detail && readout && (
        <div className="photo-overlay__readout" style={{ left: readout.left, top: readout.top }}>
          <strong>
            Pixel {readout.x}, {readout.y}
          </strong>
          <span>Render {readout.render.join(' ')}</span>
          <span>Photo {readout.photo.join(' ')}</span>
          <span>
            Error {((readout.error / 255) * 100).toFixed(1)} %
            {readout.alpha < EVALUATION.coverageThreshold * 255 ? ' (outside the splat area)' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
