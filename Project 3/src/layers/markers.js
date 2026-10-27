import {
  Cartesian2,
  Cartesian3,
  Color,
  CustomDataSource,
  DistanceDisplayCondition,
  HeightReference,
  LabelStyle,
  VerticalOrigin,
} from 'cesium';
import { MARKER_HIDE_DISTANCE } from '../config.js';
import { toDescriptionTable } from '../utils/html.js';

const ACCENT = Color.fromCssColorString('#f5a623');
// Hidden when the camera is closer than MARKER_HIDE_DISTANCE: the splat is visible there.
const FAR_ONLY = new DistanceDisplayCondition(MARKER_HIDE_DISTANCE, Number.POSITIVE_INFINITY);

/**
 * Add one globe marker per gallery splat. Entity IDs are the splat IDs, so a
 * picked marker (viewer.selectedEntity) tells which splat to open.
 * @param {import('cesium').Viewer} viewer
 * @param {import('../config.js').Splat[]} splats
 * @returns {Promise<CustomDataSource>}
 */
export function addSplatMarkers(viewer, splats) {
  const markers = new CustomDataSource('Splat gallery');
  for (const splat of splats) {
    markers.entities.add({
      id: splat.id,
      name: splat.label,
      // WGS84 lon/lat in degrees; height comes from the terrain (clamped).
      position: Cartesian3.fromDegrees(splat.marker.longitude, splat.marker.latitude),
      point: {
        pixelSize: 12,
        color: ACCENT,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        distanceDisplayCondition: FAR_ONLY,
      },
      label: {
        text: splat.label,
        font: '600 14px system-ui, sans-serif',
        style: LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 3,
        outlineColor: Color.BLACK,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian2(0, -12),
        heightReference: HeightReference.CLAMP_TO_GROUND,
        distanceDisplayCondition: FAR_ONLY,
      },
      description: toDescriptionTable([
        ['Place', `${splat.place}, ${splat.country}`],
        ['Capture', splat.capture],
        ['Data', splat.dataType],
        ['Credits', splat.credits],
      ]),
    });
  }
  return viewer.dataSources.add(markers);
}
