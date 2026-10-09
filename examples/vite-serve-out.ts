/**
 * Vite plugin: serves the repo's `out/` folder (encode-hls output) under `/out/`
 * with HTTP Range support, which byte-range HLS playlists need. Dev only.
 */
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const TYPES: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

export function serveOut(root: string): Plugin {
  return {
    name: 'esp-serve-out',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/out/')) return next();
        const rel = decodeURIComponent(url.slice('/out/'.length).split('?')[0] ?? '');
        const file = path.resolve(root, rel);
        if (!file.startsWith(path.resolve(root))) {
          res.statusCode = 403;
          return res.end();
        }
        let size: number;
        try {
          const stat = statSync(file);
          if (!stat.isFile()) throw new Error('not a file');
          size = stat.size;
        } catch {
          res.statusCode = 404;
          return res.end('not found');
        }
        res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
        if (range) {
          const start = range[1] ? Number(range[1]) : size - Number(range[2]);
          const end = range[2] && range[1] ? Math.min(Number(range[2]), size - 1) : size - 1;
          if (start > end || start >= size) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${size}`);
            return res.end();
          }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          res.setHeader('Content-Length', String(end - start + 1));
          if (req.method === 'HEAD') return res.end();
          return createReadStream(file, { start, end }).pipe(res);
        }
        res.statusCode = 200;
        res.setHeader('Content-Length', String(size));
        if (req.method === 'HEAD') return res.end();
        createReadStream(file).pipe(res);
      });
    },
  };
}
