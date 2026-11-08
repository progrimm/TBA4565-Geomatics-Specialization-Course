import proj4 from 'proj4';

/** EUREF89 / UTM zone 32N. EUREF89 ≈ ETRS89, treated as equal to WGS84 (sub-metre difference). */
const EPSG_25832 = '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
/**
 * EUREF89 / UTM zone 33N, the CRS of Statistics Norway's statistical grid. SSB's API labels
 * it EPSG:32633 (WGS 84 / UTM 33N); the two differ by under a metre, treated as equal.
 */
const EPSG_25833 = '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const WGS84 = 'EPSG:4326';

/**
 * Convert EUREF89 / UTM32 (EPSG:25832) to WGS84 longitude/latitude.
 * Horizontal only: heights (NN2000 or ellipsoidal) are not touched.
 * @param {number} east - easting in metres.
 * @param {number} north - northing in metres.
 * @returns {[number, number]} [longitude, latitude] in degrees (GeoJSON axis order).
 */
export function utm32ToWgs84(east, north) {
  return proj4(EPSG_25832, WGS84, [east, north]);
}

/**
 * Convert EUREF89 / UTM33 (EPSG:25833) to WGS84 longitude/latitude. Horizontal only.
 * Trondheim lies in zone 32, so zone-33 grid lines are rotated about 4° from true north
 * there (meridian convergence): a grid square is not a lon/lat rectangle.
 * @param {number} east - easting in metres.
 * @param {number} north - northing in metres.
 * @returns {[number, number]} [longitude, latitude] in degrees (GeoJSON axis order).
 */
export function utm33ToWgs84(east, north) {
  return proj4(EPSG_25833, WGS84, [east, north]);
}

/**
 * Convert WGS84 longitude/latitude to EUREF89 / UTM32 (EPSG:25832). Horizontal only.
 * @param {number} longitude - degrees.
 * @param {number} latitude - degrees.
 * @returns {[number, number]} [east, north] in metres.
 */
export function wgs84ToUtm32(longitude, latitude) {
  return proj4(WGS84, EPSG_25832, [longitude, latitude]);
}
