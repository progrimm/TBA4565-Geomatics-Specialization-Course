// Reading a COLMAP sparse model: the cameras (intrinsics) and the images (poses). Pure
// functions on bytes and text. Format: https://colmap.github.io/format.html

/**
 * COLMAP camera models by id: name and number of parameters. Only the pinhole models can be
 * reproduced by a three.js camera; the others have lens distortion.
 */
const MODELS = [
  ['SIMPLE_PINHOLE', 3],
  ['PINHOLE', 4],
  ['SIMPLE_RADIAL', 4],
  ['RADIAL', 5],
  ['OPENCV', 8],
  ['OPENCV_FISHEYE', 8],
  ['FULL_OPENCV', 12],
  ['FOV', 5],
  ['SIMPLE_RADIAL_FISHEYE', 4],
  ['RADIAL_FISHEYE', 5],
  ['THIN_PRISM_FISHEYE', 12],
  ['RAD_TAN_THIN_PRISM_FISHEYE', 16],
];
const PARAM_COUNT = Object.fromEntries(MODELS);

/**
 * @typedef {{id: number, model: string, width: number, height: number, params: number[]}}
 *   ColmapCamera
 * @typedef {{id: number, qvec: number[], tvec: number[], cameraId: number, name: string}}
 *   ColmapImage - qvec [w, x, y, z] and tvec: the world-to-camera rotation and translation.
 * @typedef {{fx: number, fy: number, cx: number, cy: number, width: number, height: number}}
 *   Intrinsics - focal lengths and principal point in pixels; pixel centres at +0.5.
 */

/** Little-endian reader over a byte array, with an end-of-data check. */
function reader(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const need = (size) => {
    if (offset + size > view.byteLength) throw new Error('The COLMAP file ends too early.');
    const at = offset;
    offset += size;
    return at;
  };
  return {
    int32: () => view.getInt32(need(4), true),
    uint64: () => Number(view.getBigUint64(need(8), true)),
    float64: () => view.getFloat64(need(8), true),
    skip: (size) => need(size),
    cString() {
      const end = bytes.indexOf(0, offset);
      if (end === -1) throw new Error('The COLMAP file ends too early.');
      const text = new TextDecoder().decode(bytes.subarray(offset, end));
      offset = end + 1;
      return text;
    },
    get done() {
      return offset === view.byteLength;
    },
  };
}

/**
 * Parse `cameras.bin`.
 * @param {Uint8Array} bytes
 * @returns {ColmapCamera[]}
 * @throws {Error} for an unknown camera model or a truncated file.
 */
export function parseCamerasBin(bytes) {
  const read = reader(bytes);
  const count = read.uint64();
  const cameras = [];
  for (let i = 0; i < count; i++) {
    const id = read.int32();
    const modelId = read.int32();
    const width = read.uint64();
    const height = read.uint64();
    const [model, paramCount] = MODELS[modelId] ?? [];
    if (!model) throw new Error(`Unknown COLMAP camera model id ${modelId}.`);
    const params = Array.from({ length: paramCount }, () => read.float64());
    cameras.push({ id, model, width, height, params });
  }
  return cameras;
}

/**
 * Parse `images.bin`. The 2D feature points are skipped. Unchanged in COLMAP 3.12, which adds
 * `rigs.bin` and `frames.bin` beside it.
 * @param {Uint8Array} bytes
 * @returns {ColmapImage[]}
 */
export function parseImagesBin(bytes) {
  const read = reader(bytes);
  const count = read.uint64();
  const images = [];
  for (let i = 0; i < count; i++) {
    const id = read.int32();
    const qvec = [read.float64(), read.float64(), read.float64(), read.float64()];
    const tvec = [read.float64(), read.float64(), read.float64()];
    const cameraId = read.int32();
    const name = read.cString();
    // Each 2D point: x, y (float64) and the id of its 3D point (int64).
    read.skip(read.uint64() * 24);
    images.push({ id, qvec, tvec, cameraId, name });
  }
  return images;
}

