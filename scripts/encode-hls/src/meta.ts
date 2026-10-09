import { parse } from 'yaml';
import { parseTime } from './time.js';

export const SEGMENT_TYPES = ['intro', 'recap', 'outro', 'sponsor'] as const;
export type SegmentType = (typeof SEGMENT_TYPES)[number];

export interface MetaChapter {
  at: number;
  titles: Record<string, string>;
}

export interface MetaSegment {
  type: SegmentType;
  start: number;
  end: number;
}

export interface MetaSubtitle {
  lang: string;
  label: string;
  file: string;
  default: boolean;
}

export interface Meta {
  slug: string;
  title: Record<string, string>;
  poster: number | null;
  chapters: MetaChapter[];
  segments: MetaSegment[];
  subtitles: MetaSubtitle[];
}

export class MetaError extends Error {
  constructor(public readonly problems: string[]) {
    super(
      `meta.yaml has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ${problems.join('\n  - ')}`,
    );
    this.name = 'MetaError';
  }
}

export interface ValidateContext {
  /** Media duration in seconds. */
  duration: number;
  /** Returns true when a subtitle file (relative to the media folder) exists. */
  fileExists: (relative: string) => boolean;
  /** Folder name, must match `slug`. */
  folderName?: string | undefined;
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Parses and validates meta.yaml text. Throws MetaError listing every problem found. */
export function parseMeta(text: string, ctx: ValidateContext): Meta {
  const problems: string[] = [];
  const raw = rec(parse(text));
  if (!raw) throw new MetaError(['the file is not a YAML mapping']);

  const slug = typeof raw['slug'] === 'string' ? raw['slug'].trim() : '';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) problems.push('slug must be lowercase letters, digits and dashes');
  if (ctx.folderName && slug && slug !== ctx.folderName) {
    problems.push(`slug "${slug}" does not match the folder name "${ctx.folderName}"`);
  }

  const title: Record<string, string> = {};
  const rawTitle = rec(raw['title']);
  if (!rawTitle) problems.push('title must be a mapping of language to text (tr, en)');
  else {
    for (const [lang, value] of Object.entries(rawTitle)) {
      if (typeof value === 'string' && value.trim()) title[lang] = value.trim();
      else problems.push(`title.${lang} must be a non-empty string`);
    }
    if (!title['tr']) problems.push('title.tr is required');
    if (!title['en']) problems.push('title.en is required');
  }

  let poster: number | null = null;
  if (raw['poster'] !== undefined && raw['poster'] !== null) {
    try {
      poster = parseTime(raw['poster'], 'poster');
      if (poster > ctx.duration)
        problems.push(`poster ${raw['poster']} is past the end of the video (${ctx.duration.toFixed(1)} s)`);
    } catch (error) {
      problems.push((error as Error).message);
    }
  }

  const chapters: MetaChapter[] = [];
  if (!Array.isArray(raw['chapters']) || raw['chapters'].length === 0) {
    problems.push('chapters must be a non-empty list');
  } else {
    raw['chapters'].forEach((entry, i) => {
      const c = rec(entry);
      if (!c) return problems.push(`chapters[${i}] must be a mapping`);
      let at = -1;
      try {
        at = parseTime(c['at'], `chapters[${i}].at`);
      } catch (error) {
        problems.push((error as Error).message);
      }
      const titles: Record<string, string> = {};
      for (const [key, value] of Object.entries(c)) {
        if (key === 'at') continue;
        if (typeof value === 'string' && value.trim()) titles[key] = value.trim();
      }
      if (!titles['tr'] || !titles['en']) problems.push(`chapters[${i}] needs tr and en titles`);
      if (at >= 0) {
        if (at >= ctx.duration)
          problems.push(
            `chapters[${i}] starts at ${c['at']}, past the end of the video (${ctx.duration.toFixed(1)} s)`,
          );
        const prev = chapters[chapters.length - 1];
        if (prev && at <= prev.at) problems.push(`chapters[${i}] (${c['at']}) must start after the previous chapter`);
      }
      chapters.push({ at, titles });
    });
    if (chapters[0] && chapters[0].at !== 0) problems.push('the first chapter should start at 0:00');
  }

  const segments: MetaSegment[] = [];
  if (raw['segments'] !== undefined) {
    if (!Array.isArray(raw['segments'])) problems.push('segments must be a list');
    else {
      raw['segments'].forEach((entry, i) => {
        const s = rec(entry);
        if (!s) return problems.push(`segments[${i}] must be a mapping`);
        const type = s['type'];
        if (!(SEGMENT_TYPES as readonly unknown[]).includes(type)) {
          problems.push(`segments[${i}].type must be one of ${SEGMENT_TYPES.join(', ')}`);
          return;
        }
        let start = 0;
        let end = 0;
        try {
          start = parseTime(s['start'], `segments[${i}].start`);
          end = parseTime(s['end'], `segments[${i}].end`);
        } catch (error) {
          problems.push((error as Error).message);
          return;
        }
        if (end <= start) problems.push(`segments[${i}] end (${s['end']}) must be after start (${s['start']})`);
        if (end > ctx.duration) problems.push(`segments[${i}] ends past the video (${ctx.duration.toFixed(1)} s)`);
        segments.push({ type: type as SegmentType, start, end });
      });
    }
  }

  const subtitles: MetaSubtitle[] = [];
  if (raw['subtitles'] !== undefined) {
    if (!Array.isArray(raw['subtitles'])) problems.push('subtitles must be a list');
    else {
      const langs = new Set<string>();
      raw['subtitles'].forEach((entry, i) => {
        const s = rec(entry);
        if (!s) return problems.push(`subtitles[${i}] must be a mapping`);
        const lang = typeof s['lang'] === 'string' ? s['lang'].trim() : '';
        const label = typeof s['label'] === 'string' ? s['label'].trim() : '';
        const file = typeof s['file'] === 'string' ? s['file'].trim() : '';
        if (!lang) problems.push(`subtitles[${i}].lang is required`);
        if (langs.has(lang)) problems.push(`subtitles[${i}] repeats language "${lang}"`);
        langs.add(lang);
        if (!label) problems.push(`subtitles[${i}].label is required`);
        if (!file) problems.push(`subtitles[${i}].file is required`);
        else if (!ctx.fileExists(file)) problems.push(`subtitles[${i}].file "${file}" was not found`);
        subtitles.push({ lang, label, file, default: s['default'] === true });
      });
      if (subtitles.filter((s) => s.default).length > 1) problems.push('only one subtitle can be default');
    }
  }

  if (problems.length) throw new MetaError(problems);
  return { slug, title, poster, chapters, segments, subtitles };
}
