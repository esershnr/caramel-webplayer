import { formatVttTime } from './time.js';

export interface ChapterInput {
  /** Start in seconds. */
  at: number;
  /** Titles by language. */
  titles: Record<string, string>;
}

/**
 * Chapter cues for one language. Each chapter ends where the next starts;
 * the last one ends at the media duration.
 */
export function chaptersToVtt(chapters: readonly ChapterInput[], lang: string, duration: number): string {
  const sorted = [...chapters].sort((a, b) => a.at - b.at);
  const lines = ['WEBVTT', ''];
  sorted.forEach((chapter, i) => {
    const end = i + 1 < sorted.length ? sorted[i + 1]!.at : duration;
    const title = chapter.titles[lang] ?? chapter.titles['en'] ?? Object.values(chapter.titles)[0] ?? '';
    lines.push(`${formatVttTime(chapter.at)} --> ${formatVttTime(end)}`);
    lines.push(title);
    lines.push('');
  });
  return lines.join('\n');
}
