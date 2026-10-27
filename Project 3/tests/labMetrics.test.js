import { describe, it, expect } from 'vitest';
import { countCodeLines, initialFiles } from '../src/utils/labMetrics.js';

describe('initialFiles', () => {
  const manifest = {
    'lab/spark.html': {
      file: 'assets/lab/spark.js',
      imports: ['_harness.js', '_three.js'],
      dynamicImports: ['_worker.js'],
    },
    '_harness.js': {
      file: 'assets/harness.js',
      css: ['assets/harness.css'],
      imports: ['_three.js'],
    },
    '_three.js': { file: 'assets/three.js' },
    '_worker.js': { file: 'assets/worker.js' },
  };

  it('collects the entry, static imports and CSS once each, without dynamic imports', () => {
    expect(initialFiles(manifest, 'lab/spark.html')).toEqual([
      'assets/lab/spark.js',
      'assets/harness.js',
      'assets/harness.css',
      'assets/three.js',
    ]);
  });

  it('fails on an unknown entry', () => {
    expect(() => initialFiles(manifest, 'lab/missing.html')).toThrow(/not in the manifest/);
  });
});

describe('countCodeLines', () => {
  it('skips blank lines and comments', () => {
    const source = [
      '// header comment',
      "import a from 'a';",
      '',
      '/**',
      ' * JSDoc',
      ' */',
      'const b = 1; // trailing comments still count',
      '/* one-line block */',
      '/* block */ const c = 2;',
    ].join('\n');
    expect(countCodeLines(source)).toBe(3);
  });
});
