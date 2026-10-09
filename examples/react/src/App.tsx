import { useCallback, useEffect, useState } from 'react';
import { EspVideoSkin } from '@esersahiner/player-skin/react';
import { SkipSegments } from '@esersahiner/player-skip-segments/react';
import { ChaptersPanel } from '@esersahiner/player-chapters/react';
import { Playlist, PlaylistPanel } from '@esersahiner/player-playlist/react';
import type { Segment, SkipEventDetail } from '@esersahiner/player-skip-segments';
import type { PlaylistItem } from '@esersahiner/player-playlist';
import { watchTheme, type Theme } from '@esersahiner/player-theme';
import { PLAYLIST } from '../../vanilla/src/playlist-data';
import { loadManifest } from '../../vanilla/src/manifest';

type Choice = 'light' | 'dark' | 'system';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const NO_SEGMENTS: Segment[] = [];
const R2_MANIFEST = 'https://cdn.esersahiner.com/videos/openwrt-rehber/v1/manifest.json';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'hls-video': {
        children?: import('react').ReactNode;
        src?: string | undefined;
        playsinline?: string | undefined;
        crossorigin?: string | undefined;
        preload?: string | undefined;
      };
    }
  }
}

export function App() {
  const [choice, setChoice] = useState<Choice>(() => {
    const preset = new URLSearchParams(location.search).get('theme');
    return preset === 'light' || preset === 'dark' ? preset : 'system';
  });
  const [resolved, setResolved] = useState<Theme>('light');
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [log, setLog] = useState<string[]>([]);
  const [items, setItems] = useState<PlaylistItem[]>(PLAYLIST);

  // encode-hls output, when present (served from repo out/ by the Vite plugin).
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadManifest('/out/openwrt-rehber/manifest.json', `${location.origin}/out/openwrt-rehber/`),
      loadManifest(R2_MANIFEST).then((item) => (item ? { ...item, id: `${item.id}-r2`, title: `${item.title} (R2)` } : null)),
    ]).then((extra) => {
      if (!cancelled) setItems([...PLAYLIST, ...extra.filter((item): item is PlaylistItem => item !== null)]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => watchTheme(setResolved), []);

  useEffect(() => {
    if (choice === 'system') delete document.documentElement.dataset['theme'];
    else document.documentElement.dataset['theme'] = choice;
  }, [choice]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const push = useCallback((text: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()} ${text}`, ...prev].slice(0, 30));
  }, []);

  const onSkip = useCallback(
    ({ segment, auto, to }: SkipEventDetail) => push(`${auto ? 'auto-skip' : 'skip'} ${segment.type} -> ${fmt(to)}`),
    [push],
  );
  const onEnter = useCallback((segment: Segment) => push(`enter ${segment.type}`), [push]);
  const onPlaylistChange = useCallback(
    ({ item, index }: { item: PlaylistItem; index: number }) => push(`playlist ${index + 1} ${item.title}`),
    [push],
  );
  const onPlaylistEnded = useCallback(() => push('playlist ended'), [push]);
  const onChapter = useCallback(
    ({ cue }: { cue: { text: string; startTime: number } }) => push(`chapter ${cue.text} @ ${fmt(cue.startTime)}`),
    [push],
  );

  return (
    <>
      <header className="demo-header">
        <h1 className="esp-heading">Player demo (React)</h1>
        <div className="demo-theme" role="group" aria-label="Tema">
          {(['light', 'dark', 'system'] as const).map((c) => (
            <button key={c} type="button" data-theme-choice={c} aria-pressed={choice === c} onClick={() => setChoice(c)}>
              {c === 'light' ? 'Açık' : c === 'dark' ? 'Koyu' : 'Sistem'}
            </button>
          ))}
          <span className="demo-resolved esp-tabular">çözülen: {resolved}</span>
        </div>
        <div className="demo-theme" role="group" aria-label="Dil">
          {(['tr', 'en'] as const).map((l) => (
            <button key={l} type="button" data-lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="demo-main">
        <div className="demo-stage">
          <EspVideoSkin
            id="player"
            className="demo-player"
            lang={lang}
            extras={
              <>
                <SkipSegments segments={NO_SEGMENTS} autoSkip={['recap']} onSkip={onSkip} onSegmentEnter={onEnter} />
                <Playlist
                  id="playlist"
                  items={items}
                  listId="demo-react"
                  onChange={onPlaylistChange}
                  onEnded={onPlaylistEnded}
                />
              </>
            }
          >
            {/* src, poster, title and tracks come from the playlist item */}
            <hls-video playsinline="" crossorigin="anonymous" preload="metadata" />
          </EspVideoSkin>
          <ChaptersPanel playerId="player" className="demo-chapters" onChapterSelect={onChapter} />
        </div>

        <aside className="demo-side">
          <PlaylistPanel for="playlist" className="demo-playlist" />
          <section className="demo-panel">
            <h2 className="esp-heading">Zaman çizelgesi bantları</h2>
            <p className="demo-muted">
              Çizgili bant otomatik atlanır (demo: özet). Önizleme kartı fare bandın üstündeyken türü gösterir.
            </p>
            <ul className="demo-list demo-legend">
              <li><span className="demo-swatch" data-type="intro" />İntro</li>
              <li><span className="demo-swatch" data-type="recap" data-auto="" />Özet (otomatik atlanır)</li>
              <li><span className="demo-swatch" data-type="outro" />Jenerik</li>
              <li><span className="demo-swatch" data-type="sponsor" />Sponsor</li>
            </ul>
          </section>
          <section className="demo-panel">
            <h2 className="esp-heading">Olaylar</h2>
            <ol className="demo-list demo-log esp-tabular">
              {log.map((line, i) => (
                <li key={`${i}-${line}`}>{line}</li>
              ))}
            </ol>
          </section>
        </aside>
      </main>
    </>
  );
}
