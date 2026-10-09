# Site entegrasyonu (esersahiner-next-js)

Bu fazda siteye dokunulmadı. Aşağıdakiler, player'ı Next.js App Router sitesine
eklerken yapılacaklar.

## 1. Paketler

npm'den 0.1.0 sürümleri:

```sh
npm install @esershnr/caramel-theme@0.1.0 @esershnr/caramel-skin@0.1.0 \
  @esershnr/caramel-skip-segments@0.1.0 @esershnr/caramel-chapters@0.1.0 \
  @esershnr/caramel-playlist@0.1.0 @videojs/html@10.0.1
```

`@videojs/html` (10.0.x) peer dependency'dir, bu yüzden açıkça kurulur. `react` ve
`react-dom` (>= 19) isteğe bağlı peer'lerdir; sitede zaten var.
`@esershnr/caramel-icons` skin'in bağımlılığı olarak kendiliğinden gelir.

Yayınlanan paketlerde `exports` yalnız `dist/`'i gösterir. Next.js (webpack ve
Turbopack) dev modunda `development` koşulunu ETKİNLEŞTİRİR; bu yüzden paketler
o koşulu kullanmaz. Kaynak (`src/*.ts`) yalnız monorepo içinde, özel
`caramel-source` koşuluyla çözülür (tsconfig, örneklerin Vite ve Vitest
config'leri); Next bu koşulu hiçbir modda açmadığı için site her zaman
`dist/`'i alır.

## 2. CSP (Content-Security-Policy) ekleri

Mevcut politikaya şu kaynakları ekle (CDN alan adı `cdn.esersahiner.com`):

| Yönerge | Ek | Neden |
| --- | --- | --- |
| `media-src` | `https://cdn.esersahiner.com blob:` | HLS parçaları MediaSource ile `blob:` URL üzerinden oynar |
| `connect-src` | `https://cdn.esersahiner.com` | playlist, byte-range fetch'leri, VTT dosyaları |
| `img-src` | `https://cdn.esersahiner.com` | poster ve thumbnail sprite'ları |
| `worker-src` | `blob:` (yalnız hls.js kullanılırsa) | hazırdaki `hls-video` motoru worker kullanmaz |
| `font-src` | `'self'` | fontlar `@fontsource-variable` ile aynı origin'den |
| `style-src` | değişiklik yok | paketler stylesheet dosyası kullanır, inline stil yok |

Video.js 10 CSP rehberi: `node_modules/@videojs/html/docs/guides/content-security-policy.md`.

## 3. Bileşen kullanımı (App Router)

Tema token'ları global CSS'e bir kez:

```ts
// app/layout.tsx (veya globals.css üzerinden @import)
import '@esershnr/caramel-theme/tokens.css';
// Fontlar next/font ile --font-heading / --font-body olarak zaten geliyor; fonts.css gerekmez.
```

Player bir client component içinde (`'use client'` sarmalayıcılar elementleri
yalnız tarayıcıda kaydeder, sunucu render'ı temiz kalır):

```tsx
'use client';
import { useEffect, useState } from 'react';
import { CaramelVideoSkin } from '@esershnr/caramel-skin/react';
import { SkipSegments } from '@esershnr/caramel-skip-segments/react';
import { ChaptersPanel } from '@esershnr/caramel-chapters/react';
import { Playlist, PlaylistPanel } from '@esershnr/caramel-playlist/react';
import type { PlaylistItem } from '@esershnr/caramel-playlist';
import '@esershnr/caramel-skin/skin.css';

const MANIFEST = 'https://cdn.esersahiner.com/videos/openwrt-rehber/v1/manifest.json';

export function VideoPage({ lang }: { lang: 'tr' | 'en' }) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  useEffect(() => {
    fetch(MANIFEST).then((r) => r.json()).then((item: PlaylistItem) => setItems([item]));
  }, []);
  return (
    <div className="caramel-theme" lang={lang}>
      <CaramelVideoSkin id="player" lang={lang} extras={<><SkipSegments segments={[]} autoSkip={['recap']} /><Playlist id="playlist" items={items} listId="site" /></>}>
        <hls-video playsinline="" crossorigin="anonymous" preload="metadata" />
      </CaramelVideoSkin>
      <ChaptersPanel playerId="player" />
      <PlaylistPanel for="playlist" nav="none" />
    </div>
  );
}
```

`hls-video` elementi için sayfada bir kez `import '@videojs/html/media/hls-video'`
(client tarafında). JSX tipi için `declare module 'react'` bloğu
`examples/react/src/App.tsx` içinde örnektir.

- HLS `src` mutlak URL olmalı (motor göreli URL'yi `Invalid base URL` ile reddeder); playlist denetleyicisi göreli verileni `document.baseURI` ile mutlaklaştırır, manifest zaten mutlak yazar.
- Dil: `lang` prop'u hem player etiketlerini (`<media-i18n>`) hem bölüm track'ini
  (`chapters: { tr, en }`) seçer; `<html lang>` değişince otomatik takip eder.
- Tema: site zaten `.dark` sınıfını `<html>`'e koyuyor; `.caramel-theme` kapsamı bunu okur.
- Manifest'i sunucuda da çekip `items` olarak verebilirsin; bileşen SSR'da
  player iskeletini üretir, media elementini elementler kaydolunca bağlar.

## 4. Kontrol listesi

- CDN'de `Range` için CORS izni (scripts/encode-hls/README.md, bölüm 5).
- Yeni encode için `v2/` yolu ve sitede yalnız manifest URL'sinin değişmesi.
- Kurulumdan sonra `next dev` ve `next build` ikisinde de çalıştığını doğrula; ikisi de
  paketlerin `dist/` çıktısını kullanır (`caramel-source` koşulu yalnız monorepo içindir).
- Lisans: skin paketi `MIT AND Apache-2.0` (Video.js 10 skin türevi dosyalar
  Apache-2.0); diğerleri MIT. Ayrıntı paketlerdeki `NOTICE` dosyalarında.
