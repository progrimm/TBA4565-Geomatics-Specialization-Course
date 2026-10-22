import proj4 from 'proj4';

/** EUREF89 / UTM zone 32N. EUREF89 ≈ ETRS89, treated as equal to WGS84 (sub-metre difference). */
const EPSG_25832 = '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
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
