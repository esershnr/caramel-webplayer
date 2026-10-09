/**
 * SubRip (SRT) to WebVTT conversion, dependency free.
 *
 * - strips a UTF-8 BOM, normalizes CRLF / CR to LF
 * - `00:00:04,899 --> 00:00:06,933` becomes `00:00:04.899 --> 00:00:06.933`
 * - cue numbers are dropped (WebVTT identifiers are optional and SRT numbers
 *   carry no meaning); cue settings after the arrow are kept
 * - blank lines inside a cue are not allowed in WebVTT, so they are collapsed
 * - cues without text are skipped; `-->` inside text is escaped
 */
export interface SrtCue {
  start: string;
  end: string;
  settings: string;
  text: string;
}

const TIME_LINE =
  /^\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}|\d{1,2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}|\d{1,2}:\d{2}[,.]\d{1,3})(.*)$/;

function normalizeTimestamp(value: string): string {
  const [main, fraction = '0'] = value.replace(',', '.').split('.');
  const parts = main!.split(':').map((p) => p.padStart(2, '0'));
  while (parts.length < 3) parts.unshift('00');
  return `${parts.join(':')}.${fraction.padEnd(3, '0').slice(0, 3)}`;
}

export function parseSrt(source: string): SrtCue[] {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const cues: SrtCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((line, i, arr) => !(i === arr.length - 1 && line.trim() === ''));
    if (lines.length === 0) continue;
    let i = 0;
    if (/^\s*\d+\s*$/.test(lines[0]!) && lines.length > 1 && TIME_LINE.test(lines[1]!)) i = 1;
    const time = TIME_LINE.exec(lines[i] ?? '');
    if (!time) continue;
    const body = lines
      .slice(i + 1)
      .map((line) => line.replace(/-->/g, '-→'))
      .filter((line) => line.trim() !== '')
      .join('\n')
      .trim();
    if (!body) continue;
    cues.push({
      start: normalizeTimestamp(time[1]!),
      end: normalizeTimestamp(time[2]!),
      settings: (time[3] ?? '').trim(),
      text: body,
    });
  }
  return cues;
}

export function serializeVtt(cues: readonly SrtCue[], header = 'WEBVTT'): string {
  const out = [header, ''];
  for (const cue of cues) {
    out.push(`${cue.start} --> ${cue.end}${cue.settings ? ` ${cue.settings}` : ''}`);
    out.push(cue.text);
    out.push('');
  }
  return out.join('\n');
}

export function srtToVtt(source: string): string {
  return serializeVtt(parseSrt(source));
}
