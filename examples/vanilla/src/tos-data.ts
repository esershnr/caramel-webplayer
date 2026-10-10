import type { PlaylistItem } from '@esershnr/caramel-playlist';

// Tears of Steel (CC) Blender Foundation | mango.blender.org, CC BY 3.0.
// Clips, posters, chapters, subtitles and storyboards come from
// `node tools/tos-demo.mjs` (public/tos/, not committed; the Pages workflow builds them).
const base = `${import.meta.env.BASE_URL}tos/`;

function clip(name: string, title: string, duration: number, segments: PlaylistItem['segments']): PlaylistItem {
  return {
    id: `tos-${name}`,
    title,
    src: `${base}${name}.mp4`,
    poster: `${base}${name}.jpg`,
    chapters: { tr: `${base}${name}.chapters.tr.vtt`, en: `${base}${name}.chapters.en.vtt` },
    thumbnails: `${base}${name}-thumbs.vtt`,
    subtitles: [
      { src: `${base}${name}.tr.vtt`, srclang: 'tr', label: 'Türkçe' },
      { src: `${base}${name}.en.vtt`, srclang: 'en', label: 'English' },
    ],
    segments,
    duration,
  };
}

/** Three Tears of Steel clips that exercise every segment type, chapters and subtitles. */
export const TOS_PLAYLIST: PlaylistItem[] = [
  clip('opening', 'Tears of Steel: opening', 50, [
    { start: 0, end: 9, type: 'intro' },
    { start: 16, end: 22, type: 'sponsor' },
  ]),
  clip('simulation', 'Tears of Steel: simulation', 42, [{ start: 0, end: 7, type: 'recap' }]),
  clip('finale', 'Tears of Steel: finale', 50, [{ start: 36, end: 50, type: 'outro' }]),
];
