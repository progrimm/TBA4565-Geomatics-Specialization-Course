import { Color, GeoJsonDataSource, HeightReference } from 'cesium';
import { SHELTERS } from '../config.js';
import { showMessage } from '../ui/notify.js';
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
 * Load DSB public shelters as clickable Entities.
 * @param {import('cesium').Viewer} viewer
 * @returns {Promise<GeoJsonDataSource | undefined>} the data source, or undefined if loading failed.
 */
export async function addShelters(viewer) {
  const hideLoading = showMessage('Loading shelters…');
  try {
    const dataSource = await GeoJsonDataSource.load(SHELTERS.url, { credit: SHELTERS.credit });
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
