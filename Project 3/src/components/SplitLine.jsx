/**
 * Vertical line over the map where the swipe comparison splits the scene.
 * Purely visual: the position is set with the range input in the panel.
 * @param {{position: number}} props - fraction of the canvas width (0–1).
 */
export default function SplitLine({ position }) {
  return <div className="split-line" style={{ left: `${position * 100}%` }} aria-hidden="true" />;
}
