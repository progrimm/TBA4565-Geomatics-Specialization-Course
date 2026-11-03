import { useMemo } from 'react';
import { DIVIDER_KEY_STEP, MIN_PANE_FRACTION } from '../config.js';
import { computeLayout } from '../utils/layout.js';

const pct = (fraction) => `${fraction * 100}%`;

/** Arrow keys that move a divider, per direction: [smaller, larger]. */
const KEYS = { row: ['ArrowLeft', 'ArrowRight'], column: ['ArrowUp', 'ArrowDown'] };

/**
 * A draggable line between the two sides of a split: the ARIA "window splitter" pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/).
 * @param {{divider: ReturnType<typeof computeLayout>['dividers'][number],
 *   onRatio: (splitId: string, ratio: number) => void}} props
 */
function Divider({ divider, onRatio }) {
  const { splitId, direction, ratio, bounds } = divider;
  const row = direction === 'row';
  const style = row
    ? { left: pct(bounds.x + bounds.w * ratio), top: pct(bounds.y), height: pct(bounds.h) }
    : { top: pct(bounds.y + bounds.h * ratio), left: pct(bounds.x), width: pct(bounds.w) };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    // Pointer capture: the moves keep coming here even over a canvas or outside the window.
    handle.setPointerCapture(event.pointerId);
    const area = handle.parentElement.getBoundingClientRect();
    const onMove = (move) => {
      const fraction = row
        ? (move.clientX - area.left) / area.width
        : (move.clientY - area.top) / area.height;
      onRatio(splitId, row ? (fraction - bounds.x) / bounds.w : (fraction - bounds.y) / bounds.h);
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  const onKeyDown = (event) => {
    const step = KEYS[direction].indexOf(event.key);
    if (step === -1) return;
    event.preventDefault();
    onRatio(splitId, ratio + (step === 0 ? -DIVIDER_KEY_STEP : DIVIDER_KEY_STEP));
  };

  return (
    <div
      className={`divider divider--${direction}`}
      style={style}
      role="separator"
      tabIndex={0}
      // A divider between side-by-side panes is a vertical line.
      aria-orientation={row ? 'vertical' : 'horizontal'}
      aria-label={row ? 'Resize panes left and right' : 'Resize panes above and below'}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={Math.round(MIN_PANE_FRACTION * 100)}
      aria-valuemax={Math.round((1 - MIN_PANE_FRACTION) * 100)}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}

/**
 * The tiled area: panes as one flat keyed list (so a pane is never remounted when the tree
 * around it changes), with the dividers on top.
 * @param {{layout: import('../utils/layout.js').LayoutNode, stacked: boolean,
 *   renderPane: (id: string, rect: import('../utils/layout.js').Rect) => import('react').ReactNode,
 *   onRatio: (splitId: string, ratio: number) => void}} props
 */
export default function PaneLayout({ layout, stacked, renderPane, onRatio }) {
  const { panes, dividers } = useMemo(() => computeLayout(layout, { stacked }), [layout, stacked]);
  return (
    <div className="panes">
      {panes.map(({ id, rect }) => renderPane(id, rect))}
      {dividers.map((divider) => (
        <Divider key={divider.splitId} divider={divider} onRatio={onRatio} />
      ))}
    </div>
  );
}
