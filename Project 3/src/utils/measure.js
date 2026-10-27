import { Cartesian3, Cartographic, EllipsoidGeodesic } from 'cesium';

/**
 * Distances between two picked points.
 * @param {Cartesian3} a - ECEF (EPSG:4978) position in metres.
 * @param {Cartesian3} b - ECEF (EPSG:4978) position in metres.
 * @returns {{straight: number, horizontal: number, heightDifference: number}} metres:
 *   straight = 3D chord between the points; horizontal = geodesic distance along the
 *   WGS84 ellipsoid between their footprints (heights ignored); heightDifference =
 *   ellipsoidal height of b minus a.
 */
export function measure(a, b) {
  const start = Cartographic.fromCartesian(a);
  const end = Cartographic.fromCartesian(b);
  const sameFootprint = start.longitude === end.longitude && start.latitude === end.latitude;
  return {
    straight: Cartesian3.distance(a, b),
    // EllipsoidGeodesic is undefined for two identical footprints.
    horizontal: sameFootprint ? 0 : new EllipsoidGeodesic(start, end).surfaceDistance,
    heightDifference: end.height - start.height,
  };
}
