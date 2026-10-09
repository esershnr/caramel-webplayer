import type { PlaylistItem } from '@esersahiner/player-playlist';

/**
 * Loads an encode-hls manifest and optionally rewrites its absolute URLs to a
 * local prefix (the Vite dev server serves `out/` under `/out/`). Returns null
 * when the manifest is missing (nothing encoded yet).
 *
 * The storyboard VTT carries absolute sprite URLs, so for local playback it is
 * fetched, rewritten and handed to the player as a blob URL.
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
    if (typeof item.chapters === 'string') item.chapters = swap(item.chapters);
    else if (item.chapters) {
      for (const [lang, value] of Object.entries(item.chapters)) item.chapters[lang] = swap(value);
    }
    item.subtitles = item.subtitles?.map((s) => ({ ...s, src: swap(s.src) }));
    if (item.thumbnails) item.thumbnails = await rewriteVtt(swap(item.thumbnails), remoteBase, localBase);
    return item;
  } catch {
    return null;
  }
}

async function rewriteVtt(url: string, remoteBase: string, localBase: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return url;
  const text = (await res.text()).split(remoteBase).join(localBase);
  return URL.createObjectURL(new Blob([text], { type: 'text/vtt' }));
}
