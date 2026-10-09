import { describe, expect, it } from 'vitest';
import { iconMapFromOnOff, parseIconMap, pickIcon } from '../src/map.js';

describe('parseIconMap', () => {
  it('parses value pairs, wildcard and absent key', () => {
    const map = parseIconMap('off:volume-off, low:volume-low ,*:volume-high,:pause');
    expect(map.values.get('off')).toBe('volume-off');
    expect(map.values.get('low')).toBe('volume-low');
    expect(map.any).toBe('volume-high');
    expect(map.absent).toBe('pause');
  });

  it('ignores malformed entries', () => {
    const map = parseIconMap('nocolon,,high:,:');
    expect(map.values.size).toBe(0);
    expect(map.any).toBeNull();
    expect(map.absent).toBeNull();
  });
});

describe('pickIcon', () => {
  it('prefers exact value, then wildcard', () => {
    const map = parseIconMap('off:volume-off,*:volume-high');
    expect(pickIcon(map, 'off')).toBe('volume-off');
    expect(pickIcon(map, 'medium')).toBe('volume-high');
  });

  it('uses the absent icon for a missing attribute', () => {
    const map = iconMapFromOnOff('play', 'pause');
    expect(pickIcon(map, null)).toBe('pause');
    expect(pickIcon(map, '')).toBe('play');
    expect(pickIcon(map, 'anything')).toBe('play');
  });

  it('returns undefined when nothing matches', () => {
    expect(pickIcon(parseIconMap('a:x'), null)).toBeUndefined();
    expect(pickIcon(parseIconMap('a:x'), 'b')).toBeUndefined();
  });
});
