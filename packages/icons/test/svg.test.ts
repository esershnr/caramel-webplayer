import { describe, expect, it } from 'vitest';
import { icons, getIcon, isIconName } from '../src/icons.js';
import { iconToSvg } from '../src/svg.js';

describe('icon registry', () => {
  it('exposes every icon as non-empty Lucide data', () => {
    for (const [name, node] of Object.entries(icons)) {
      expect(isIconName(name)).toBe(true);
      expect(Array.isArray(node)).toBe(true);
      expect(node.length).toBeGreaterThan(0);
    }
    expect(getIcon('does-not-exist')).toBeUndefined();
  });
});

describe('iconToSvg', () => {
  it('renders a 24 grid stroke svg that is aria-hidden by default', () => {
    const svg = iconToSvg(icons.play);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('role="img"');
  });

  it('applies size, stroke width, class and label', () => {
    const svg = iconToSvg(icons.pause, { size: 18, strokeWidth: 1.5, className: 'a b', label: 'Duraklat' });
    expect(svg).toContain('width="18"');
    expect(svg).toContain('stroke-width="1.5"');
    expect(svg).toContain('class="a b"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="Duraklat"');
  });

  it('escapes attribute values', () => {
    const svg = iconToSvg(icons.play, { label: 'a"b<c' });
    expect(svg).toContain('aria-label="a&quot;b&lt;c"');
  });
});