/** Lines of a COLMAP text file without comments; empty lines are kept (images.txt needs them). */
function dataLines(text) {
  const lines = text.split(/\r?\n/).filter((line) => !line.startsWith('#'));
  while (lines.length > 0 && lines.at(-1).trim() === '') lines.pop();
  return lines;
}

/**
 * Parse `cameras.txt`: one line per camera, "CAMERA_ID MODEL WIDTH HEIGHT PARAMS…".
 * @param {string} text
 * @returns {ColmapCamera[]}
 */
export function parseCamerasTxt(text) {
  return dataLines(text)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [id, model, width, height, ...params] = line.trim().split(/\s+/);
      if (!(model in PARAM_COUNT)) throw new Error(`Unknown COLMAP camera model ${model}.`);
      return {
        id: Number(id),
        model,
        width: Number(width),
        height: Number(height),
        params: params.map(Number),
      };
    });
}

/**
 * Parse `images.txt`: two lines per image, "IMAGE_ID QW QX QY QZ TX TY TZ CAMERA_ID NAME" and
 * the 2D points (which may be an empty line).
 * @param {string} text
 * @returns {ColmapImage[]}
 */
export function parseImagesTxt(text) {
  const lines = dataLines(text);
  const images = [];
  for (let i = 0; i < lines.length; i += 2) {
    const [id, qw, qx, qy, qz, tx, ty, tz, cameraId, ...name] = lines[i].trim().split(/\s+/);
    images.push({
      id: Number(id),
      qvec: [qw, qx, qy, qz].map(Number),
      tvec: [tx, ty, tz].map(Number),
      cameraId: Number(cameraId),
      name: name.join(' '),
    });
  }
  return images;
}

/**
 * Pinhole intrinsics of a camera, or null if its model has lens distortion.
 * @param {ColmapCamera} camera
 * @returns {Intrinsics | null}
 */
export function pinholeIntrinsics({ model, width, height, params }) {
  if (model === 'SIMPLE_PINHOLE') {
    const [f, cx, cy] = params;
    return { fx: f, fy: f, cx, cy, width, height };
  }
  if (model === 'PINHOLE') {
    const [fx, fy, cx, cy] = params;
    return { fx, fy, cx, cy, width, height };
  }
  return null;
}

/**
 * Find a COLMAP model and its photos among the files of a chosen folder. Accepts an
 * undistorted workspace (`dense/sparse/` + `dense/images/`) or a project (`sparse/0/` +
 * `images/`); binary files win over text files, and the shallowest model wins.
 * @template {{path: string}} T
 * @param {T[]} files - path: relative path with "/" separators (File.webkitRelativePath).
 * @returns {{cameras: T, images: T, format: 'bin' | 'txt', photoPath: (name: string) => string}}
 *   photoPath gives the expected path of a photo named in the model.
 * @throws {Error} if there is no cameras + images pair.
 */
export function findColmapFiles(files) {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const models = [];
  for (const { path } of files) {
    const match = /^(.*\/)?cameras\.(bin|txt)$/.exec(path);
    if (!match) continue;
    const folder = match[1] ?? '';
    const images = byPath.get(`${folder}images.${match[2]}`);
    if (images) models.push({ folder, format: match[2], cameras: byPath.get(path), images });
  }
  if (models.length === 0) {
    throw new Error('No COLMAP model found: the folder needs cameras.bin and images.bin.');
  }
  const depth = ({ folder }) => folder.split('/').length;
  models.sort((a, b) => depth(a) - depth(b) || (a.format === 'bin' ? -1 : 1));
  const { folder, format, cameras, images } = models[0];
  // The photos sit in images/ next to the sparse/ folder that holds the model.
  const sparse = folder.lastIndexOf('sparse/');
  const root = sparse === -1 ? folder : folder.slice(0, sparse);
  return { cameras, images, format, photoPath: (name) => `${root}images/${name}` };
}
