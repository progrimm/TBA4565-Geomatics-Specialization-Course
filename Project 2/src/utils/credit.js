/**
 * Provenance written into a generated GeoJSON file as an RFC 7946 foreign member
 * (`metadata`); GeoJSON readers such as Cesium's GeoJsonDataSource ignore it.
 * @typedef {{fetched: string, source: string, layer: string, sourceCrs: string,
 *   featureCount: number}} DatasetMetadata - fetched: ISO date (UTC), YYYY-MM-DD.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Append the fetch date to an on-screen data credit, e.g.
 * "Tilfluktsrom: © DSB, NLOD · data fetched 2026-10-28".
 * @param {string} credit
 * @param {Partial<DatasetMetadata>} [metadata]
 * @returns {string} the credit unchanged if the date is missing or malformed.
 */
export function withFetchDate(credit, metadata) {
  const fetched = metadata?.fetched;
  return typeof fetched === 'string' && ISO_DATE.test(fetched)
    ? `${credit} · data fetched ${fetched}`
    : credit;
}
