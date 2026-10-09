/** Read the pixel size of a baseline or progressive JPEG from its SOF marker. No I/O. */
export function readJpegSize(data: Uint8Array): { width: number; height: number } {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error('not a JPEG file');
  }
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = data[offset + 1];
    if (marker === undefined || marker === 0xff) {
      offset++;
      continue;
    }
    // Standalone markers without a length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const hi = data[offset + 2];
    const lo = data[offset + 3];
    if (hi === undefined || lo === undefined) break;
    const length = (hi << 8) | lo;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const h1 = data[offset + 5];
      const h2 = data[offset + 6];
      const w1 = data[offset + 7];
      const w2 = data[offset + 8];
      if (h1 === undefined || h2 === undefined || w1 === undefined || w2 === undefined) break;
      return { height: (h1 << 8) | h2, width: (w1 << 8) | w2 };
    }
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS before any SOF
    offset += 2 + length;
  }
  throw new Error('JPEG has no SOF marker');
}
