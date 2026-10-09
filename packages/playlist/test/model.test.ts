import { describe, expect, it, vi } from 'vitest';
import { PlaylistModel, normalizeItems } from '../src/model.js';
import type { PlaylistItem } from '../src/types.js';

const ITEMS: PlaylistItem[] = [
  { id: 'a', title: 'A', src: 'a.mp4' },
  { id: 'b', title: 'B', src: 'b.m3u8' },
  { id: 'c', title: 'C', src: 'c.mp4' },
];

function model(options = {}, start = 0) {
  const m = new PlaylistModel(options);
  m.setItems(ITEMS, start);
  return m;
}

describe('PlaylistModel', () => {
  it('starts empty', () => {
    const m = new PlaylistModel();
    expect(m.index).toBe(-1);
    expect(m.current).toBeNull();
    expect(m.hasNext).toBe(false);
    expect(m.hasPrevious).toBe(false);
    expect(m.next()).toBe(false);
    expect(m.onEnded()).toBeNull();
  });

  it('clamps the start index', () => {
    expect(model({}, 5).index).toBe(2);
    expect(model({}, -3).index).toBe(0);
    expect(model({}, 1.7).index).toBe(1);
    const m = new PlaylistModel();
    m.setItems([], 2);
    expect(m.index).toBe(-1);
  });

  it('selects by index and by id', () => {
    const m = model();
    expect(m.select(2)).toBe(true);
    expect(m.current?.id).toBe('c');
    expect(m.select('b')).toBe(true);
    expect(m.index).toBe(1);
    expect(m.select('zzz')).toBe(false);
    expect(m.select(3)).toBe(false);
    expect(m.select(-1)).toBe(false);
    expect(m.select(0.5)).toBe(false);
    expect(m.index).toBe(1);
  });

  it('moves next and previous within bounds', () => {
    const m = model();
    expect(m.hasPrevious).toBe(false);
    expect(m.previous()).toBe(false);
    expect(m.next()).toBe(true);
    expect(m.next()).toBe(true);
    expect(m.index).toBe(2);
    expect(m.hasNext).toBe(false);
    expect(m.next()).toBe(false);
    expect(m.index).toBe(2);
    expect(m.previous()).toBe(true);
    expect(m.index).toBe(1);
  });

  it('wraps when loop is on', () => {
    const m = model({ loop: true }, 2);
    expect(m.hasNext).toBe(true);
    expect(m.next()).toBe(true);
    expect(m.index).toBe(0);
    expect(m.hasPrevious).toBe(true);
    expect(m.previous()).toBe(true);
    expect(m.index).toBe(2);
  });

  it('onEnded returns the next index, wraps with loop, null at the end', () => {
    const m = model();
    expect(m.onEnded()).toBe(1);
    expect(m.index).toBe(0);
    m.select(2);
    expect(m.onEnded()).toBeNull();
    m.loop = true;
    expect(m.onEnded()).toBe(0);
  });

  it('onEnded returns null when auto advance is off', () => {
    const m = model({ autoAdvance: false });
    expect(m.onEnded()).toBeNull();
    m.autoAdvance = true;
    expect(m.onEnded()).toBe(1);
  });

  it('single item with loop restarts itself', () => {
    const m = new PlaylistModel({ loop: true });
    m.setItems([ITEMS[0]!]);
    expect(m.onEnded()).toBe(0);
    expect(m.hasNext).toBe(true);
  });

  it('notifies subscribers on changes and stops after unsubscribe', () => {
    const m = model();
    const spy = vi.fn();
    const off = m.subscribe(spy);
    m.select(0);
    expect(spy).not.toHaveBeenCalled();
    m.select(1);
    expect(spy).toHaveBeenCalledTimes(1);
    m.next();
    m.previous();
    m.loop = true;
    m.loop = true;
    expect(spy).toHaveBeenCalledTimes(4);
    off();
    m.next();
    expect(spy).toHaveBeenCalledTimes(4);
  });

  it('copies the items array', () => {
    const list = [...ITEMS];
    const m = new PlaylistModel();
    m.setItems(list);
    list.pop();
    expect(m.items).toHaveLength(3);
  });
});

describe('normalizeItems', () => {
  it('keeps valid items and drops the rest', () => {
    const result = normalizeItems([
      { id: 'a', title: 'A', src: 'a.mp4', duration: 12.5, poster: 'p.jpg' },
      { id: 'b', src: 'b.mp4' },
      { title: 'no id', src: 'x.mp4' },
      { id: 'c', title: 'C' },
      null,
      'nope',
      { id: 'd', title: 'D', src: 'd.mp4', duration: Number.NaN, chapters: 7 },
    ]);
    expect(result.map((i) => i.id)).toEqual(['a', 'b', 'd']);
    expect(result[0]).toMatchObject({ duration: 12.5, poster: 'p.jpg' });
    expect(result[1]?.title).toBe('');
    expect(result[2]).not.toHaveProperty('duration');
    expect(result[2]).not.toHaveProperty('chapters');
  });

  it('returns an empty list for non arrays', () => {
    expect(normalizeItems(null)).toEqual([]);
    expect(normalizeItems({})).toEqual([]);
    expect(normalizeItems('[]')).toEqual([]);
  });
});

describe('normalizeItems input validation', () => {
  it('drops malformed subtitle entries and keeps valid ones', async () => {
    const { normalizeItems } = await import('../src/model.js');
    const [item] = normalizeItems([
      {
        id: 'a',
        src: 'a.mp4',
        subtitles: [{ src: '/tr.vtt', srclang: 'tr', label: 'TR' }, { src: 1 }, null, 'x'],
      },
    ]);
    expect(item?.subtitles).toEqual([{ src: '/tr.vtt', srclang: 'tr', label: 'TR' }]);
  });

  it('omits subtitles entirely when none are valid', async () => {
    const { normalizeItems } = await import('../src/model.js');
    const [item] = normalizeItems([{ id: 'a', src: 'a.mp4', subtitles: [{ label: 'x' }] }]);
    expect(item?.subtitles).toBeUndefined();
  });
});
