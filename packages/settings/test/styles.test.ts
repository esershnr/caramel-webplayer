import { describe, expect, it } from 'vitest';

/**
 * The Video.js menu popup sizes itself from the boxes of the root page's
 * direct children, so the placeholder must have a box of its own. This guards
 * the layout contract documented at the rule: a `display: contents`
 * placeholder measured as 0px and the rows were clipped away.
 */
describe('settings.css', () => {
  it('gives the placeholder a real box inside the root page', async () => {
    // @ts-expect-error The package declares no Node types; this test runs in Node only.
    const { readFileSync } = await import('node:fs');
    const text: string = readFileSync(new URL('../src/styles/settings.css', import.meta.url), 'utf8');
    const start = text.indexOf('caramel-settings-menu:not([hidden])');
    expect(start).toBeGreaterThan(-1);
    const rule = text.slice(start, text.indexOf('}', start));
    expect(rule).toContain('display: flex');
    expect(rule).not.toContain('contents');
  });
});
