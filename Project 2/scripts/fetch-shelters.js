/**
 * Download DSB public shelters (Tilfluktsrom – Offentlige, licence NLOD) for
 * Trondheim and write them as WGS84 GeoJSON to public/data/shelters.geojson,
 * with the fetch date and source in a `metadata` foreign member (see utils/credit.js).
 * Run with: npm run data:shelters
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { parseSheltersGml } from '../src/utils/shelters.js';

const WFS_URL = 'https://ogc.dsb.no/wfs.ashx';
const LAYER = 'layer_340';
const SOURCE_CRS = 'EPSG:25832';
// Bounding box around Trondheim in EPSG:25832 (E min, N min, E max, N max), metres.
const BBOX_UTM32 = [560000, 7020000, 580000, 7040000];
const OUTPUT = new URL('../public/data/shelters.geojson', import.meta.url);

const params = new URLSearchParams({
  service: 'WFS',
  version: '2.0.0',
  request: 'GetFeature',
  typeNames: LAYER,
  srsName: SOURCE_CRS,
  bbox: `${BBOX_UTM32.join(',')},${SOURCE_CRS}`,
});

const response = await fetch(`${WFS_URL}?${params}`);
if (!response.ok) {
  throw new Error(`WFS request failed: ${response.status} ${response.statusText}`);
}

const { features } = parseSheltersGml(await response.text(), {
  onInvalid: (reason, index) => console.warn(`Skipped WFS member ${index}: ${reason}`),
});
if (features.length === 0) {
  throw new Error('WFS returned no valid shelters; refusing to overwrite the dataset.');
}

const geojson = {
  type: 'FeatureCollection',
  metadata: {
    fetched: new Date().toISOString().slice(0, 10), // UTC date
    source: WFS_URL,
    layer: LAYER,
    sourceCrs: SOURCE_CRS,
    featureCount: features.length,
  },
  features,
};
// Format like the rest of the repo so `npm run format:check` passes after a re-fetch.
const path = fileURLToPath(OUTPUT);
// Prettier keeps objects expanded only if the input has them on several lines.
const text = await format(JSON.stringify(geojson, null, 2), {
  ...(await resolveConfig(path)),
  filepath: path,
});
await writeFile(OUTPUT, text);
console.warn(`Wrote ${features.length} shelters to ${path}`);
