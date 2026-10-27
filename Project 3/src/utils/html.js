const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escape text for safe insertion into HTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/**
 * Build an HTML table of label/value rows, e.g. for an Entity description (InfoBox).
 * All labels and values are escaped, since they may come from external data.
 * @param {Array<[string, unknown]>} rows
 * @returns {string}
 */
export function toDescriptionTable(rows) {
  const body = rows
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');
  return `<table class="cesium-infoBox-defaultTable"><tbody>${body}</tbody></table>`;
}
