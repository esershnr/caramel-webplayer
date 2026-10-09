import type { PlaylistItem } from '@esersahiner/player-playlist';

/**
 * Loads an encode-hls manifest and optionally rewrites its absolute URLs to a
 * local prefix (the Vite dev server serves `out/` under `/out/`). Returns null
 * when the manifest is missing (nothing encoded yet).
 */
export async function loadManifest(url: string, localBase?: string): Promise<PlaylistItem | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const item = (await res.json()) as PlaylistItem;
    if (!localBase) return item;
    const remoteBase = item.src.slice(0, item.src.lastIndexOf('/') + 1);
    const swap = (value: string) => (value.startsWith(remoteBase) ? localBase + value.slice(remoteBase.length) : value);
    item.src = swap(item.src);
    if (item.poster) item.poster = swap(item.poster);
    if (item.thumbnails) item.thumbnails = swap(item.thumbnails);
    if (typeof item.chapters === 'string') item.chapters = swap(item.chapters);
    else if (item.chapters) {
      for (const [lang, value] of Object.entries(item.chapters)) item.chapters[lang] = swap(value);
    }
    item.subtitles = item.subtitles?.map((s) => ({ ...s, src: swap(s.src) }));
    return item;
  } catch {
    return null;
  }
}
