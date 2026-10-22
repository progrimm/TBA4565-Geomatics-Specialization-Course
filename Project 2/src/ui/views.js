import { toCameraOptions } from '../utils/camera.js';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Render one button per preset camera view; clicking flies the camera there.
 * @param {HTMLElement} container
 * @param {import('cesium').Camera} camera
 * @param {Record<string, {label: string}>} views - CAMERA_VIEWS from config.js.
 */
export function renderViewButtons(container, camera, views) {
  for (const view of Object.values(views)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'view-button';
    button.textContent = view.label;
    button.addEventListener('click', () => {
      // Duration 0 = jump instantly; undefined = Cesium picks a duration from the distance.
      const duration = window.matchMedia(REDUCED_MOTION).matches ? 0 : undefined;
      camera.flyTo({ ...toCameraOptions(view), duration });
    });
    container.append(button);
  }
}
