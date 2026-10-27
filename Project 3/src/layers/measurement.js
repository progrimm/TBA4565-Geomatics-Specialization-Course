import { ArcType, Color, ColorMaterialProperty, CustomDataSource } from 'cesium';

const LINE_COLOR = Color.fromCssColorString('#f5a623');

/**
 * Entities that draw the measured points and the straight line between them.
 * Positions are ECEF (EPSG:4978) as returned by Scene.pickPosition, so they are
 * drawn exactly where they were picked (not clamped to terrain).
 * @param {import('cesium').Viewer} viewer
 * @returns {{setPoints: (points: import('cesium').Cartesian3[]) => void, destroy: () => void}}
 */
export function createMeasurementLayer(viewer) {
  const layer = new CustomDataSource('Measurement');
  viewer.dataSources.add(layer);

  return {
    setPoints(points) {
      layer.entities.removeAll();
      for (const position of points) {
        layer.entities.add({
          position,
          point: {
            pixelSize: 9,
            color: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY, // stay visible inside splats
          },
        });
      }
      if (points.length === 2) {
        layer.entities.add({
          polyline: {
            positions: points,
            width: 3,
            arcType: ArcType.NONE, // the straight 3D line, not a path along the ground
            material: new ColorMaterialProperty(LINE_COLOR),
            depthFailMaterial: new ColorMaterialProperty(LINE_COLOR.withAlpha(0.5)),
          },
        });
      }
      viewer.scene.requestRender();
    },
    destroy() {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(layer, true);
    },
  };
}

/**
 * Pick the 3D position under a screen point from the depth buffer.
 * Gaussian splats do not write depth in CesiumJS 1.146, so a click on a splat
 * returns whatever lies behind it (terrain, buildings, a mesh, the ellipsoid).
 * @param {import('cesium').Scene} scene
 * @param {import('cesium').Cartesian2} screenPosition - pixels.
 * @returns {import('cesium').Cartesian3 | undefined} ECEF position, or undefined (e.g. sky).
 */
export function pickPoint(scene, screenPosition) {
  if (!scene.pickPositionSupported) return undefined;
  return scene.pickPosition(screenPosition);
}
