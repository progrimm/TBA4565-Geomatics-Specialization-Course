// PLY header reader: http://paulbourke.net/dataformats/ply/
// A 3DGS PLY stores one "vertex" per splat with the properties from Kerbl et al.
// (2023): position (x, y, z), rotation quaternion (rot_0..3), log scale
// (scale_0..2), logit opacity, base colour (f_dc_0..2, spherical-harmonics degree 0)
// and the higher SH coefficients (f_rest_*).

const END = 'end_header';
/** Headers are small; stop looking for end_header after this many bytes. */
const MAX_HEADER_BYTES = 64 * 1024;

/** Properties every Gaussian splat PLY must have. */
export const REQUIRED_SPLAT_PROPERTIES = [
  'x',
  'y',
  'z',
  'scale_0',
  'scale_1',
  'scale_2',
  'rot_0',
  'rot_1',
  'rot_2',
  'rot_3',
  'opacity',
  'f_dc_0',
  'f_dc_1',
  'f_dc_2',
];

/**
 * Spherical-harmonics degree from the number of f_rest_* properties. Each colour
 * channel has (d + 1)² − 1 coefficients above degree 0, so f_rest = 3((d + 1)² − 1).
 * @param {number} restCount
 * @returns {number | null} null if the count matches no degree.
 */
export function shDegree(restCount) {
  for (let degree = 0; degree <= 4; degree += 1) {
    if (3 * ((degree + 1) ** 2 - 1) === restCount) return degree;
  }
  return null;
}

/**
 * Read the header of a PLY file.
 * @param {Uint8Array} bytes - the file, or at least its start.
 * @returns {{format: string, vertexCount: number, properties: {type: string, name: string}[],
 *   headerBytes: number, missing: string[], shDegree: number | null}}
 *   missing = required splat properties not in the file (empty for a splat PLY).
 * @throws {Error} if the bytes do not start with a PLY header.
 */
export function parsePlyHeader(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, MAX_HEADER_BYTES));
  const end = head.indexOf(END);
  if (!head.startsWith('ply') || end < 0) throw new Error('This is not a PLY file.');
  // The binary data starts after "end_header" and its line break.
  const headerBytes = end + END.length + (head[end + END.length] === '\r' ? 2 : 1);

  let format = '';
  let vertexCount = 0;
  let element = '';
  const properties = [];
  for (const line of head.slice(0, end).split(/\r?\n/)) {
    const [keyword, ...rest] = line.trim().split(/\s+/);
    if (keyword === 'format') format = rest.join(' ');
    else if (keyword === 'element') {
      element = rest[0];
      if (element === 'vertex') vertexCount = Number(rest[1]);
    } else if (keyword === 'property' && element === 'vertex') {
      properties.push({ type: rest.slice(0, -1).join(' '), name: rest.at(-1) });
    }
  }

  const names = new Set(properties.map((property) => property.name));
  const restCount = properties.filter((property) => property.name.startsWith('f_rest_')).length;
  return {
    format,
    vertexCount,
    properties,
    headerBytes,
    missing: REQUIRED_SPLAT_PROPERTIES.filter((name) => !names.has(name)),
    shDegree: shDegree(restCount),
  };
}
