import { describe, it, expect } from 'vitest';
import { parsePlyHeader, shDegree, REQUIRED_SPLAT_PROPERTIES } from '../src/utils/ply.js';

const encode = (text) => new TextEncoder().encode(text);

/** Header of a 3DGS PLY like the SOAR test file: no normals, SH degree 3. */
function splatHeader({ rest = 45, count = 200258, eol = '\n' } = {}) {
  const names = [
    ...REQUIRED_SPLAT_PROPERTIES,
    ...Array.from({ length: rest }, (_, i) => `f_rest_${i}`),
  ];
  return [
    'ply',
    'format binary_little_endian 1.0',
    `element vertex ${count}`,
    ...names.map((name) => `property float ${name}`),
    'end_header',
    '',
  ].join(eol);
}

describe('PLY header', () => {
  it('reads a 3DGS splat header', () => {
    const text = splatHeader();
    // Binary data after the header must not disturb parsing.
    const bytes = new Uint8Array([...encode(text), 0xff, 0x00, 0x7f]);
    const header = parsePlyHeader(bytes);
    expect(header.format).toBe('binary_little_endian 1.0');
    expect(header.vertexCount).toBe(200258);
    expect(header.properties).toHaveLength(59);
    expect(header.properties[0]).toEqual({ type: 'float', name: 'x' });
    expect(header.missing).toEqual([]);
    expect(header.shDegree).toBe(3);
    expect(header.headerBytes).toBe(encode(text).length);
  });

  it('handles CRLF line breaks', () => {
    const text = splatHeader({ eol: '\r\n' });
    const header = parsePlyHeader(encode(text));
    expect(header.properties).toHaveLength(59);
    expect(header.headerBytes).toBe(encode(text).length);
  });

  it('lists missing splat properties for a plain point cloud', () => {
    const text = [
      'ply',
      'format ascii 1.0',
      'element vertex 2',
      'property float x',
      'property float y',
      'property float z',
      'property uchar red',
      'element face 1',
      'property list uchar int vertex_indices',
      'end_header',
      '',
    ].join('\n');
    const header = parsePlyHeader(encode(text));
    expect(header.vertexCount).toBe(2);
    // Face properties are not vertex properties.
    expect(header.properties.map((p) => p.name)).toEqual(['x', 'y', 'z', 'red']);
    expect(header.missing).toContain('scale_0');
    expect(header.missing).not.toContain('x');
  });

  it('recognises a SuperSplat compressed PLY as a splat', () => {
    const text = [
      'ply',
      'format binary_little_endian 1.0',
      'element chunk 1',
      'property float min_x',
      'element vertex 256',
      'property uint packed_position',
      'property uint packed_rotation',
      'property uint packed_scale',
      'property uint packed_color',
      'end_header',
      '',
    ].join('\n');
    const header = parsePlyHeader(encode(text));
    expect(header.compressed).toBe(true);
    expect(header.missing).toEqual([]);
    expect(header.vertexCount).toBe(256);
    expect(header.shDegree).toBeNull();
  });

  it('rejects files that are not PLY', () => {
    expect(() => parsePlyHeader(encode('hello world'))).toThrow('not a PLY');
    expect(() => parsePlyHeader(encode('ply\nformat ascii 1.0\n'))).toThrow('not a PLY');
  });

  it('derives the SH degree from the f_rest count', () => {
    expect(shDegree(0)).toBe(0);
    expect(shDegree(9)).toBe(1);
    expect(shDegree(24)).toBe(2);
    expect(shDegree(45)).toBe(3);
    expect(shDegree(10)).toBeNull();
  });
});
