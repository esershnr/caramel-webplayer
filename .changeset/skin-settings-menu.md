---
"@esershnr/caramel-skin": minor
---

Behavior changes: the arrow keys, j / l and the double taps now seek 5 seconds instead of Video.js's 10 (set `value` on the `media-hotkey` and `media-gesture` elements to change it), and clicking or tapping outside an open settings menu only closes the menu instead of also toggling playback or the controls. The settings menu carries a hidden `<caramel-settings-menu>` placeholder that `@esershnr/caramel-settings` fills with its pages; without that package nothing shows. The speed list gains 3x: the speed page is now `<caramel-playback-rate-radio-group>` instead of `<media-playback-rate-radio-group>`, so site CSS that targeted the old tag must follow.
