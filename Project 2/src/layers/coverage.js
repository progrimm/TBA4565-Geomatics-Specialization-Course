import { Color, GeoJsonDataSource } from 'cesium';
import { COVERAGE } from '../config.js';
import { showMessage } from '../state/messages.js';
import { distanceClass } from '../utils/coverage.js';
import { toDescriptionTable } from '../utils/html.js';
import { formatDistance } from '../utils/nearest.js';

/** Marks the coverage cells, so a click on one still runs the nearest-shelter search. */
const CELL_KIND = 'coverageCell';

/** The coverage file each loaded data source was made from. */
const files = new WeakMap();

/**
 * The contents of coverage.json behind a data source from loadCoverage.
 * @param {GeoJsonDataSource | undefined} dataSource
 * @returns {{cells: Array<[number[][], number, number | null, number | null]>,
 *   dataset: string, fetched: string} | undefined}
 */
export const coverageFile = (dataSource) => dataSource && files.get(dataSource);

/**
 * Whether a picked object (Scene.pick) is a coverage cell.
 * @param {{id?: import('cesium').Entity}} [picked]
 */
export const isCoverageCell = (picked) => picked?.id?.properties?.kind?.getValue() === CELL_KIND;

/**
 * The cells of public/data/coverage.json (see scripts/analyse-coverage.js) as GeoJSON
 * polygons. Corners are WGS84 lon/lat, converted from EUREF89 / UTM 33N; the cells are
 * squares in UTM 33, so on a lon/lat map they are slightly rotated quadrilaterals.
 * @param {{cells: Array<[number[][], number, number | null, number | null]>}} coverage
 * @returns {object} GeoJSON FeatureCollection.
 */
export function toCellFeatures({ cells }) {
  return {
    type: 'FeatureCollection',
    features: cells.map(([corners, population, walk, romnr]) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...corners, corners[0]]] },
      properties: { kind: CELL_KIND, population, walk, romnr },
    })),
  };
}

/** Colour and InfoBox text of one cell entity. */
function styleCell(entity) {
  const { population, walk, romnr } = entity.properties.getValue();
  const index = distanceClass(walk, COVERAGE.classes);
  const color = index === -1 ? COVERAGE.noRouteColor : COVERAGE.classes[index].color;
  entity.name = `${population} residents (250 m cell)`;
  entity.description = toDescriptionTable([
    ['Residents (SSB 2026)', population],
    ['Walk to nearest shelter', walk === null ? 'no route' : formatDistance(walk)],
    ['Nearest shelter on foot', romnr === null ? '–' : `No. ${romnr}`],
  ]);
  entity.polygon.material = Color.fromCssColorString(color).withAlpha(COVERAGE.alpha);
  entity.polygon.outline = false; // outlines are not drawn on ground-clamped polygons
}

/**
 * Load the coverage layer (hidden until switched on): SSB 250 m population cells
 * coloured by the walking distance from their centre to the nearest shelter.
 * @param {import('cesium').Viewer} viewer
 * @returns {Promise<GeoJsonDataSource | undefined>} undefined if loading failed (the error
 *   is shown to the user). The file's contents: coverageFile(dataSource).
 */
export async function loadCoverage(viewer) {
  try {
    const response = await fetch(COVERAGE.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const coverage = await response.json();
    const dataSource = await GeoJsonDataSource.load(toCellFeatures(coverage), {
      clampToGround: true,
      credit: COVERAGE.credit,
    });
    if (viewer.isDestroyed()) return undefined;
    dataSource.entities.values.forEach(styleCell);
    dataSource.show = false;
    await viewer.dataSources.add(dataSource);
    files.set(dataSource, coverage);
    return dataSource;
  } catch (error) {
    console.error('Coverage layer failed to load:', error);
    showMessage('Walking-distance layer could not be loaded.', 'error');
    return undefined;
  }
}
