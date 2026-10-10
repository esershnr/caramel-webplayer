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
import { TOS_PLAYLIST } from './tos-data';
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
// The demo plays the Tears of Steel clips only. On the dev server `?dev` adds the
// Mux test streams and the encode-hls output (local `out/` and the R2 copy).
const DEV_EXTRAS = import.meta.env.DEV && new URLSearchParams(location.search).has('dev');
const BASE_ITEMS = DEV_EXTRAS ? [...TOS_PLAYLIST, ...PLAYLIST] : TOS_PLAYLIST;
playlist.items = BASE_ITEMS;

mountSkin(player, { media, extras: [skip, playlist], uid: 'demo' });

// encode-hls output, when present: `pnpm --filter @esershnr/caramel-encode-hls start -- media/<slug> --base-url ...`
// The Vite plugin serves repo `out/` under /out/ with Range support.
const R2_MANIFEST = 'https://cdn.esersahiner.com/videos/openwrt-rehber/v1/manifest.json';
if (DEV_EXTRAS) {
  void Promise.all([
    loadManifest('/out/openwrt-rehber/manifest.json', `${location.origin}/out/openwrt-rehber/`),
    loadManifest(R2_MANIFEST).then((item) =>
      item ? { ...item, id: `${item.id}-r2`, title: `${item.title} (R2)` } : null,
    ),
  ]).then((extra) => {
    playlist.items = [...BASE_ITEMS, ...extra.filter((item): item is NonNullable<typeof item> => item !== null)];
  });
}

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

// Page chrome strings; the player and the panels translate themselves.
const STRINGS = {
  tr: {
    theme: 'Tema',
    language: 'Dil',
    light: 'Açık',
    dark: 'Koyu',
    system: 'Sistem',
    resolved: 'çözülen',
    bands: 'Zaman çizelgesi bantları',
    bandsHint: 'Çizgili bant otomatik atlanır (demo: özet). Önizleme kartı fare bandın üstündeyken türü gösterir.',
    intro: 'İntro',
    recap: 'Özet (otomatik atlanır)',
    outro: 'Jenerik',
    events: 'Olaylar',
  },
  en: {
    theme: 'Theme',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    resolved: 'resolved',
    bands: 'Timeline segment bands',
    bandsHint:
      'The striped band is skipped automatically (demo: recap). The preview card shows the type while hovering a band.',
    intro: 'Intro',
    recap: 'Recap (auto-skipped)',
    outro: 'Credits',
    events: 'Events',
  },
};
type Lang = keyof typeof STRINGS;
let strings = STRINGS.tr;
let resolvedTheme = '';

const resolved = document.querySelector<HTMLElement>('#resolved-theme')!;
const renderResolved = () => {
  resolved.textContent = `${strings.resolved}: ${resolvedTheme}`;
};
watchTheme((theme) => {
  resolvedTheme = theme;
  renderResolved();
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
// `?lang=en|tr` preselects a language (handy for screenshots).
const i18n = document.querySelector<HTMLElement>('#i18n')!;

function setLang(lang: Lang) {
  strings = STRINGS[lang];
  i18n.setAttribute('lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = strings[el.dataset['i18n'] as keyof typeof strings];
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', strings[el.dataset['i18nLabel'] as keyof typeof strings]);
  });
  document
    .querySelectorAll<HTMLButtonElement>('[data-lang]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset['lang'] === lang)));
  renderResolved();
}

document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => setLang(button.dataset['lang'] as Lang));
});

const langPreset = new URLSearchParams(location.search).get('lang');
if (langPreset === 'en' || langPreset === 'tr') setLang(langPreset);
