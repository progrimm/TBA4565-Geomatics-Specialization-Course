/**
 * Download DSB public shelters (Tilfluktsrom – Offentlige, licence NLOD) for
 * Trondheim and write them as WGS84 GeoJSON to public/data/shelters.geojson.
 * Run with: npm run data:shelters
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseSheltersGml } from '../src/utils/shelters.js';

const WFS_URL = 'https://ogc.dsb.no/wfs.ashx';
const LAYER = 'layer_340';
// Bounding box around Trondheim in EPSG:25832 (E min, N min, E max, N max), metres.
const BBOX_UTM32 = [560000, 7020000, 580000, 7040000];
const OUTPUT = new URL('../public/data/shelters.geojson', import.meta.url);

const params = new URLSearchParams({
  service: 'WFS',
  version: '2.0.0',
  request: 'GetFeature',
  typeNames: LAYER,
  srsName: 'EPSG:25832',
  bbox: `${BBOX_UTM32.join(',')},EPSG:25832`,
});

const response = await fetch(`${WFS_URL}?${params}`);
if (!response.ok) {
  throw new Error(`WFS request failed: ${response.status} ${response.statusText}`);
}

const geojson = parseSheltersGml(await response.text());
if (geojson.features.length === 0) {
  throw new Error('WFS returned no shelters; refusing to overwrite the dataset.');
}

await writeFile(OUTPUT, `${JSON.stringify(geojson, null, 2)}\n`);
console.warn(`Wrote ${geojson.features.length} shelters to ${fileURLToPath(OUTPUT)}`);
