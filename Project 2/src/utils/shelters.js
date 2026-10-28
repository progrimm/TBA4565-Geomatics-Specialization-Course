import { XMLParser } from 'fast-xml-parser';
import { utm32ToWgs84 } from './crs.js';

/** Decimal places kept in WGS84 degrees: 7 ≈ 1 cm, well below the data's accuracy. */
const COORD_DECIMALS = 7;

const parser = new XMLParser({
  removeNSPrefix: true,
  parseTagValue: false, // keep strings; numbers are converted explicitly below
  isArray: (name) => name === 'member',
});

const round = (value) => Number(value.toFixed(COORD_DECIMALS));

/** Parse a whole, non-negative number from a GML text value; undefined if invalid. */
function toCount(text) {
  // Number('') is 0, so empty values must be rejected before converting.
  const trimmed = typeof text === 'string' ? text.trim() : '';
  const value = Number(trimmed);
  return trimmed !== '' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Parse "E N" (EPSG:25832, metres) from a gml:pos; undefined if not two finite numbers. */
function toEastNorth(pos) {
  if (typeof pos !== 'string') return undefined;
  const values = pos.trim().split(/\s+/).map(Number);
  return values.length === 2 && values.every(Number.isFinite) ? values : undefined;
}

/**
 * Convert one WFS member to a GeoJSON Feature.
 * @returns {object | string} the Feature, or the reason it was rejected.
 */
function toFeature(member) {
  const shelter = member?.layer_340;
  if (!shelter) return 'not a layer_340 feature';
  const eastNorth = toEastNorth(shelter.msGeometry?.Point?.pos);
  if (!eastNorth) return 'missing or invalid point geometry';
  const romnr = toCount(shelter.romnr);
  if (romnr === undefined) return 'missing or invalid shelter number (romnr)';
  const plasser = toCount(shelter.plasser);
  if (plasser === undefined) return 'missing or invalid capacity (plasser)';

  const [lon, lat] = utm32ToWgs84(...eastNorth);
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [round(lon), round(lat)] },
    properties: {
      romnr,
      plasser,
      // The address is only shown to the user, so a missing one is not fatal.
      adresse: typeof shelter.adresse === 'string' ? shelter.adresse.trim() : '',
    },
  };
}

/**
 * Parse DSB "Tilfluktsrom – Offentlige" WFS GML (EPSG:25832) into a GeoJSON
 * FeatureCollection in WGS84 (RFC 7946). Points are 2D: no height is given.
 * Members without a valid point, shelter number or capacity are left out, because
 * the nearest-shelter analysis and the capacity totals depend on them.
 * @param {string} gml - WFS 2.0 GetFeature response for layer_340.
 * @param {object} [options]
 * @param {(reason: string, index: number) => void} [options.onInvalid] - called for
 *   every member that was left out, with its index in the response.
 * @returns {{type: 'FeatureCollection', features: object[]}}
 */
export function parseSheltersGml(gml, { onInvalid = () => {} } = {}) {
  const members = parser.parse(gml).FeatureCollection?.member ?? [];
  const features = [];
  members.forEach((member, index) => {
    const result = toFeature(member);
    if (typeof result === 'string') onInvalid(result, index);
    else features.push(result);
  });
  return { type: 'FeatureCollection', features };
}
