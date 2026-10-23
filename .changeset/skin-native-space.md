---
'@esershnr/caramel-skin': minor
---

Space handling: a subtree marked `data-caramel-native-space` keeps Space for its own buttons instead of toggling playback, so panels inside the player (the new drawer) can use native button activation. The control bar gains a `<caramel-drawer-toggle>` placeholder before the settings button, upgraded by `@esershnr/caramel-drawer`; below 28rem a visible drawer toggle replaces the mute button.
