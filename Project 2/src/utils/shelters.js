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

/**
 * Parse DSB "Tilfluktsrom – Offentlige" WFS GML (EPSG:25832) into a GeoJSON
 * FeatureCollection in WGS84 (RFC 7946). Points are 2D: no height is given.
 * @param {string} gml - WFS 2.0 GetFeature response for layer_340.
 * @returns {{type: 'FeatureCollection', features: object[]}}
 */
export function parseSheltersGml(gml) {
  const members = parser.parse(gml).FeatureCollection?.member ?? [];
  const features = members.map(({ layer_340: shelter }) => {
    const [east, north] = shelter.msGeometry.Point.pos.trim().split(/\s+/).map(Number);
    const [lon, lat] = utm32ToWgs84(east, north);
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [round(lon), round(lat)] },
      properties: {
        romnr: Number(shelter.romnr),
        plasser: Number(shelter.plasser),
        adresse: shelter.adresse.trim(),
      },
    };
  });
  return { type: 'FeatureCollection', features };
}
