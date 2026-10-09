import type { PlaylistItem } from '@esershnr/caramel-playlist';

const BIKE = 'BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM';
const SECOND = '601n4w1fq88NJiVpzvrQQeQfNnnjjfKMIN7dCGAEarTs';

/** Three items: HLS with Mux storyboard, MP4 with a gen-thumbs sprite, a second HLS clip. */
export const PLAYLIST: PlaylistItem[] = [
  {
    id: 'bike-hls',
    title: 'Bisiklet (HLS, Mux storyboard)',
    src: `https://stream.mux.com/${BIKE}.m3u8`,
    poster: `https://image.mux.com/${BIKE}/thumbnail.jpg`,
    chapters: '/chapters.vtt',
    thumbnails: `https://image.mux.com/${BIKE}/storyboard.vtt`,
    subtitles: [
      { src: '/subs-tr.vtt', srclang: 'tr', label: 'Türkçe' },
      { src: '/subs-en.vtt', srclang: 'en', label: 'English' },
    ],
    segments: [
      { start: 0, end: 6, type: 'intro' },
      { start: 8, end: 13, type: 'recap' },
      { start: 18, end: 23, type: 'sponsor' },
      { start: 30, end: 35, type: 'outro' },
    ],
    duration: 36,
  },
  {
    id: 'bike-mp4',
    title: 'Bisiklet (MP4, gen-thumbs sprite)',
    src: `https://stream.mux.com/${BIKE}/highest.mp4`,
    poster: `https://image.mux.com/${BIKE}/thumbnail.jpg?time=10`,
    chapters: '/chapters.vtt',
    // Generated with: esp-gen-thumbs <mp4> --interval 2 --columns 6 --out public/thumbs --name bike --base-url /thumbs
    thumbnails: '/thumbs/bike.vtt',
    segments: [
      { start: 0, end: 4, type: 'intro' },
      { start: 28, end: 35, type: 'outro' },
    ],
    duration: 36,
  },
  {
    id: 'second',
    title: 'İkinci klip (HLS)',
    src: `https://stream.mux.com/${SECOND}.m3u8`,
    poster: `https://image.mux.com/${SECOND}/thumbnail.jpg`,
    chapters: '/chapters2.vtt',
    thumbnails: `https://image.mux.com/${SECOND}/storyboard.vtt`,
    segments: [{ start: 0, end: 4, type: 'intro' }],
    duration: 17,
  },
];
