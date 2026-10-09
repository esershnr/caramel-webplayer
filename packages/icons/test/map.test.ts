import { describe, expect, it } from 'vitest';
import { parseIconRules, pickIcon, rulesFromOnOff, watchedAttributes } from '../src/map.js';

const attrs = (state: Record<string, string>) => (name: string) => state[name] ?? null;

describe('parseIconRules', () => {
  it('parses presence, equality and wildcard rules in order', () => {
    const rules = parseIconRules('data-ended:restart, data-volume-level=low:volume-low ,*:volume-high');
    expect(rules).toEqual([
      { attr: 'data-ended', value: null, icon: 'restart' },
      { attr: 'data-volume-level', value: 'low', icon: 'volume-low' },
      { attr: null, value: null, icon: 'volume-high' },
    ]);
  });

  it('ignores malformed entries', () => {
    expect(parseIconRules('nocolon,,high:,:x,')).toEqual([]);
    expect(parseIconRules(undefined)).toEqual([]);
  });
});

describe('pickIcon', () => {
  const play = parseIconRules('data-ended:restart,data-paused:play,*:pause');

  it('returns the first matching rule', () => {
    expect(pickIcon(play, attrs({ 'data-ended': '', 'data-paused': '' }))).toBe('restart');
    expect(pickIcon(play, attrs({ 'data-paused': '' }))).toBe('play');
    expect(pickIcon(play, attrs({}))).toBe('pause');
  });

  it('matches attribute values exactly', () => {
    const mute = parseIconRules('data-muted:volume-off,data-volume-level=low:volume-low,*:volume-high');
    expect(pickIcon(mute, attrs({ 'data-volume-level': 'low' }))).toBe('volume-low');
    expect(pickIcon(mute, attrs({ 'data-volume-level': 'high' }))).toBe('volume-high');
    expect(pickIcon(mute, attrs({ 'data-muted': '', 'data-volume-level': 'low' }))).toBe('volume-off');
  });

  it('returns undefined without a fallback', () => {
    expect(pickIcon(parseIconRules('a:x'), attrs({}))).toBeUndefined();
  });
});

describe('rulesFromOnOff and watchedAttributes', () => {
  it('builds the shorthand rules', () => {
    const rules = rulesFromOnOff('data-paused', 'play', 'pause');
    expect(pickIcon(rules, attrs({ 'data-paused': '' }))).toBe('play');
    expect(pickIcon(rules, attrs({}))).toBe('pause');
    expect(watchedAttributes(rules)).toEqual(['data-paused']);
  });

  it('lists distinct watched attributes in order', () => {
    const rules = parseIconRules('data-muted:a,data-volume-level=low:b,data-muted:c,*:d');
    expect(watchedAttributes(rules)).toEqual(['data-muted', 'data-volume-level']);
  });
});
