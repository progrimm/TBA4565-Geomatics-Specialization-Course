import { useRef } from 'react';
import { COMPARE_MODES, PHOTOS } from '../config.js';

/**
 * The photos of the COLMAP capture: open a folder, train/test split, choose a photo to look
 * through, and how to compare it with the splat.
 * @param {{photos: ReturnType<typeof import('../hooks/usePhotos.js').usePhotos>,
 *   onSelect: (name: string) => void}} props
 */
export default function PhotosTool({ photos, onSelect }) {
  const inputRef = useRef(null);
  const { capture, loading, holdOut, setHoldOut, selected, visible, setVisible } = photos;
  const { compare, setCompare } = photos;
  const list = photos.photos;
  const index = selected ? list.findIndex((photo) => photo.name === selected.name) : -1;
  const step = (delta) => {
    if (list.length === 0) return;
    onSelect(list[(index + delta + list.length) % list.length].name);
  };
  const tests = list.filter((photo) => photo.role === 'test').length;

  return (
    <section className="tool" aria-labelledby="photos-heading">
      <h2 className="tool__summary" id="photos-heading">
        Photos (COLMAP)
      </h2>
      <input
        ref={inputRef}
        type="file"
        hidden
        webkitdirectory=""
        onChange={(event) => {
          const { files } = event.target;
          photos.open(files).finally(() => {
            event.target.value = '';
          });
        }}
      />
      <div className="tool__actions">
        <button
          className="chip"
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? 'Reading…' : capture ? 'Open another folder' : 'Open COLMAP folder'}
        </button>
      </div>
      {!capture && (
        <p className="tool__note">
          Choose the undistorted workspace the splat was trained from, e.g. <code>dense/</code> with{' '}
          <code>sparse/</code> and <code>images/</code>. Read in this browser; nothing is uploaded.
        </p>
      )}
      {capture && (
        <>
          <p className="tool__note">
            {capture.folder}: {list.length} photos, {capture.cameraModel} {capture.size.width} ×{' '}
            {capture.size.height} px
            {capture.missing > 0 && `; ${capture.missing} image files not found`}.
          </p>
          <div className="tool__actions tool__actions--spaced">
            <label className="tool__label" htmlFor="hold-out">
              Test photos: every
            </label>
            <input
              id="hold-out"
              className="number-input"
              type="number"
              min="0"
              max={PHOTOS.maxHoldOut}
              value={holdOut}
              onChange={(event) => {
                const value = Math.round(Number(event.target.value));
                setHoldOut(Math.min(PHOTOS.maxHoldOut, Math.max(0, value || 0)));
              }}
            />
            <span className="tool__label">th (0 = none)</span>
          </div>
          <p className="tool__note">
            {tests > 0
              ? `${tests} test and ${list.length - tests} training photos, by sorted name (index 0, ${holdOut}, ${2 * holdOut}, …). Set it as in training.`
              : 'All photos are training photos. Views between them are novel views without a photo to compare.'}
          </p>
          <div className="tool__actions tool__actions--spaced">
            <button
              className="chip"
              type="button"
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              Show cameras
            </button>
            <button
              className="chip"
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
            >
              ←
            </button>
            <button className="chip" type="button" onClick={() => step(1)} aria-label="Next photo">
              →
            </button>
          </div>
          <select
            className="photo-list"
            size={6}
            aria-label="Photo to look through"
            value={selected?.name ?? ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            {list.map((photo) => (
              <option key={photo.name} value={photo.name}>
                {photo.name}
                {photo.role === 'test' ? ' · test' : ''}
                {photo.file ? '' : ' · no image'}
              </option>
            ))}
          </select>
          <div className="tool__actions tool__actions--spaced" role="group" aria-label="Compare">
            <span className="tool__label">Compare</span>
            {COMPARE_MODES.map(({ id, label }) => (
              <button
                key={id}
                className="chip"
                type="button"
                aria-pressed={compare.mode === id}
                onClick={() => setCompare({ ...compare, mode: id })}
              >
                {label}
              </button>
            ))}
          </div>
          {(compare.mode === 'swipe' || compare.mode === 'blend') && (
            <label className="range">
              {compare.mode === 'swipe' ? 'Swipe position' : 'Photo opacity'}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={compare.amount}
                onChange={(event) => setCompare({ ...compare, amount: Number(event.target.value) })}
              />
            </label>
          )}
          <p className="tool__note">
            Choosing a photo puts the active pane (all panes when linked) at the photo&apos;s
            camera. Orbiting leaves the photo view. Camera colours: blue training, pink test, white
            chosen.
          </p>
        </>
      )}
    </section>
  );
}
