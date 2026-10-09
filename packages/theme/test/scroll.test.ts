import { describe, expect, it } from 'vitest';
import { prefersReducedMotion, scrollIntoContainer } from '../src/scroll.js';

interface FakeBox {
  top: number;
  height: number;
}

function fakeContainer(scrollTop: number, clientHeight: number, scrollHeight: number) {
  const calls: ScrollToOptions[] = [];
  const container = {
    scrollTop,
    clientHeight,
    scrollHeight,
    getBoundingClientRect: () => ({ top: 100, height: clientHeight }),
    scrollTo: (opts: ScrollToOptions) => calls.push(opts),
  } as unknown as HTMLElement;
  return { container, calls };
}

function fakeElement(box: FakeBox) {
  return { getBoundingClientRect: () => box } as unknown as HTMLElement;
}

describe('scrollIntoContainer', () => {
  it('does nothing without overflow', () => {
    const { container, calls } = fakeContainer(0, 200, 200);
    scrollIntoContainer(container, fakeElement({ top: 500, height: 40 }));
    expect(calls).toEqual([]);
  });

  it('does nothing when the element is already visible', () => {
    const { container, calls } = fakeContainer(50, 200, 1000);
    // element top 100 viewport => 100 - 100 + 50 = 50 in content coordinates
    scrollIntoContainer(container, fakeElement({ top: 110, height: 40 }));
    expect(calls).toEqual([]);
  });

  it('scrolls down just enough for an element below the view', () => {
    const { container, calls } = fakeContainer(0, 200, 1000);
    scrollIntoContainer(container, fakeElement({ top: 100 + 300, height: 40 }), { behavior: 'instant' });
    expect(calls).toEqual([{ top: 300 + 40 + 4 - 200, behavior: 'instant' }]);
  });

  it('scrolls up for an element above the view and clamps at zero', () => {
    const { container, calls } = fakeContainer(500, 200, 1000);
    scrollIntoContainer(container, fakeElement({ top: 100 - 498, height: 40 }), { behavior: 'instant' });
    expect(calls).toEqual([{ top: 0, behavior: 'instant' }]);
  });
});

describe('prefersReducedMotion', () => {
  it('is false without matchMedia', () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
