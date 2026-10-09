import '@esersahiner/player-theme/tokens.css';
import '@esersahiner/player-theme/fonts.css';
import '@esersahiner/player-skin/define';
import '@esersahiner/player-skip-segments/define';
import { mountSkin } from '@esersahiner/player-skin';
import { watchTheme } from '@esersahiner/player-theme';
import type { Segment, SkipEventDetail } from '@esersahiner/player-skip-segments';

const MEDIA = 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4';
const POSTER = 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.jpg';
const STORYBOARD = 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/storyboard.vtt';

const SEGMENTS: Segment[] = [
  { start: 0, end: 6, type: 'intro' },
  { start: 8, end: 13, type: 'recap' },
  { start: 18, end: 23, type: 'sponsor' },
  { start: 30, end: 35, type: 'outro' },
];

// Player ------------------------------------------------------------------
const player = document.querySelector<HTMLElement>('#player')!;
player.setAttribute('content-title', 'Demo: segmentler, bölümler, önizleme');
player.setAttribute('poster', POSTER);

const video = document.createElement('video');
video.src = MEDIA;
video.playsInline = true;
video.crossOrigin = 'anonymous';
video.preload = 'metadata';

const chapters = document.createElement('track');
chapters.kind = 'chapters';
chapters.src = '/chapters.vtt';
chapters.srclang = 'tr';
chapters.default = true;

const thumbnails = document.createElement('track');
thumbnails.kind = 'metadata';
thumbnails.label = 'thumbnails';
thumbnails.src = STORYBOARD;
thumbnails.default = true;

video.append(chapters, thumbnails);

const skip = document.createElement('esp-skip-segments');
skip.setAttribute('segments', JSON.stringify(SEGMENTS));
skip.setAttribute('auto-skip', 'recap');

mountSkin(player, { media: video, extras: [skip], uid: 'demo' });

// Side panel --------------------------------------------------------------
const list = document.querySelector<HTMLUListElement>('#segment-list')!;
const log = document.querySelector<HTMLOListElement>('#event-log')!;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
for (const segment of SEGMENTS) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="type">${segment.type}</span><span class="esp-tabular">${fmt(segment.start)} - ${fmt(segment.end)}</span>`;
  list.append(li);
}

function addLog(text: string) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} ${text}`;
  log.prepend(li);
  while (log.children.length > 30) log.lastElementChild?.remove();
}

skip.addEventListener('esp-skip', (e) => {
  const { segment, auto, to } = (e as CustomEvent<SkipEventDetail>).detail;
  addLog(`${auto ? 'auto-skip' : 'skip'} ${segment.type} -> ${fmt(to)}`);
});
skip.addEventListener('esp-segment-enter', (e) => {
  const { segment } = (e as CustomEvent<{ segment: Segment }>).detail;
  addLog(`enter ${segment.type}`);
  list.querySelectorAll('li').forEach((li, i) => li.toggleAttribute('data-active', SEGMENTS[i] === segment));
});
skip.addEventListener('esp-segment-leave', () => {
  list.querySelectorAll('li').forEach((li) => li.removeAttribute('data-active'));
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
    document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  });
});
