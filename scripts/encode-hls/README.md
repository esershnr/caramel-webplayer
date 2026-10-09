# encode-hls

Bir videoyu bu player ile yayınlanacak dosyalara çevirir. Bu repo hiçbir yere
yükleme yapmaz; `out/<slug>/` klasörünü R2 bucket'ına elle yüklersin.

## 1. Girdi: `media/<slug>/`

```
media/openwrt-rehber/
  source.mp4          orijinal video (mkv, mov, webm de olur)
  subs/tr.srt         altyazılar
  subs/en.srt
  meta.yaml           aşağıdaki gibi
```

```yaml
slug: openwrt-rehber
title:
  tr: OpenWrt Kurulum Rehberi
  en: OpenWrt Setup Guide
poster: "0:39"                      # kapak karesi zamanı (opsiyonel)
chapters:                           # yalnız başlangıç; sonuncusu video sonuna kadar
  - { at: "0:00", tr: Giriş, en: Introduction }
  - { at: "0:54", tr: Ön-Gereklilikler, en: Pre-requisites }
segments:                           # type: intro | recap | outro | sponsor
  - { type: intro, start: "0:00", end: "0:05" }
subtitles:
  - { lang: tr, label: Türkçe,  file: subs/tr.srt, default: true }
  - { lang: en, label: English, file: subs/en.srt }
```

Zamanlar `m:ss`, `h:mm:ss`, `ss.s` olabilir. Dosya doğrulanır; bölümler artan ve
benzersiz değilse, bir zaman video süresini aşıyorsa, segment bitişi başlangıçtan
önceyse ya da bir altyazı dosyası yoksa komut tek seferde tüm sorunları listeler
ve hiçbir şey üretmeden durur.

## 2. Komut

```sh
pnpm --filter @esersahiner/encode-hls start -- media/openwrt-rehber --base-url https://cdn.esersahiner.com/videos/openwrt-rehber/v1/
```

ffmpeg ve ffprobe PATH'te olmalı (`winget install Gyan.FFmpeg`). Yoksa komut
exit 2 ile ne aradığını ve nasıl kuracağını söyler. 28 dakikalık 1080p bir video
için encode birkaç dakika sürer; ilerleme stderr'e yazılır.

Seçenekler: `--out <dir>` (varsayılan `out`), `--fps auto|30|60`, `--preset <x264>`,
`--thumb-interval <sn>`, `--skip-video` (HLS hariç her şeyi yeniden üretir),
`--ffmpeg <yol>`, `--ffprobe <yol>`.

Kararlar `out/<slug>/encode-report.json` içinde ve terminalde yazılır:
kaynak bitrate'i 1 Mbps altındaysa ekran kaydı sayılır (metin için 1080p korunur,
düşük bitrate tavanları, bir de yarı yükseklikte yedek rendition); kaynak 60 fps ise
üç örnekte kareler ölçülür ve karelerin yarıdan azı değişiyorsa 30 fps'e inilir.

## 3. Çıktı: `out/<slug>/`

```
master.m3u8                 ana playlist (rendition listesi)
1080p/stream.m3u8           byte-range playlist
1080p/stream.m4s            TEK dosya (fMP4; init + tüm segmentler)
540p/stream.m3u8
540p/stream.m4s
poster.jpg
thumbs/sprite-1.jpg ...     zaman çizelgesi önizleme sprite'ları
thumbs/thumbnails.vtt
chapters.tr.vtt  chapters.en.vtt
subs/tr.vtt  subs/en.vtt
segments.json               atlanabilir aralıklar
manifest.json               PlaylistItem (player'a verilen tek dosya)
encode-report.json          kararlar ve dosya listesi (yüklemek şart değil)
```

HLS "tek dosya" modudur: rendition başına iki dosya. Player (Video.js 10'un
`hls-video` motoru) `EXT-X-BYTERANGE` ile parçaları `Range` başlığıyla ister;
hls.js de aynı etiketi destekler. Bu yüzden CDN'de `Range` başlığına izin
verilmesi şarttır (aşağıda).

## 4. Yükleme

`out/<slug>/` içindeki her şeyi (klasör yapısı aynen) bucket'ta şu yola koy:

```
videos/<slug>/v1/
```

Örnek: `out/openwrt-rehber/1080p/stream.m4s` dosyası bucket'ta
`videos/openwrt-rehber/v1/1080p/stream.m4s` olur. `manifest.json` içindeki
URL'ler `--base-url` ile başladığı için yol birebir aynı olmalı.

Yeniden encode edersen (bölüm, altyazı ya da video değişti) `v2/` kullan:
komutu `--base-url .../v2/` ile çalıştır ve yeni klasöre yükle. CDN dosyaları
1 yıl önbellekliyor; `v1/` altındaki bir dosyayı üzerine yazsan bile ziyaretçiler
eskisini görmeye devam eder. Sitede sadece manifest yolunu `v2/` yaparsın.

## 5. R2 CORS kuralı

R2 paneli > bucket > Settings > CORS Policy. Mevcut kurallara şu girdiyi EKLE
(JSON bir dizi; var olan girdilerin yanına koy):

```json
[
  {
    "AllowedOrigins": [
      "https://esersahiner.com",
      "https://www.esersahiner.com",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Origin", "Accept", "Accept-Encoding"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

`Range` olmadan byte-range HLS çalışmaz (tarayıcı preflight'ta reddeder);
`ExposeHeaders` içindeki `Content-Range` ve `Accept-Ranges` de player'ın
parça sınırlarını doğrulaması için gerekir.

## 6. Yerelde deneme

Demolar `out/<slug>/manifest.json` varsa listeye "OpenWrt" öğesini kendileri
ekler (Vite eklentisi `out/`'u `/out/` altında Range destekli servis eder):

```sh
pnpm dev:vanilla   # http://localhost:5173
pnpm dev:react     # http://localhost:5174
node tools/shots.mjs shots
```
