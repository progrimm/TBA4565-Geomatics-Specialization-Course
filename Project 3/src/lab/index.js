// Viewer lab index: links to each viewer page and shows the benchmark results.
// The CSVs are bundled at build time; a missing file just means "not measured yet".
import { median } from '../utils/benchmark.js';
import { parseCsv } from '../utils/csv.js';
import { escapeHtml } from '../utils/html.js';
import { COMPARISON, COMPARISON_COLUMNS } from './comparison.js';
import { VIEWERS } from './config.js';
import { createLabPage } from './harness.js';

const csvFiles = import.meta.glob('../../results/viewer-*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const csv = (name) => parseCsv(csvFiles[`../../results/${name}`] ?? 'empty\n');

const page = createLabPage({
  title: 'Viewer lab',
  engine:
    'The same Gaussian splat in several 3DGS web viewers, each on its own page with its own WebGL context and bundle.',
  createCanvas: false,
});
page.stage.remove();

const runs = csv('viewer-benchmark.csv');
const staticMetrics = csv('viewer-static.csv');
const RESOLUTIONS = [...new Set(runs.map((row) => row.resolution))].filter(Boolean);
if (!RESOLUTIONS.length) RESOLUTIONS.push('1280x720');

function benchmarkRow(viewer, resolution) {
  const own = runs.filter((row) => row.viewer === viewer.name && row.resolution === resolution);
  const pick = (key, digits) => (own.length ? median(own.map((r) => r[key])).toFixed(digits) : '–');
  const sizes = staticMetrics.find((row) => row.viewer === viewer.name);
  return [
    viewer.name,
    resolution.replace('x', ' × '),
    pick('first_frame_s', 2),
    pick('mean_fps', 1),
    pick('p5_fps', 1),
    pick('js_heap_mib', 1),
    pick('network_mib', 1),
    sizes ? sizes.bundle_gzip_kib.toFixed(0) : '–',
    sizes ? String(sizes.integration_lines) : '–',
  ];
}

function table(caption, headers, rows, numericFrom = Infinity) {
  const head = headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const body = rows
    .map(
      (cells) =>
        `<tr>${cells
          .map((cell, i) =>
            i === 0
              ? `<th scope="row">${escapeHtml(cell)}</th>`
              : `<td${i >= numericFrom ? ' class="num"' : ''}>${escapeHtml(cell)}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  return `<div class="lab-table-wrap" tabindex="0" role="region" aria-label="${escapeHtml(caption)}">
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

const section = document.createElement('section');
section.innerHTML = `
  <ul class="lab-cards">
    ${VIEWERS.map(
      (viewer) => `<li><a href="${viewer.page}"><strong>${escapeHtml(viewer.name)}</strong>
        <span>${viewer.benchmarked ? 'Test splat, benchmarked' : 'Esri sample layer, qualitative only'}</span></a></li>`,
    ).join('')}
  </ul>
  <h2>Benchmark</h2>
  <p class="lab-note">Medians of 3 runs per viewer and resolution, measured with
    <code>scripts/viewer-benchmark.mjs</code> during a scripted 10 s orbit. Frame rates are
    capped by the display's refresh rate (vsync on). Method, machine and limits are in the
    project README. CesiumJS is not in this benchmark; see the gallery's own measurements.</p>
  ${table(
    'Benchmark results',
    [
      'Viewer',
      'Resolution',
      'First frame (s)',
      'Mean FPS',
      '5th-pct FPS',
      'JS heap (MiB)',
      'Network (MiB)',
      'Bundle gzip (KiB)',
      'Integration lines',
    ],
    RESOLUTIONS.flatMap((resolution) =>
      VIEWERS.filter((viewer) => viewer.benchmarked).map((viewer) =>
        benchmarkRow(viewer, resolution),
      ),
    ),
    2,
  )}
  <h2>Comparison</h2>
  ${table(
    'Qualitative comparison',
    COMPARISON_COLUMNS.map((column) => column.label),
    COMPARISON.map((row) => COMPARISON_COLUMNS.map((column) => row[column.key])),
  )}`;
document.querySelector('.lab-page').append(section);
