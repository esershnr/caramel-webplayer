import { describe, expect, it } from 'vitest';
import {
  buildLayout,
  cellRect,
  derivedHeight,
  frameCount,
  rowsFor,
  splitSprites,
} from '../src/layout.js';

describe('frameCount', () => {
  it('counts one frame per interval start before the end', () => {
    expect(frameCount(35, 5)).toBe(7);
    expect(frameCount(30, 5)).toBe(6);
    expect(frameCount(31, 5)).toBe(7);
    expect(frameCount(0.5, 5)).toBe(1);
    expect(frameCount(0, 5)).toBe(0);
  });

  it('handles fractional intervals', () => {
    expect(frameCount(10, 2.5)).toBe(4);
    expect(frameCount(10.1, 2.5)).toBe(5);
  });

  it('rejects a non positive interval', () => {
    expect(() => frameCount(10, 0)).toThrow(RangeError);
  });
});

describe('rowsFor and splitSprites', () => {
  it('computes rows including a partial last row', () => {
    expect(rowsFor(10, 10)).toBe(1);
    expect(rowsFor(11, 10)).toBe(2);
    expect(rowsFor(3, 10)).toBe(1);
    expect(rowsFor(0, 10)).toBe(0);
  });

  it('splits frames into sprites by max frames', () => {
    expect(splitSprites(250, 100, 10)).toEqual([
      { index: 0, start: 0, count: 100, rows: 10 },
      { index: 1, start: 100, count: 100, rows: 10 },
      { index: 2, start: 200, count: 50, rows: 5 },
    ]);
  });

  it('keeps a single sprite when frames fit', () => {
    expect(splitSprites(7, 100, 10)).toEqual([{ index: 0, start: 0, count: 7, rows: 1 }]);
    expect(splitSprites(0, 100, 10)).toEqual([]);
  });
});

describe('cellRect', () => {
  it('places frames row by row', () => {
    expect(cellRect(0, 3, 240, 136)).toEqual({ x: 0, y: 0, w: 240, h: 136 });
    expect(cellRect(2, 3, 240, 136)).toEqual({ x: 480, y: 0, w: 240, h: 136 });
    expect(cellRect(3, 3, 240, 136)).toEqual({ x: 0, y: 136, w: 240, h: 136 });
    expect(cellRect(7, 3, 240, 136)).toEqual({ x: 240, y: 272, w: 240, h: 136 });
  });
});

describe('derivedHeight', () => {
  it('keeps the aspect ratio with an even height', () => {
    expect(derivedHeight(1920, 1080, 240)).toBe(136);
    expect(derivedHeight(1280, 720, 240)).toBe(136);
    expect(derivedHeight(1080, 1920, 240)).toBe(426);
    expect(derivedHeight(100, 1, 240)).toBe(2);
  });
});

describe('buildLayout', () => {
  it('builds a single sprite with a partial row', () => {
    const layout = buildLayout({
      duration: 35,
      interval: 5,
      columns: 4,
      maxFrames: 100,
      frameWidth: 240,
      frameHeight: 136,
    });
    expect(layout.frames).toHaveLength(7);
    expect(layout.sprites).toEqual([
      { index: 0, start: 0, count: 7, rows: 2, width: 960, height: 272 },
    ]);
    expect(layout.frames[4]).toEqual({
      index: 4,
      sprite: 0,
      start: 20,
      end: 25,
      rect: { x: 0, y: 136, w: 240, h: 136 },
    });
  });

  it('spreads frames over multiple sprites with local coordinates', () => {
    const layout = buildLayout({
      duration: 62,
      interval: 5,
      columns: 3,
      maxFrames: 6,
      frameWidth: 100,
      frameHeight: 50,
    });
    expect(layout.frames).toHaveLength(13);
    expect(layout.sprites.map((s) => [s.count, s.rows, s.width, s.height])).toEqual([
      [6, 2, 300, 100],
      [6, 2, 300, 100],
      [1, 1, 300, 50],
    ]);
    expect(layout.frames[6]).toMatchObject({ sprite: 1, start: 30, end: 35, rect: { x: 0, y: 0 } });
    expect(layout.frames[11]).toMatchObject({ sprite: 1, rect: { x: 200, y: 50 } });
    expect(layout.frames[12]).toMatchObject({ sprite: 2, start: 60, end: 62, rect: { x: 0, y: 0 } });
  });

  it('clamps the final cue to the duration', () => {
    const layout = buildLayout({
      duration: 12.5,
      interval: 5,
      columns: 10,
      maxFrames: 100,
      frameWidth: 10,
      frameHeight: 10,
    });
    expect(layout.frames.map((f) => [f.start, f.end])).toEqual([
      [0, 5],
      [5, 10],
      [10, 12.5],
    ]);
  });

  it('uses a known frame count and ends the last cue at the duration', () => {
    const layout = buildLayout({
      duration: 34.9,
      frames: 7,
      interval: 5,
      columns: 10,
      maxFrames: 100,
      frameWidth: 10,
      frameHeight: 10,
    });
    expect(layout.frames).toHaveLength(7);
    expect(layout.frames.at(-1)).toMatchObject({ start: 30, end: 34.9 });
    expect(layout.duration).toBe(34.9);
  });

  it('falls back to a full interval when the duration ends before the last frame', () => {
    const layout = buildLayout({
      duration: 29,
      frames: 7,
      interval: 5,
      columns: 10,
      maxFrames: 100,
      frameWidth: 10,
      frameHeight: 10,
    });
    expect(layout.frames.at(-1)).toMatchObject({ start: 30, end: 35 });
    expect(layout.duration).toBe(35);
  });
});
