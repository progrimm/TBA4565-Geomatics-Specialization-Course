import { toCameraOptions } from '../utils/camera.js';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * One button per preset camera view; clicking flies the camera there.
 * @param {{camera?: import('cesium').Camera, views: Record<string, {label: string}>}} props
 */
export default function ViewButtons({ camera, views }) {
  const flyTo = (view) => {
    // Duration 0 = jump instantly; undefined = Cesium picks a duration from the distance.
    const duration = window.matchMedia(REDUCED_MOTION).matches ? 0 : undefined;
    camera.flyTo({ ...toCameraOptions(view), duration });
  };

  return (
    <section aria-labelledby="views-heading">
      <h2 className="panel__heading" id="views-heading">
        Views
      </h2>
      <div className="views">
        {Object.entries(views).map(([key, view]) => (
          <button
            key={key}
            type="button"
            className="view-button"
            disabled={!camera}
            onClick={() => flyTo(view)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </section>
  );
}
