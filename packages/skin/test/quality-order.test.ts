import { describe, expect, it } from 'vitest';
import { orderQualityValues } from '../src/quality-order.js';

const r = (id: string, height?: number, bitrate?: number, width?: number) => ({
  id,
  height,
  bitrate,
  width: width ?? (height ? Math.round((height * 16) / 9) : undefined),
});

describe('orderQualityValues', () => {
  it('puts Auto first and sorts by resolution, highest first', () => {
    const renditions = [r('540', 540, 550_000), r('1080', 1080, 1_600_000), r('360', 360, 300_000), r('720', 720, 900_000)];
    expect(orderQualityValues(['auto', '540', '1080', '360', '720'], renditions)).toEqual(['auto', '1080', '720', '540', '360']);
  });

  it('keeps Auto on top even when the manifest lists it last', () => {
    const renditions = [r('a', 360), r('b', 1080)];
    expect(orderQualityValues(['a', 'b', 'auto'], renditions)).toEqual(['auto', 'b', 'a']);
  });

  it('orders equal resolutions by bitrate, highest first', () => {
    const renditions = [r('low', 1080, 2_000_000), r('high', 1080, 6_000_000), r('mid', 720, 3_000_000)];
    expect(orderQualityValues(['auto', 'low', 'mid', 'high'], renditions)).toEqual(['auto', 'high', 'low', 'mid']);
  });

  it('does not depend on the input order', () => {
    const renditions = [r('1', 1080, 1), r('2', 720, 1), r('3', 480, 1)];
    const expected = ['auto', '1', '2', '3'];
    expect(orderQualityValues(['3', '2', '1', 'auto'], renditions)).toEqual(expected);
    expect(orderQualityValues(['2', 'auto', '3', '1'], renditions)).toEqual(expected);
  });

  it('puts renditions without a size last, by bitrate, and keeps full ties stable', () => {
    const renditions = [r('nosize-low', undefined, 100), r('sized', 360, 1), r('nosize-high', undefined, 900), r('twin-a', 720, 5), r('twin-b', 720, 5)];
    expect(orderQualityValues(['nosize-low', 'sized', 'auto', 'nosize-high', 'twin-a', 'twin-b'], renditions)).toEqual([
      'auto',
      'twin-a',
      'twin-b',
      'sized',
      'nosize-high',
      'nosize-low',
    ]);
  });
});
