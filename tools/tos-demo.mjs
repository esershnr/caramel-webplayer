// Builds the demo media in examples/vanilla/public/tos/ from Tears of Steel.
//
//   node tools/tos-demo.mjs
//
// Tears of Steel (CC) Blender Foundation | mango.blender.org, licensed CC BY 3.0.
// The 720p source (about 370 MB) is downloaded once into media/tos/ (gitignored),
// then three short clips are cut with ffmpeg: MP4 (H.264 + AAC, faststart), a
// poster, TR and EN chapters, TR and EN subtitles (EN from the official SRT,
// TR translated for this demo) and a gen-thumbs storyboard. Needs ffmpeg on PATH.
import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_URL = 'https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov';
const SOURCE = resolve(ROOT, 'media/tos/tears_of_steel_720p.mov');
const OUT = resolve(ROOT, 'examples/vanilla/public/tos');

/**
 * Times are seconds in the clip. Chapters list start times only. Subtitle cues
 * are [start, end, en, tr]; EN follows the official TOS-en.srt shifted to the clip.
 */
const CLIPS = [
  {
    name: 'opening',
    start: 0,
    duration: 50,
    poster: 28,
    chapters: [
      [0, 'Açılış', 'Opening'],
      [22, 'Köprüde', 'On the bridge'],
      [40, 'Kırk yıl sonra', 'Forty years later'],
    ],
    subtitles: [
      [23, 24.5, "You're a jerk, Thom.", 'Tam bir pisliksin, Thom.'],
      [25, 27, 'Look Celia, we have to follow our passions;', 'Bak Celia, tutkularımızın peşinden gitmeliyiz;'],
      [
        27,
        30.5,
        '...you have your robotics, and I\njust want to be awesome in space.',
        '...senin robotiğin var, bense\nsadece uzayda harika olmak istiyorum.',
      ],
      [
        30.8,
        34,
        "Why don't you just admit that\nyou're freaked out by my robot hand?",
        'Robot elimden ödünün koptuğunu\nneden kabul etmiyorsun?',
      ],
      [34.5, 36, "I'm not freaked out by- it's...", 'Ödüm falan kopmuyor- bu...'],
      [37, 38, '...alright! Fine!', '...tamam! Peki!'],
      [
        38,
        41,
        "I'm freaked out! I have nightmares\nthat I'm being chased...",
        'Ödüm kopuyor! Kâbuslarımda\nbeni kovalıyorlar...',
      ],
      [41, 42, '...by these giant robotic claws of death...', '...dev, ölümcül robot pençeleri...'],
      [42.2, 45, '"Forty years later"\nWhatever, Thom. We\'re done.', '"Kırk yıl sonra"\nNeyse, Thom. Bitti.'],
    ],
  },
  {
    name: 'simulation',
    start: 300,
    duration: 42,
    poster: 20,
    chapters: [
      [0, 'Simülasyon', 'Simulation'],
      [8, 'Hatıra', 'The memory'],
      [30, 'Geliyorlar', "They're coming"],
    ],
    subtitles: [
      [0, 1, "You're a jerk, Thom!", 'Tam bir pisliksin, Thom!'],
      [2.5, 5, 'Ohp- Sorry! Sorry.', 'Hop- Pardon! Pardon.'],
      [16, 17, 'Look Celia.', 'Bak Celia.'],
      [18, 20, 'We have to follow our passions.', 'Tutkularımızın peşinden gitmeliyiz.'],
      [21, 23, 'You have your robotics...', 'Senin robotiğin var...'],
      [25, 28, '...and I just want to be awesome in space.', '...bense sadece uzayda harika olmak istiyorum.'],
      [39, 41, "Okay, they're coming. Two minutes left!", 'Tamam, geliyorlar. İki dakika kaldı!'],
    ],
  },
  {
    name: 'finale',
    start: 556,
    duration: 50,
    poster: 26,
    chapters: [
      [0, 'Ders', 'The lesson'],
      [18, 'Savaş alanı', 'Battlefield'],
      [36, 'Jenerik', 'Credits'],
    ],
    subtitles: [
      [3, 4, 'You know.', 'Biliyor musun.'],
      [6, 8, "There's a lesson to be learned from this.", 'Bundan çıkarılacak bir ders var.'],
      [10, 11, "Could'a gone worse.", 'Daha kötü olabilirdi.'],
    ],
  },
];

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'pnpm' });
  if (result.status !== 0) throw new Error(`${cmd} exited with ${result.status}`);
}

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return `${hh}:${mm}:${ss}.${String(ms % 1000).padStart(3, '0')}`;
};

const vtt = (cues) => `WEBVTT\n\n${cues.map(([a, b, text]) => `${ts(a)} --> ${ts(b)}\n${text}\n`).join('\n')}`;

if (!existsSync(SOURCE)) {
  mkdirSync(resolve(SOURCE, '..'), { recursive: true });
  console.log(`Downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(SOURCE));
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const clip of CLIPS) {
  const mp4 = resolve(OUT, `${clip.name}.mp4`);
  console.log(`Encoding ${clip.name}`);
  // Output seeking after -i keeps the cut frame accurate.
  run('ffmpeg', [
    ...['-v', 'error', '-y', '-i', SOURCE, '-ss', String(clip.start), '-t', String(clip.duration)],
    ...[
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '28',
      '-maxrate',
      '900k',
      '-bufsize',
      '1800k',
      '-pix_fmt',
      'yuv420p',
      '-profile:v',
      'high',
    ],
    ...['-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', mp4],
  ]);
  run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-ss',
    String(clip.poster),
    '-i',
    mp4,
    '-frames:v',
    '1',
    '-q:v',
    '4',
    resolve(OUT, `${clip.name}.jpg`),
  ]);

  const end = clip.duration;
  for (const [index, lang] of [
    [1, 'tr'],
    [2, 'en'],
  ]) {
    const chapters = clip.chapters.map((c, i) => [c[0], clip.chapters[i + 1]?.[0] ?? end, c[index]]);
    writeFileSync(resolve(OUT, `${clip.name}.chapters.${lang}.vtt`), vtt(chapters));
  }
  writeFileSync(resolve(OUT, `${clip.name}.en.vtt`), vtt(clip.subtitles.map(([a, b, en]) => [a, b, en])));
  writeFileSync(resolve(OUT, `${clip.name}.tr.vtt`), vtt(clip.subtitles.map(([a, b, , tr]) => [a, b, tr])));

  // Relative sprite names: the player resolves them against the storyboard URL.
  run('pnpm', [
    ...['--silent', '--filter', '@esershnr/caramel-gen-thumbs', 'start', mp4],
    ...['--interval', '2', '--width', '240', '--columns', '5', '--quality', '5'],
    ...['--out', OUT, '--name', `${clip.name}-thumbs`],
  ]);
}

console.log(`Done: ${OUT}`);
