import { describe, it, expect } from 'vitest';
import { FORMATS } from '../src/config.js';
import { fileExtension, splatFormat } from '../src/utils/splatFile.js';

describe('splat file formats', () => {
  it('reads the extension case-insensitively', () => {
    expect(fileExtension('scene.PLY')).toBe('ply');
    expect(fileExtension('my.scene.spz')).toBe('spz');
    expect(fileExtension('noextension')).toBe('');
    expect(fileExtension('.hidden')).toBe('');
    expect(fileExtension('trailing.')).toBe('');
  });

  it('accepts the supported formats only', () => {
    expect(splatFormat('a.ply', FORMATS)).toEqual({ extension: 'ply', label: FORMATS.ply });
    expect(splatFormat('a.SOG', FORMATS)?.extension).toBe('sog');
    expect(splatFormat('a.txt', FORMATS)).toBeNull();
    // Not fooled by inherited object keys.
    expect(splatFormat('a.constructor', FORMATS)).toBeNull();
  });
});
