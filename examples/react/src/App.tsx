import { useCallback, useEffect, useState } from 'react';
import { EspVideoSkin } from '@esersahiner/player-skin/react';
import { SkipSegments } from '@esersahiner/player-skip-segments/react';
import type { Segment, SkipEventDetail } from '@esersahiner/player-skip-segments';
import { watchTheme, type Theme } from '@esersahiner/player-theme';

const MEDIA = 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4';
const POSTER = 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.jpg';
const STORYBOARD = 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/storyboard.vtt';

const SEGMENTS: Segment[] = [
  { start: 0, end: 6, type: 'intro' },
  { start: 8, end: 13, type: 'recap' },
  { start: 18, end: 23, type: 'sponsor' },
  { start: 30, end: 35, type: 'outro' },
];

type Choice = 'light' | 'dark' | 'system';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function App() {
  const [choice, setChoice] = useState<Choice>(() => {
    const preset = new URLSearchParams(location.search).get('theme');
    return preset === 'light' || preset === 'dark' ? preset : 'system';
  });
  const [resolved, setResolved] = useState<Theme>('light');
  const [lang, setLang] = useState<'tr' | 'en'>('tr');
  const [active, setActive] = useState<Segment | null>(null);
  const [log, setLog] = useState<string[]>([]);

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
  const onEnter = useCallback(
    (segment: Segment) => {
      setActive(segment);
      push(`enter ${segment.type}`);
    },
    [push],
  );
  const onLeave = useCallback(() => setActive(null), []);

  return (
    <>
      <header className="demo-header">
        <h1 className="esp-heading">Player demo (React)</h1>
        <div className="demo-theme" role="group" aria-label="Tema">
          {(['light', 'dark', 'system'] as const).map((c) => (
            <button key={c} type="button" aria-pressed={choice === c} onClick={() => setChoice(c)}>
              {c === 'light' ? 'Açık' : c === 'dark' ? 'Koyu' : 'Sistem'}
            </button>
          ))}
          <span className="demo-resolved esp-tabular">çözülen: {resolved}</span>
        </div>
        <div className="demo-theme" role="group" aria-label="Dil">
          {(['tr', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="demo-main">
        <EspVideoSkin
          className="demo-player"
          lang={lang}
          title="Demo: segmentler, bölümler, önizleme"
          poster={POSTER}
          extras={
            <SkipSegments
              segments={SEGMENTS}
              autoSkip={['recap']}
              onSkip={onSkip}
              onSegmentEnter={onEnter}
              onSegmentLeave={onLeave}
            />
          }
        >
          <video src={MEDIA} playsInline crossOrigin="anonymous" preload="metadata">
            <track kind="chapters" src="/chapters.vtt" srcLang="tr" default />
            <track kind="metadata" label="thumbnails" src={STORYBOARD} default />
          </video>
        </EspVideoSkin>

        <aside className="demo-panel">
          <h2 className="esp-heading">Segmentler</h2>
          <p className="demo-muted">Zaman çizelgesindeki renkli bantlar. Özet otomatik atlanır.</p>
          <ul className="demo-list">
            {SEGMENTS.map((s) => (
              <li key={`${s.type}-${s.start}`} data-active={active === s || undefined}>
                <span className="type">{s.type}</span>
                <span className="esp-tabular">
                  {fmt(s.start)} - {fmt(s.end)}
                </span>
              </li>
            ))}
          </ul>
          <h2 className="esp-heading">Olaylar</h2>
          <ol className="demo-list demo-log esp-tabular">
            {log.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ol>
        </aside>
      </main>
    </>
  );
}
