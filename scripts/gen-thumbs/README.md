# @esershnr/caramel-gen-thumbs

Generate timeline thumbnail sprite sheets and a WebVTT storyboard with ffmpeg.
The output is consumed by Video.js 10's `<media-slider-thumbnail>` (and by the
`<media-thumbnail>` element) through a `kind="metadata"` track labeled
`thumbnails`.

Requires `ffmpeg` on PATH (`ffprobe` is used when present, from the same
install). Install with `winget install Gyan.FFmpeg`, `brew install ffmpeg` or
`sudo apt install ffmpeg`.

> Git Bash (MSYS) rewrites `--base-url /thumbs` into a Windows path. Prefix the command with `MSYS_NO_PATHCONV=1` or pass `--base-url //thumbs`.

## Usage

```sh
# from the repo
pnpm --filter @esershnr/caramel-gen-thumbs start -- <input> [options]

# after a build (bin esp-gen-thumbs)
esp-gen-thumbs ./movie.mp4 --interval 5 --width 320 --out ./public/thumbs
esp-gen-thumbs https://example.com/stream.m3u8 --base-url https://cdn.example.com/thumbs
```

`<input>` is a local file or an HTTP/HLS URL; ffmpeg reads both directly.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `--interval <sec>` | `5` | Seconds between thumbnails |
| `--width <px>` | `320` | Thumbnail width; height keeps the aspect ratio and is even. The player's preview card uses this width as is (no upscaling) |
| `--columns <n>` | `10` | Cells per sprite row |
| `--quality <1-31>` | `4` | JPEG quality (`-q:v`), lower is better |
| `--max-frames <n>` | `100` | Frames per sprite sheet; more frames produce `sprite-2.jpg`, ... |
| `--out <dir>` | `./thumbs` | Output directory (created when missing) |
| `--name <base>` | `sprite` | Base name for `<base>-N.jpg` and `<base>.vtt` |
| `--base-url <prefix>` | relative names | Prefix for the image URLs written into the VTT |
| `--ffmpeg <path>` | `ffmpeg` | ffmpeg binary |
| `--ffprobe <path>` | derived from `--ffmpeg` | ffprobe binary |
| `--help` | | Show help |

Exit codes: `0` success, `1` ffmpeg or I/O failure (the ffmpeg stderr tail is
printed), `2` ffmpeg not found (with install hints).

## Output

```
thumbs/
  sprite-1.jpg   grid of up to --max-frames thumbnails, --columns per row
  sprite-2.jpg   only when the clip needs more frames
  sprite.vtt     storyboard
```

Each cue covers one interval and points at a cell of a sprite with a
`#xywh=x,y,w,h` fragment. The final cue ends at the probed media duration.

```txt
WEBVTT

00:00:00.000 --> 00:00:05.000
sprite-1.jpg#xywh=0,0,240,136

00:00:05.000 --> 00:00:10.000
sprite-1.jpg#xywh=240,0,240,136
```

Use it in a player:

```html
<video src="movie.mp4" crossorigin="anonymous">
  <track kind="metadata" label="thumbnails" src="thumbs/sprite.vtt" default />
</video>
```

## Programmatic API

`import { generateThumbnails, buildLayout, layoutToVtt } from '@esershnr/caramel-gen-thumbs'`.
`buildLayout` and the `vtt` helpers are pure and need no ffmpeg;
`generateThumbnails(options)` runs the whole pipeline and returns the layout,
sprite paths and VTT path.

## How it works

1. `ffprobe -show_entries format=duration` reads the duration (skipped when ffprobe is missing).
2. One ffmpeg run extracts frames with `fps=1/<interval>,scale=<width>:-2` into a temp dir.
3. One ffmpeg run per sprite tiles consecutive frames with the `tile=<cols>x<rows>` filter.
4. The VTT is written from the frames that exist; temp files are removed on success and failure.
