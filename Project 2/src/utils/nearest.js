import { Cartographic, Ellipsoid, EllipsoidGeodesic } from 'cesium';

/**
 * @typedef {{longitude: number, latitude: number}} LonLat - WGS84 degrees.
 * @typedef {LonLat & {romnr: number, plasser: number, adresse: string}} Shelter
 */

/**
 * Geodesic distance: the shortest path between two points along the surface of
 * the WGS84 ellipsoid (Cesium's EllipsoidGeodesic, Vincenty's method). Heights
 * are ignored, so this is the "map" distance, not a 3D straight line.
 * @param {LonLat} from
 * @param {LonLat} to
 * @returns {number} distance in metres.
 */
export function geodesicDistance(from, to) {
  // EllipsoidGeodesic needs two distinct points; the distance between equal points is 0.
  if (from.longitude === to.longitude && from.latitude === to.latitude) return 0;
  const geodesic = new EllipsoidGeodesic(
    Cartographic.fromDegrees(from.longitude, from.latitude),
    Cartographic.fromDegrees(to.longitude, to.latitude),
    Ellipsoid.WGS84,
  );
  return geodesic.surfaceDistance;
}

/**
 * Find the shelter with the shortest geodesic distance to a point (linear scan;
 * fine for the few dozen shelters in Trondheim).
 * @param {LonLat} point
 * @param {Shelter[]} shelters
 * @returns {{shelter: Shelter, distance: number} | undefined} undefined if the list is empty.
 */
export function findNearest(point, shelters) {
  let nearest;
  for (const shelter of shelters) {
    const distance = geodesicDistance(point, shelter);
    if (!nearest || distance < nearest.distance) nearest = { shelter, distance };
  }
  return nearest;
}

/**
 * Number of shelters and their total capacity.
 * @param {Shelter[]} shelters
 * @returns {{count: number, capacity: number}} capacity in people.
 */
export function summarizeShelters(shelters) {
  return {
    count: shelters.length,
    capacity: shelters.reduce((sum, shelter) => sum + shelter.plasser, 0),
  };
}

/**
 * Format a distance for display: metres below 1 km, otherwise km with 2 decimals.
 * @param {number} metres
 * @returns {string}
 */
export function formatDistance(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(2)} km`;
}
