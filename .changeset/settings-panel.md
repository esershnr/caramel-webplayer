---
"@esershnr/caramel-settings": minor
---

First release. `<caramel-settings>` (and `<Settings>` for React) adds three pages to the player's settings menu: Subtitles (size, position, color, background, font, shadow, bold), Player (seek step, number key seeking, auto-skip intro and outro, auto-skip delay, autoplay next, fullscreen on play) and Display (aspect ratio, video filter). Choices are stored in `localStorage` under `caramel-settings` (set `storage-key` to separate players) and applied to the skin's hotkeys and gestures, `<caramel-skip-segments>` and `<caramel-playlist>` through their attributes. Site defaults go in `defaults`; stored choices win over them and Reset returns to them. Without the package, or without the element, the player is unchanged.
