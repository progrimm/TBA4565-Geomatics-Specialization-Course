/**
 * Format a length in the file's own units. A splat has no inherent scale: it is in
 * metres only if the capture was scaled (e.g. with GNSS or a known distance).
 * @param {number} value
 * @returns {string}
 */
export function formatLength(value) {
  return `${formatNumber(value)} units`;
}

/**
 * A length in the file's units, or in the user's unit when a georeference is applied (the
 * scale is the same everywhere, so a length only needs scaling).
 * @param {number} value - in file units.
 * @param {{scale: number, unit: string} | null} georef
 * @returns {string}
 */
export function formatScaledLength(value, georef) {
  return georef ? `${formatNumber(value * georef.scale)} ${georef.unit}` : formatLength(value);
}

/**
 * Coordinates as "(x, y, z) unit".
 * @param {number[]} point
 * @param {string} unit
 * @returns {string}
 */
export function formatPoint(point, unit) {
  return `(${point.map(formatNumber).join(', ')}) ${unit}`;
}

/**
 * A length as a bare number: 3 decimals below 100, 1 above.
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  const text = value.toFixed(Math.abs(value) >= 100 ? 1 : 3);
  // A tiny negative value rounds to "-0.000"; show it as 0.
  return /^-0\.?0*$/.test(text) ? text.slice(1) : text;
}

/**
 * Format a count with thin-space thousands separators (200 258).
 * @param {number} count
 * @returns {string}
 */
export function formatCount(count) {
  return Math.round(count)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format a byte count in binary units (MiB/GiB), as GPU memory is usually reported.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
