/**
 * Format a length for display: metres below 1 km, kilometres above.
 * @param {number} metres
 * @returns {string}
 */
export function formatDistance(metres) {
  if (Math.abs(metres) >= 1000) return `${(metres / 1000).toFixed(3)} km`;
  return `${metres.toFixed(2)} m`;
}

/**
 * Format a signed length in metres (e.g. a height difference or offset).
 * @param {number} metres
 * @returns {string}
 */
export function formatSigned(metres) {
  const sign = metres > 0 ? '+' : metres < 0 ? '−' : '±';
  return `${sign}${Math.abs(metres).toFixed(2)} m`;
}

/**
 * Format an angle in degrees.
 * @param {number} degrees
 * @param {number} [digits=2]
 * @returns {string}
 */
export function formatDegrees(degrees, digits = 2) {
  return `${degrees.toFixed(digits)}°`;
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
