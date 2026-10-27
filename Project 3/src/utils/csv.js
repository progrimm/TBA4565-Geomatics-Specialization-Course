/**
 * Parse simple CSV text: a header row, comma-separated, values optionally in double
 * quotes (no commas or quotes inside values). Numeric-looking values become numbers.
 * @param {string} text - CSV text.
 * @returns {Record<string, string | number>[]} one object per data row.
 */
export function parseCsv(text) {
  const [header, ...rows] = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"(.*)"$/, '$1')));
  return rows.map((cells) =>
    Object.fromEntries(
      header.map((key, i) => {
        const cell = cells[i] ?? '';
        return [key, cell !== '' && Number.isFinite(Number(cell)) ? Number(cell) : cell];
      }),
    ),
  );
}

/**
 * Serialise rows as CSV with the keys of the first row as header. Numbers are
 * written with the given number of decimals, everything else in double quotes.
 * @param {Record<string, string | number>[]} rows - at least one row.
 * @param {number} [decimals=2] - decimals for numbers.
 * @returns {string} CSV text ending in a newline.
 */
export function toCsv(rows, decimals = 2) {
  const header = Object.keys(rows[0]);
  const format = (value) =>
    typeof value === 'number' ? value.toFixed(decimals) : `"${String(value)}"`;
  const lines = rows.map((row) => header.map((key) => format(row[key])).join(','));
  return `${[header.join(','), ...lines].join('\n')}\n`;
}
