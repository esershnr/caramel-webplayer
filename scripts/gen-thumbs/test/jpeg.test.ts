import { describe, expect, it } from 'vitest';
import { readJpegSize } from '../src/jpeg.js';

function jpeg(width: number, height: number, progressive = false): Uint8Array {
  const sof = progressive ? 0xc2 : 0xc0;
  return Uint8Array.from([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, // APP0 with a short payload
    0xff, sof, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03,
    0xff, 0xd9,
  ]);
}

describe('readJpegSize', () => {
  it('reads baseline and progressive sizes', () => {
    expect(readJpegSize(jpeg(240, 136))).toEqual({ width: 240, height: 136 });
    expect(readJpegSize(jpeg(2400, 1360, true))).toEqual({ width: 2400, height: 1360 });
  });

  it('rejects non JPEG data', () => {
    expect(() => readJpegSize(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toThrow(/not a JPEG/);
    expect(() => readJpegSize(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]))).toThrow(/SOF/);
  });
});
