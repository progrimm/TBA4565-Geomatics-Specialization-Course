import { ELLIPSOID_VIEW } from '../config.js';
import Tool from './Tool.jsx';

/**
 * Ellipsoid view: a slider from the normal render to opaque, hard-edged splats, to show how the
 * Gaussians are spread (sizes, shapes, density, floaters).
 * @param {{amount: number, onAmount: (amount: number) => void}} props
 */
export default function EllipsoidTool({ amount, onAmount }) {
  return (
    <Tool id="ellipsoids" title="Ellipsoid view">
      <label className="range">
        Opaque ellipsoids: {Math.round(amount * 100)} %
        <input
          type="range"
          min="0"
          max="1"
          step={ELLIPSOID_VIEW.step}
          value={amount}
          onChange={(event) => onAmount(Number(event.target.value))}
        />
      </label>
      <p className="tool__note">
        Towards 100 % every splat is drawn opaque with a hard edge at its 1σ ellipse, so you see the
        individual Gaussians instead of the blended image. Only this pane; PSNR/SSIM always use the
        normal render.
      </p>
    </Tool>
  );
}
