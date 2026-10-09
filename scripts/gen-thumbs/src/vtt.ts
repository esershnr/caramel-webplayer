/** WebVTT storyboard serialization. No I/O. */
import type { Layout } from './layout.js';

export interface Cue {
  start: number;
  end: number;
  text: string;
}

export interface CueOptions {
  /** Base file name of the sprites, `sprite` gives `sprite-1.jpg`. */
  name: string;
  /** Optional URL prefix placed before the sprite file name. */
  baseUrl?: string | undefined;
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Format seconds as `HH:MM:SS.mmm`. */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 1000));
  const ms = total % 1000;
  const s = Math.floor(total / 1000) % 60;
  const m = Math.floor(total / 60000) % 60;
  const h = Math.floor(total / 3600000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
}

/** File name of sprite `index` (zero based) for `name`. */
export function spriteFileName(name: string, index: number): string {
  return `${name}-${index + 1}.jpg`;
}

/** Join a base URL and a file name with exactly one slash. */
export function joinUrl(baseUrl: string | undefined, file: string): string {
  if (!baseUrl) return file;
  return baseUrl.endsWith('/') ? `${baseUrl}${file}` : `${baseUrl}/${file}`;
}

/** Build the cue list for a layout. */
export function buildCues(layout: Layout, options: CueOptions): Cue[] {
  return layout.frames.map((frame) => {
    const url = joinUrl(options.baseUrl, spriteFileName(options.name, frame.sprite));
    const { x, y, w, h } = frame.rect;
    return { start: frame.start, end: frame.end, text: `${url}#xywh=${x},${y},${w},${h}` };
  });
}

/** Serialize cues to a WebVTT document (LF line endings, trailing newline). */
export function serializeVtt(cues: Cue[]): string {
  const lines = ['WEBVTT', ''];
  for (const cue of cues) {
    lines.push(`${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`, cue.text, '');
  }
  return lines.join('\n');
}

/** Convenience: layout to VTT text in one step. */
export function layoutToVtt(layout: Layout, options: CueOptions): string {
  return serializeVtt(buildCues(layout, options));
}
