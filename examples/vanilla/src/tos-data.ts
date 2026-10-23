import type { PlaylistItem } from '@esershnr/caramel-playlist';

// Tears of Steel (CC) Blender Foundation | mango.blender.org, CC BY 3.0.
// Clips, posters, chapters, subtitles and storyboards come from
// `node tools/tos-demo.mjs` (public/tos/, not committed; the Pages workflow builds them).
const base = `${import.meta.env.BASE_URL}tos/`;

interface ClipOptions {
  /** Display group (season name). Consecutive items with the same group share a header. */
  group?: string;
  /** `false` leaves the item without a chapters track, so the chapters tab does not show. */
  chapters?: boolean;
}

function clip(
  name: string,
  title: string,
  duration: number,
  segments: PlaylistItem['segments'],
  options: ClipOptions = {},
): PlaylistItem {
  const item: PlaylistItem = {
    id: `tos-${name}`,
    title,
    src: `${base}${name}.mp4`,
    poster: `${base}${name}.jpg`,
    thumbnails: `${base}${name}-thumbs.vtt`,
    subtitles: [
      { src: `${base}${name}.tr.vtt`, srclang: 'tr', label: 'Türkçe' },
      { src: `${base}${name}.en.vtt`, srclang: 'en', label: 'English' },
    ],
    segments,
    duration,
  };
  if (options.chapters !== false) {
    item.chapters = { tr: `${base}${name}.chapters.tr.vtt`, en: `${base}${name}.chapters.en.vtt` };
  }
  if (options.group !== undefined) item.group = options.group;
  return item;
}

/** Three Tears of Steel clips that exercise every segment type, chapters, subtitles and groups. */
export function tosPlaylist(lang: 'tr' | 'en'): PlaylistItem[] {
  const season1 = lang === 'tr' ? '1. Sezon' : 'Season 1';
  const season2 = lang === 'tr' ? '2. Sezon' : 'Season 2';
  return [
    clip(
      'opening',
      'Tears of Steel: opening',
      50,
      [
        { start: 0, end: 9, type: 'intro' },
        { start: 16, end: 22, type: 'sponsor' },
      ],
      { group: season1 },
    ),
    // No chapters: the drawer's chapters tab disappears while this item plays.
    clip('simulation', 'Tears of Steel: simulation', 42, [{ start: 0, end: 7, type: 'recap' }], {
      group: season1,
      chapters: false,
    }),
    clip('finale', 'Tears of Steel: finale', 50, [{ start: 36, end: 50, type: 'outro' }], { group: season2 }),
  ];
}

/** The Turkish list, for code that still imports the constant. */
export const TOS_PLAYLIST: PlaylistItem[] = tosPlaylist('tr');
