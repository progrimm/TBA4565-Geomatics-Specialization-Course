/**
 * Cut Kartverket's height reference model (geoid model) HREF2025A_NN2000_EUREF89 down to
 * the walking network's area and write it to src/utils/geoidGrid.js.
 *
 * The model gives, on a 0.02° × 0.04° lattice, the height N of the NN2000 reference
 * surface above the GRS80/WGS84 ellipsoid, so that h (ellipsoidal) = H (NN2000) + N.
 * The script downloads the model's zip from Geonorge, reads its GeoTIFF, keeps the
 * lattice nodes around the network's bounding box, and checks bilinear interpolation of
 * that subgrid against Kartverket's transformation API (EPSG:4937 → EPSG:5942) at a few
 * points. Licence: CC BY 4.0, © Kartverket.
 * Run with: npm run data:geoid
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { fromArrayBuffer } from 'geotiff';
import { format, resolveConfig } from 'prettier';
import { gridPoints } from '../src/utils/grid.js';
import { geoidHeight } from '../src/utils/geoid.js';

const MODEL = 'HREF2025A_NN2000_EUREF89';
const ZIP_URL = `https://nedlasting.geonorge.no/geonorge/generell/${MODEL}.zip`;
const METADATA_URL =
  'https://kartkatalog.geonorge.no/metadata/uuid/384ce432-8da7-4cfa-9afa-140d2b6c29d3';
const API_URL = 'https://ws.geonorge.no/transformering/v1/transformer?fra=4937&til=5942';
const NETWORK = new URL('../public/data/walking-network.json', import.meta.url);
const OUTPUT = new URL('../src/utils/geoidGrid.js', import.meta.url);
// Interpolation check against the API: CHECK_SIZE × CHECK_SIZE points over the area.
const CHECK_SIZE = 4;

/**
 * Extract one file from a zip archive (stored or deflated), using the central directory.
 * Enough for Geonorge's model zips; not a general zip reader (no zip64, no encryption).
 * @param {Buffer} zip
 * @param {string} name
 * @returns {Buffer}
 */
function unzipEntry(zip, name) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); // end of central directory
  if (end === -1) throw new Error('not a zip file');
  let offset = zip.readUInt32LE(end + 16);
  for (let i = 0; i < zip.readUInt16LE(end + 10); i += 1) {
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const entryName = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (entryName.endsWith(name)) {
      const local = zip.readUInt32LE(offset + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + compressedSize);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`unsupported zip compression method ${method}`);
    }
    offset += 46 + nameLength + zip.readUInt16LE(offset + 30) + zip.readUInt16LE(offset + 32);
  }
  throw new Error(`${name} not found in the zip`);
}

const response = await fetch(ZIP_URL);
if (!response.ok) throw new Error(`${ZIP_URL}: HTTP ${response.status}`);
const tiff = await fromArrayBuffer(
  new Uint8Array(unzipEntry(Buffer.from(await response.arrayBuffer()), `${MODEL}.tif`)).buffer,
);
const image = await tiff.getImage();
// The GeoTIFF is "pixel is point" (GTRasterTypeGeoKey = 2): the origin is the first
// lattice node itself, not the corner of a pixel.
if (image.getGeoKeys().GTRasterTypeGeoKey !== 2) throw new Error('expected a point lattice');
const [west0, north0] = image.getOrigin();
const [dLon, negativeDLat] = image.getResolution();
const dLat = -negativeDLat;
const width = image.getWidth();
const [raster] = await image.readRasters();

// Lattice nodes that enclose the walking network's bounding box (WGS84 ≈ EUREF89 degrees).
const { bbox } = JSON.parse(await readFile(NETWORK, 'utf8'));
const round = (value, decimals) => Number(value.toFixed(decimals));
const col0 = Math.floor(round((bbox.west - west0) / dLon, 9));
const col1 = Math.ceil(round((bbox.east - west0) / dLon, 9));
const row0 = Math.floor(round((north0 - bbox.north) / dLat, 9));
const row1 = Math.ceil(round((north0 - bbox.south) / dLat, 9));
const values = [];
for (let row = row0; row <= row1; row += 1) {
  for (let col = col0; col <= col1; col += 1) values.push(round(raster[row * width + col], 4));
}

const grid = {
  model: MODEL,
  source: ZIP_URL,
  metadata: METADATA_URL,
  licence: 'CC BY 4.0, © Kartverket',
  fetched: new Date().toISOString().slice(0, 10),
  west: round(west0 + col0 * dLon, 9),
  north: round(north0 - row0 * dLat, 9),
  dLon: round(dLon, 9),
  dLat: round(dLat, 9),
  cols: col1 - col0 + 1,
  rows: row1 - row0 + 1,
  values,
};

// Check: bilinear interpolation of the subgrid against Kartverket's own transformation.
// An ellipsoidal height of 0 transformed to NN2000 gives H = −N.
const points = gridPoints(bbox, CHECK_SIZE);
const apiResponse = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(
    points.map(({ longitude, latitude }) => ({ x: longitude, y: latitude, z: 0 })),
  ),
});
if (!apiResponse.ok) throw new Error(`transformation API: HTTP ${apiResponse.status}`);
const differences = (await apiResponse.json()).map(({ z }, i) => geoidHeight(points[i], grid) - -z);
grid.apiCheck = {
  date: grid.fetched,
  points: points.length,
  maxAbsDifferenceMetres: round(Math.max(...differences.map(Math.abs)), 5),
};

const header = `/**
 * Geoid model subgrid, generated by scripts/fetch-geoid.js (npm run data:geoid). Do not edit.
 * ${MODEL}: height N of NN2000 above the GRS80 ellipsoid in metres, on a lattice of
 * EUREF89 (≈ WGS84) lon/lat nodes, row by row from the north-west node.
 */
export const GEOID_GRID = `;
const text = await format(`${header}${JSON.stringify(grid, null, 2)};\n`, {
  ...(await resolveConfig(fileURLToPath(OUTPUT))),
  parser: 'babel',
});
await writeFile(OUTPUT, text);
console.warn(
  `${MODEL}: ${grid.cols} × ${grid.rows} nodes, N ${Math.min(...values)}–${Math.max(...values)} m; ` +
    `largest difference from the transformation API at ${points.length} points: ` +
    `${(grid.apiCheck.maxAbsDifferenceMetres * 1000).toFixed(2)} mm`,
);
