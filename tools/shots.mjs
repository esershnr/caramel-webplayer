// Open-state screenshots of the demos with the installed Edge (Playwright, msedge channel).
//
//   node tools/shots.mjs [outDir] [--url http://localhost:5173/] [--theme light,dark]
//
// Every popup component gets screenshotted in its OPEN state: the settings menu,
// each submenu, the volume popover and the time slider preview. Console errors
// and failed responses are reported per page.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const outDir = resolve(args.find((a) => !a.startsWith('--')) ?? 'shots');
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const urls = opt('url', 'http://localhost:5173/,http://localhost:5174/').split(',');
const themes = opt('theme', 'light,dark').split(',');
mkdirSync(outDir, { recursive: true });

const ITEM_SELECTOR = '.media-menu-content:not([data-submenu]) > .media-menu-trigger-item';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = [];

for (const base of urls) {
  const tag = new URL(base).port === '5174' ? 'react' : 'vanilla';
  for (const theme of themes) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, colorScheme: theme });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));

    await page.goto(`${base}?theme=${theme}&dev`, { waitUntil: 'networkidle' });
    await page.waitForSelector('media-container[data-controls-visible]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    const shot = (name) => page.screenshot({ path: resolve(outDir, `${tag}-${theme}-${name}.png`) });
    const trigger = page.locator('.media-settings-menu-trigger');
    const closeMenus = async () => {
      for (let i = 0; i < 3; i++) {
        const open = await page
          .locator('.media-menu-popup')
          .evaluate((el) => el.matches(':popover-open'))
          .catch(() => false);
        if (!open) break;
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
      }
    };

    await shot('idle');

    // Settings menu open
    await trigger.click();
    await page.waitForTimeout(500);
    await shot('menu');

    const metrics = await page.evaluate(() => {
      const popup = document.querySelector('.media-menu-popup');
      const icon = popup?.querySelector('.media-menu-trigger-item-icon');
      const cs = icon && getComputedStyle(icon);
      const box = icon?.getBoundingClientRect();
      const bar = [...document.querySelectorAll('.video-controls-content .media-button-icon')].map((el) => {
        const r = el.getBoundingClientRect();
        const name = el.dataset.icon ?? [...el.classList].find((c) => c.startsWith('caramel-icon-'));
        return `${name}:${r.width.toFixed(0)}x${r.height.toFixed(0)}`;
      });
      return {
        popupOpen: popup?.matches(':popover-open') ?? null,
        popupBox: popup && [popup.getBoundingClientRect().width, popup.getBoundingClientRect().height],
        iconComputed: cs && { width: cs.width, height: cs.height },
        iconBox: box && [box.width, box.height],
        controlBarIcons: bar,
      };
    });
    report.push({ tag, theme, metrics });

    // Each submenu: reopen the settings menu for every item so a closed or
    // mid-transition panel never swallows the click.
    await closeMenus();
    const labels = await page.$$eval(ITEM_SELECTOR, (els) =>
      els.map((el) => ({
        label: (el.querySelector('media-text')?.textContent || el.textContent || '')
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, '-'),
        hidden: getComputedStyle(el).display === 'none',
      })),
    );
    for (let i = 0; i < labels.length; i++) {
      if (labels[i].hidden) continue;
      await trigger.click();
      await page.waitForTimeout(450);
      await page.locator(ITEM_SELECTOR).nth(i).click();
      await page.waitForTimeout(450);
      await shot(`menu-${labels[i].label || `item${i}`}`);
      await closeMenus();
    }

    // Volume popover (hover)
    await page.locator('.media-mute-button').hover();
    await page.waitForTimeout(500);
    await shot('volume');

    // Time slider preview (hover mid track)
    const hoverPreview = async (name) => {
      const b = await page.locator('.media-time-slider').boundingBox();
      if (!b) return;
      await page.mouse.move(b.x + b.width * 0.4, b.y + b.height / 2);
      await page.waitForTimeout(700);
      await shot(name);
      await page.mouse.move(5, 5);
    };
    await hoverPreview('preview');

    // Panels outside the video: playlist (next item) and chapter list (select a chapter).
    const next = page.locator('caramel-playlist-panel .caramel-playlist-nav button').nth(1);
    if (await next.count()) {
      await next.click();
      await page.waitForTimeout(2500);
      await shot('playlist-next');
      // The second item carries the gen-thumbs sprite: hover the timeline again.
      await hoverPreview('playlist-next-preview');
    }
    const chapter = page.locator('caramel-chapters-panel li button').nth(1);
    if (await chapter.count()) {
      await chapter.focus();
      await chapter.click();
      await page.waitForTimeout(800);
      await shot('chapter-select');
    }

    // Encoded item (encode-hls output or the R2 copy): the last playlist entry
    // when more than the three demo clips are listed. Exercises byte-range HLS,
    // the quality menu, per-language chapters, subtitles, skip and fullscreen.
    const items = page.locator('caramel-playlist-panel .caramel-playlist-item');
    if ((await items.count()) > 3) {
      await items.last().click();
      await page.waitForTimeout(3500);
      await shot('encoded-idle');
      await hoverPreview('encoded-preview');
      await trigger.click();
      await page.waitForTimeout(450);
      const quality = page.locator(ITEM_SELECTOR).first();
      await quality.click();
      await page.waitForTimeout(450);
      await shot('encoded-quality');
      await closeMenus();
      // Subtitles: pick the first real track in the captions submenu.
      await trigger.click();
      await page.waitForTimeout(450);
      const captions = page.locator(ITEM_SELECTOR).last();
      await captions.click();
      await page.waitForTimeout(450);
      // Scoped to the captions group: the quality group's hidden radios match the generic class too.
      const track = page.locator('media-captions-radio-group .media-menu-radio-item').nth(1);
      if (await track.count()) {
        await track.click();
        await page.waitForTimeout(300);
      }
      await closeMenus();
      // The controls bar hides on inactivity, so drive playback through the store.
      await page.evaluate(() => document.querySelector('video-player').store.play());
      await page.waitForTimeout(6500);
      await page.evaluate(() => document.querySelector('video-player').store.pause());
      await page.locator('media-container').hover();
      await page.waitForTimeout(500);
      await shot('encoded-subtitles');
      // Chapters follow the page language.
      await page.locator('[data-lang="en"]').click();
      await page.waitForTimeout(1200);
      await shot('encoded-chapters-en');
      await page.locator('[data-lang="tr"]').click();
      await page.waitForTimeout(600);
      // Fullscreen (hover first so the controls bar is visible).
      await page.locator('media-container').hover();
      await page.waitForTimeout(400);
      await page.locator('.media-fullscreen-button').click();
      await page.waitForTimeout(900);
      await shot('encoded-fullscreen');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    report.push({ tag, theme, errors });
    await context.close();
  }
}

// Contact sheet: one overview image per demo and theme.
const fileUrl = (p) => pathToFileURL(p).href;
const files = readdirSync(outDir).filter((f) => f.endsWith('.png') && !f.startsWith('sheet-'));
const groups = new Map();
for (const f of files) {
  const key = f.split('-').slice(0, 2).join('-');
  groups.set(key, [...(groups.get(key) ?? []), f]);
}
const sheetPage = await (await browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
for (const [key, list] of groups) {
  const figures = list
    .map(
      (f) =>
        `<figure style="margin:0"><img src="${fileUrl(resolve(outDir, f))}" style="width:100%;display:block"><figcaption>${f}</figcaption></figure>`,
    )
    .join('');
  const html = `<body style="margin:0;padding:12px;background:#333;font:12px sans-serif;color:#eee"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">${figures}</div></body>`;
  const htmlPath = resolve(outDir, `${key}.html`);
  writeFileSync(htmlPath, html);
  await sheetPage.goto(fileUrl(htmlPath));
  await sheetPage.screenshot({ path: resolve(outDir, `sheet-${key}.png`), fullPage: true });
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
