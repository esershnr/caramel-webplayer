import { describe, expect, it } from 'vitest';
import { qualityLabel } from '../src/quality-badge.js';

describe('qualityLabel', () => {
  it('maps heights to badges', () => {
    expect(qualityLabel(2160)).toBe('4K');
    expect(qualityLabel(1440)).toBe('2K');
    expect(qualityLabel(1080)).toBe('FHD');
    expect(qualityLabel(1088)).toBe('FHD');
    expect(qualityLabel(720)).toBe('HD');
    expect(qualityLabel(900)).toBe('HD');
  });

  it('shows nothing below 720p or without a height', () => {
    expect(qualityLabel(540)).toBeNull();
    expect(qualityLabel(0)).toBeNull();
    expect(qualityLabel(null)).toBeNull();
    expect(qualityLabel(Number.NaN)).toBeNull();
  });
});
