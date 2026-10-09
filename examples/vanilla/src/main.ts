import '@esershnr/caramel-theme/tokens.css';
import '@esershnr/caramel-theme/fonts.css';
import '@esershnr/caramel-skin/define';
import '@esershnr/caramel-skip-segments/define';
import '@esershnr/caramel-chapters/define';
import '@esershnr/caramel-playlist/define';
import '@videojs/html/media/hls-video';
import { mountSkin } from '@esershnr/caramel-skin';
import { watchTheme } from '@esershnr/caramel-theme';
import type { Segment, SkipEventDetail } from '@esershnr/caramel-skip-segments';
import type { PlaylistItem } from '@esershnr/caramel-playlist';
import { PLAYLIST } from './playlist-data';
import { loadManifest } from './manifest';

// Player ------------------------------------------------------------------
// The playlist controller fills in src, title, poster, tracks and segments for
// the current item, so the media starts empty.
const player = document.querySelector<HTMLElement>('#player')!;

const media = document.createElement('hls-video');
media.setAttribute('playsinline', '');
media.setAttribute('crossorigin', 'anonymous');
media.setAttribute('preload', 'metadata');

const skip = document.createElement('caramel-skip-segments');
skip.setAttribute('auto-skip', 'recap');

const playlist = document.createElement('caramel-playlist');
playlist.id = 'playlist';
playlist.setAttribute('list-id', 'demo');
playlist.items = PLAYLIST;

mountSkin(player, { media, extras: [skip, playlist], uid: 'demo' });

// encode-hls output, when present: `pnpm --filter @esershnr/caramel-encode-hls start -- media/<slug> --base-url ...`
// The Vite plugin serves repo `out/` under /out/ with Range support.
const R2_MANIFEST = 'https://cdn.esersahiner.com/videos/openwrt-rehber/v1/manifest.json';
void Promise.all([
  loadManifest('/out/openwrt-rehber/manifest.json', `${location.origin}/out/openwrt-rehber/`),
  loadManifest(R2_MANIFEST).then((item) =>
    item ? { ...item, id: `${item.id}-r2`, title: `${item.title} (R2)` } : null,
  ),
]).then((extra) => {
  playlist.items = [...PLAYLIST, ...extra.filter((item): item is NonNullable<typeof item> => item !== null)];
});

// Event log ---------------------------------------------------------------
const log = document.querySelector<HTMLOListElement>('#event-log')!;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function addLog(text: string) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} ${text}`;
  log.prepend(li);
  while (log.children.length > 30) log.lastElementChild?.remove();
}

skip.addEventListener('caramel-skip', (e) => {
  const { segment, auto, to } = (e as CustomEvent<SkipEventDetail>).detail;
  addLog(`${auto ? 'auto-skip' : 'skip'} ${segment.type} -> ${fmt(to)}`);
});
skip.addEventListener('caramel-segment-enter', (e) => {
  addLog(`enter ${(e as CustomEvent<{ segment: Segment }>).detail.segment.type}`);
});
playlist.addEventListener('caramel-playlist-change', (e) => {
  const { item, index } = (e as CustomEvent<{ item: PlaylistItem; index: number }>).detail;
  addLog(`playlist ${index + 1}/${playlist.items.length} ${item.title}`);
});
playlist.addEventListener('caramel-playlist-ended', () => addLog('playlist ended'));
document.querySelector('caramel-chapters-panel')?.addEventListener('caramel-chapter-select', (e) => {
  const { cue } = (e as CustomEvent<{ cue: { text: string; startTime: number } }>).detail;
  addLog(`chapter ${cue.text} @ ${fmt(cue.startTime)}`);
});

// Theme switch ------------------------------------------------------------
// `?theme=light|dark` preselects a theme (handy for screenshots).
const preset = new URLSearchParams(location.search).get('theme');
if (preset === 'light' || preset === 'dark') {
  document.documentElement.dataset['theme'] = preset;
  document
    .querySelectorAll<HTMLButtonElement>('[data-theme-choice]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset['themeChoice'] === preset)));
}

const resolved = document.querySelector<HTMLElement>('#resolved-theme')!;
watchTheme((theme) => {
  resolved.textContent = `çözülen: ${theme}`;
});

document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((button) => {
  button.addEventListener('click', () => {
    const choice = button.dataset['themeChoice'];
    if (choice === 'system') delete document.documentElement.dataset['theme'];
    else document.documentElement.dataset['theme'] = choice;
    document
      .querySelectorAll<HTMLButtonElement>('[data-theme-choice]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  });
});

// Language switch ---------------------------------------------------------
const i18n = document.querySelector<HTMLElement>('#i18n')!;
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => {
    const lang = button.dataset['lang']!;
    i18n.setAttribute('lang', lang);
    document.documentElement.lang = lang;
    document
      .querySelectorAll<HTMLButtonElement>('[data-lang]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  });
});
