/**
 * Files a page loads up front, from a Vite build manifest: the entry chunk, its
 * static imports (recursively) and their CSS. Dynamic imports are left out, since
 * they load only when the page asks for them.
 * @param {Record<string, {file: string, css?: string[], imports?: string[]}>} manifest
 *   parsed dist/.vite/manifest.json.
 * @param {string} entry - manifest key of the page, e.g. "lab/spark.html".
 * @returns {string[]} output file paths relative to dist/, without duplicates.
 */
export function initialFiles(manifest, entry) {
  const files = new Set();
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`"${key}" is not in the manifest`);
    // An HTML entry's "file" is the page's JS chunk.
    files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  visit(entry);
  return [...files];
}

/**
 * Lines of code in a JavaScript source: non-blank lines that are not only a
 * comment (// line comments and /* … *\/ block comments).
 * @param {string} source
 * @returns {number}
 */
export function countCodeLines(source) {
  let inBlock = false;
  let count = 0;
  for (const raw of source.split(/\r?\n/)) {
    let line = raw.trim();
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) continue;
      inBlock = false;
      line = line.slice(end + 2).trim();
    }
    while (line.startsWith('/*')) {
      const end = line.indexOf('*/', 2);
      if (end === -1) {
        inBlock = true;
        line = '';
        break;
      }
      line = line.slice(end + 2).trim();
    }
    if (line && !line.startsWith('//')) count += 1;
  }
  return count;
}
