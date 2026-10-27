import { inspectTileset } from '../utils/georef.js';
import { formatDegrees, formatDistance, formatSigned } from '../utils/format.js';

/**
 * Georeferencing inspector: decodes the selected tileset's root transform.
 * @param {object} props
 * @param {import('cesium').Cesium3DTileset} props.tileset
 */
export default function Inspector({ tileset }) {
  const { root, offset, radius, centreHeight } = inspectTileset(tileset);

  return (
    <details className="tool">
      <summary className="tool__summary">Georeferencing</summary>
      {root.atEarthCentre ? (
        <p className="tool__note">
          No root transform: the tile content is stored directly in ECEF coordinates.
        </p>
      ) : (
        <dl className="facts">
          <dt>Origin lat</dt>
          <dd>{formatDegrees(root.latitude, 6)}</dd>
          <dt>Origin lon</dt>
          <dd>{formatDegrees(root.longitude, 6)}</dd>
          <dt>Origin h</dt>
          <dd>{formatDistance(root.height)} (ellipsoidal)</dd>
          <dt>Axes vs ENU</dt>
          <dd>
            {formatDegrees(root.rotationAboutUp)} about Up, tilt {formatDegrees(root.tilt)}
          </dd>
          <dt>Scale</dt>
          <dd>
            {[root.scale.x, root.scale.y, root.scale.z]
              .map((value) => value.toFixed(4))
              .join(' × ')}
          </dd>
          <dt>Bounds</dt>
          <dd>
            sphere r = {formatDistance(radius)}, centre h = {formatDistance(centreHeight)}
          </dd>
          {offset && (
            <>
              <dt>Offset</dt>
              <dd>
                E {formatSigned(offset.east)}, N {formatSigned(offset.north)}, U{' '}
                {formatSigned(offset.up)}
              </dd>
            </>
          )}
        </dl>
      )}
      <p className="tool__note">
        Coordinate chain: splat positions are local metres (glTF). The root transform, a 4×4
        rotation + translation, maps them to ECEF (EPSG:4978, metres from the Earth&apos;s centre).
        On the WGS 84 ellipsoid, ECEF converts to longitude, latitude and ellipsoidal height
        (EPSG:4979). Heights are above the ellipsoid, not above sea level.
      </p>
    </details>
  );
}
