// Copies the stylesheet tree next to the compiled JS so `dist/components/videojs/video/skin.js`
// can keep importing './skin.css' and '../styles/video/base.css'.
import { cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
cpSync(resolve(root, 'src/components/videojs/styles'), resolve(root, 'dist/components/videojs/styles'), {
  recursive: true,
  filter: (src) => !src.endsWith('.ts'),
});
cpSync(resolve(root, 'src/components/videojs/video/skin.css'), resolve(root, 'dist/components/videojs/video/skin.css'));
cpSync(resolve(root, 'src/styles'), resolve(root, 'dist/styles'), { recursive: true });
