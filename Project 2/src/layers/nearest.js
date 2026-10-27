import {
  Cartesian3,
  Cartographic,
  Math as CesiumMath,
  Color,
  HeightReference,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from 'cesium';
import { NEAREST } from '../config.js';
import { toDescriptionTable } from '../utils/html.js';
import { formatDistance } from '../utils/nearest.js';

/**
 * Call `onClick` with the WGS84 position of every left click on the ground.
 * Clicks on objects (shelters, buildings, the drawn line) are ignored: the
 * Viewer's InfoBox handles those. Clicks on the sky are ignored too.
 * @param {import('cesium').Viewer} viewer
 * @param {(point: import('../utils/nearest.js').LonLat) => void} onClick - WGS84 degrees.
 * @returns {() => void} call to stop listening.
 */
export function onGroundClick(viewer, onClick) {
  const { scene, camera } = viewer;
  const handler = new ScreenSpaceEventHandler(scene.canvas);
  handler.setInputAction(({ position }) => {
    if (scene.pick(position)) return;
    // Intersect the camera ray through the clicked pixel with the terrain surface (ECEF).
    const ray = camera.getPickRay(position);
    const ground = ray && scene.globe.pick(ray, scene);
    if (!ground) return;
    const { longitude, latitude } = Cartographic.fromCartesian(ground);
    onClick({
      longitude: CesiumMath.toDegrees(longitude),
      latitude: CesiumMath.toDegrees(latitude),
    });
  }, ScreenSpaceEventType.LEFT_CLICK);
  return () => handler.destroy();
}

/**
 * Draw the clicked point and a ground-clamped line to its nearest shelter: the
 * walking route if there is one, otherwise a straight geodesic line.
 * @param {import('cesium').Viewer} viewer
 * @param {import('../utils/nearest.js').LonLat} point - clicked point, WGS84 degrees.
 * @param {import('../hooks/useNearestShelter.js').NearestResult} nearest
 * @returns {() => void} call to remove the drawing.
 */
export function drawNearestLine(viewer, point, { shelter, distance, walk }) {
  const { color, lineWidth, pointSize, outlineColor, outlineWidth } = NEAREST.style;
  const cesiumColor = Color.fromCssColorString(color);
  const lonLats = walk?.coordinates ?? [
    [point.longitude, point.latitude],
    [shelter.longitude, shelter.latitude],
  ];

  const entity = viewer.entities.add({
    name: `Nearest shelter: no. ${shelter.romnr}`,
    description: toDescriptionTable([
      ...(walk ? [['Walking distance', formatDistance(walk.distance)]] : []),
      ['Straight-line distance (geodesic)', formatDistance(distance)],
      ['Capacity (people)', shelter.plasser],
      ['Address', shelter.adresse],
    ]),
    position: Cartesian3.fromDegrees(point.longitude, point.latitude),
    point: {
      pixelSize: pointSize,
      color: cesiumColor,
      outlineColor: Color.fromCssColorString(outlineColor),
      outlineWidth,
      heightReference: HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    polyline: {
      positions: Cartesian3.fromDegreesArray(lonLats.flat()),
      // Draped on terrain and 3D Tiles; the default ArcType.GEODESIC joins vertices by geodesics.
      clampToGround: true,
      width: lineWidth,
      material: cesiumColor,
    },
  });
  viewer.scene.requestRender(); // requestRenderMode: adding an entity does not render by itself

  return () => {
    if (viewer.isDestroyed()) return;
    viewer.entities.remove(entity);
    viewer.scene.requestRender();
  };
}
