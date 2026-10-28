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
 * A length as a bare number: 3 decimals below 100, 1 above.
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  return value.toFixed(Math.abs(value) >= 100 ? 1 : 3);
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
