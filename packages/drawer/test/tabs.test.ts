import { describe, expect, it } from 'vitest';
import { chaptersPresent, resolveTab, visibleTabs } from '../src/tabs.js';

describe('visibleTabs', () => {
  it('keeps the order chapters, playlist', () => {
    expect(visibleTabs({ chapters: true, playlist: true })).toEqual(['chapters', 'playlist']);
    expect(visibleTabs({ chapters: false, playlist: true })).toEqual(['playlist']);
    expect(visibleTabs({ chapters: true, playlist: false })).toEqual(['chapters']);
    expect(visibleTabs({ chapters: false, playlist: false })).toEqual([]);
  });
});

describe('resolveTab', () => {
  it('keeps the current tab while it is visible', () => {
    expect(resolveTab('playlist', ['chapters', 'playlist'], 'chapters')).toBe('playlist');
  });

  it('falls back to the remembered tab when the current one is gone', () => {
    expect(resolveTab('chapters', ['playlist'], 'playlist')).toBe('playlist');
    expect(resolveTab(null, ['chapters', 'playlist'], 'playlist')).toBe('playlist');
  });

  it('falls back to the first visible tab', () => {
    expect(resolveTab(null, ['chapters', 'playlist'], null)).toBe('chapters');
    expect(resolveTab('chapters', ['playlist'], 'chapters')).toBe('playlist');
  });

  it('returns null when nothing is visible', () => {
    expect(resolveTab('chapters', [], 'playlist')).toBeNull();
    expect(resolveTab(null, [], null)).toBeNull();
  });
});

describe('chaptersPresent', () => {
  it('is present with cues, whatever the track says', () => {
    expect(chaptersPresent({ cueCount: 3, track: null })).toBe(true);
    expect(chaptersPresent({ cueCount: 1, track: { readyState: 3, mode: 'disabled' } })).toBe(true);
  });

  it('is absent without cues and without a track', () => {
    expect(chaptersPresent({ cueCount: 0, track: null })).toBe(false);
  });

  it('stays present while the track is pending (no flicker on item switch)', () => {
    expect(chaptersPresent({ cueCount: 0, track: { readyState: 0, mode: 'hidden' } })).toBe(true);
    expect(chaptersPresent({ cueCount: 0, track: { readyState: 1, mode: 'showing' } })).toBe(true);
  });

  it('is absent when the track loaded with zero cues', () => {
    expect(chaptersPresent({ cueCount: 0, track: { readyState: 2, mode: 'hidden' } })).toBe(false);
  });

  it('is absent when the track failed to load', () => {
    expect(chaptersPresent({ cueCount: 0, track: { readyState: 3, mode: 'hidden' } })).toBe(false);
  });

  it('is absent when the track is disabled (it never loads)', () => {
    expect(chaptersPresent({ cueCount: 0, track: { readyState: 0, mode: 'disabled' } })).toBe(false);
  });
});
