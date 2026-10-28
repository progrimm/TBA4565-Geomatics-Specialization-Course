/**
 * Lower-case extension of a file name ("" if it has none).
 * @param {string} fileName
 * @returns {string}
 */
export function fileExtension(fileName) {
  const dot = fileName.lastIndexOf('.');
  return dot <= 0 || dot === fileName.length - 1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/**
 * Which supported format a file is, from its extension.
 * @param {string} fileName
 * @param {Record<string, string>} formats - extension → label (FORMATS in config.js).
 * @returns {{extension: string, label: string} | null} null if not supported.
 */
export function splatFormat(fileName, formats) {
  const extension = fileExtension(fileName);
  return Object.hasOwn(formats, extension) ? { extension, label: formats[extension] } : null;
}
