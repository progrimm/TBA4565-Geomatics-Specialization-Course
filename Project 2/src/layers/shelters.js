import {
  Cartographic,
  Math as CesiumMath,
  Color,
  GeoJsonDataSource,
  HeightReference,
  JulianDate,
} from 'cesium';
import { SHELTERS } from '../config.js';
import { showMessage } from '../state/messages.js';
import { withFetchDate } from '../utils/credit.js';
import { toDescriptionTable } from '../utils/html.js';

/**
 * Turn a GeoJSON point Entity into a ground-clamped point with an InfoBox description.
 * @param {import('cesium').Entity} entity
 */
function styleShelter(entity) {
  const { romnr, plasser, adresse } = entity.properties;
  const { pixelSize, color, outlineColor, outlineWidth } = SHELTERS.style;

  entity.name = `Public shelter ${romnr.getValue()}`;
  entity.description = toDescriptionTable([
    ['Shelter no.', romnr.getValue()],
    ['Capacity (people)', plasser.getValue()],
    ['Address', adresse.getValue()],
  ]);
  entity.billboard = undefined; // replace the default pin marker
  entity.point = {
    pixelSize,
    color: Color.fromCssColorString(color),
    outlineColor: Color.fromCssColorString(outlineColor),
    outlineWidth,
    // Data has no height: place the point on the terrain surface.
    heightReference: HeightReference.CLAMP_TO_GROUND,
    // Draw on top of terrain and buildings so points are never hidden.
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  };
}

/**
 * Plain shelter records (position + attributes) for analysis code in utils/.
 * @param {GeoJsonDataSource} dataSource - loaded by addShelters.
 * @returns {import('../utils/nearest.js').Shelter[]} WGS84 lon/lat in degrees.
 */
export function toShelterRecords(dataSource) {
  // GeoJSON points have constant positions, so any time works.
  const time = JulianDate.now();
  return dataSource.entities.values.map((entity) => {
    const { longitude, latitude } = Cartographic.fromCartesian(entity.position.getValue(time));
    const { romnr, plasser, adresse } = entity.properties.getValue(time);
    return {
      longitude: CesiumMath.toDegrees(longitude),
      latitude: CesiumMath.toDegrees(latitude),
      romnr,
      plasser,
      adresse,
    };
  });
}

/**
 * Load DSB public shelters as clickable Entities.
 * @param {import('cesium').Viewer} viewer
 * @returns {Promise<GeoJsonDataSource | undefined>} the data source, or undefined if loading failed.
 */
export async function addShelters(viewer) {
  const hideLoading = showMessage('Loading shelters…');
  try {
    // Fetch the JSON ourselves to read the fetch date from its `metadata` member.
    const response = await fetch(SHELTERS.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const geojson = await response.json();
    const dataSource = await GeoJsonDataSource.load(geojson, {
      credit: withFetchDate(SHELTERS.credit, geojson.metadata),
    });
    // The viewer may have been destroyed while loading (e.g. React StrictMode remount).
    if (viewer.isDestroyed()) return undefined;
    dataSource.entities.values.forEach(styleShelter);
    await viewer.dataSources.add(dataSource);
    return dataSource;
  } catch (error) {
    console.error('Shelters failed to load:', error);
    showMessage('Shelter data could not be loaded.', 'error');
    return undefined;
  } finally {
    hideLoading();
  }
}
