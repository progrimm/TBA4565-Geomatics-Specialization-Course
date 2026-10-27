import { toCameraOptions } from '../utils/camera.js';
import { flightDuration } from '../utils/motion.js';

/**
 * One button per preset camera view; clicking flies the camera there.
 * @param {object} props
 * @param {import('cesium').Camera} [props.camera]
 * @param {Record<string, {label: string}>} props.views - CAMERA_VIEWS from config.js.
 */
export default function ViewButtons({ camera, views }) {
  const flyTo = (view) => {
    camera.flyTo({ ...toCameraOptions(view), duration: flightDuration() });
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
