import { useState } from 'react';
import { usePerformance } from '../hooks/usePerformance.js';
import { formatBytes } from '../utils/format.js';

/** @param {number | undefined} ms */
const seconds = (ms) => (ms === undefined ? '…' : `${(ms / 1000).toFixed(2)} s`);

/**
 * Performance panel: frame rate, tileset memory, loaded tiles and load times of
 * the selected splat. Sampling only runs while the section is open.
 * @param {object} props
 * @param {import('cesium').Viewer | undefined} props.viewer
 * @param {import('cesium').Cesium3DTileset | undefined} props.tileset
 */
export default function PerformancePanel({ viewer, tileset }) {
  const [open, setOpen] = useState(false);
  const sample = usePerformance(viewer, tileset, open);

  return (
    <details className="tool" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="tool__summary">Performance</summary>
      {sample ? (
        <dl className="facts" aria-live="off">
          <dt>Frame rate</dt>
          <dd>
            {sample.fps.toFixed(0)} fps (worst frame {sample.worstFrameMs.toFixed(0)} ms)
          </dd>
          {sample.heapBytes !== undefined && (
            <>
              <dt>JS heap</dt>
              <dd>{formatBytes(sample.heapBytes)}</dd>
            </>
          )}
          {sample.stats && (
            <>
              <dt>Memory</dt>
              <dd>{formatBytes(sample.memoryBytes)} (tileset)</dd>
              <dt>Tiles loaded</dt>
              <dd>{sample.stats.tilesLoaded}</dd>
              <dt>tileset.json</dt>
              <dd>{seconds(sample.stats.readyMs)}</dd>
              <dt>First view</dt>
              <dd>{seconds(sample.stats.initialTilesMs)}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="tool__note">Measuring…</p>
      )}
      <p className="tool__note">
        While this section is open the scene renders continuously, so the frame rate shows what the
        GPU sustains. Times count from the splat request: tileset.json ready, and all tiles of the
        first view loaded (initialTilesLoaded). Memory is Cesium3DTileset.totalMemoryUsageInBytes.
      </p>
    </details>
  );
}
