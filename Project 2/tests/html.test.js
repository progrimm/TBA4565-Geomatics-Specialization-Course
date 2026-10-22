import { describe, it, expect } from 'vitest';
import { escapeHtml, toDescriptionTable } from '../src/utils/html.js';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;',
    );
  });

  it('converts non-strings to text', () => {
    expect(escapeHtml(630)).toBe('630');
  });
});

describe('toDescriptionTable', () => {
  it('renders one escaped row per label/value pair', () => {
    const html = toDescriptionTable([
      ['Capacity', 630],
      ['Address', 'A & B'],
    ]);
    expect(html).toContain('<tr><th>Capacity</th><td>630</td></tr>');
    expect(html).toContain('<tr><th>Address</th><td>A &amp; B</td></tr>');
  });
});
