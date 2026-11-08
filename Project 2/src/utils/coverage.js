/**
 * Coverage analysis helpers: walking-distance classes and the population summary of the
 * SSB grid cells (see scripts/analyse-coverage.js and layers/coverage.js).
 *
 * @typedef {{population: number, walk: number | null, romnr: number | null,
 *   connector: number}} CoverageCell
 *   walk: metres from the cell centre to the nearest shelter on foot, null if no shelter
 *   is connected to the centre's part of the network; romnr: that shelter; connector:
 *   straight metres from the cell centre to its nearest network node.
 */

/**
 * Index of the distance class a walk falls in (classes sorted by `max`, inclusive).
 * @param {number | null} walk - metres; null or Infinity for no route.
 * @param {{max: number}[]} classes
 * @returns {number} class index, or -1 for no route.
 */
export function distanceClass(walk, classes) {
  if (walk === null || !Number.isFinite(walk)) return -1;
  return classes.findIndex(({ max }) => walk <= max);
}

/**
 * Population summary of the coverage cells.
 * @param {CoverageCell[]} cells
 * @param {import('./nearest.js').Shelter[]} shelters
 * @param {number[]} thresholds - walking distances in metres, e.g. [500, 1000, 2000].
 * @param {number} maxConnector - metres; cells whose centre is further from the network
 *   are counted separately, because their walk starts with a long straight line.
 * @returns {{residents: number, places: number, residentsPerPlace: number,
 *   within: {metres: number, residents: number, share: number}[],
 *   noRoute: {cells: number, residents: number},
 *   farFromNetwork: {cells: number, residents: number},
 *   catchments: {romnr: number, adresse: string, places: number, residents: number,
 *     residentsPerPlace: number}[]}}
 *   catchments: one per shelter, sorted by residents per place, most crowded first.
 */
export function summarizeCoverage(cells, shelters, thresholds, maxConnector) {
  const residents = cells.reduce((sum, cell) => sum + cell.population, 0);
  const places = shelters.reduce((sum, shelter) => sum + shelter.plasser, 0);
  const sumWhere = (test) => cells.filter(test).reduce((sum, cell) => sum + cell.population, 0);
  const share = (value) => (residents > 0 ? value / residents : 0);

  const byShelter = new Map(shelters.map((shelter) => [shelter.romnr, 0]));
  for (const cell of cells) {
    if (cell.romnr !== null)
      byShelter.set(cell.romnr, (byShelter.get(cell.romnr) ?? 0) + cell.population);
  }
  const catchments = shelters
    .map(({ romnr, adresse, plasser }) => ({
      romnr,
      adresse,
      places: plasser,
      residents: byShelter.get(romnr),
      residentsPerPlace: byShelter.get(romnr) / plasser,
    }))
    .sort((a, b) => b.residentsPerPlace - a.residentsPerPlace);

  return {
    residents,
    places,
    residentsPerPlace: residents / places,
    within: thresholds.map((metres) => {
      const count = sumWhere((cell) => cell.walk !== null && cell.walk <= metres);
      return { metres, residents: count, share: share(count) };
    }),
    noRoute: {
      cells: cells.filter((cell) => cell.walk === null).length,
      residents: sumWhere((cell) => cell.walk === null),
    },
    farFromNetwork: {
      cells: cells.filter((cell) => cell.connector > maxConnector).length,
      residents: sumWhere((cell) => cell.connector > maxConnector),
    },
    catchments,
  };
}
