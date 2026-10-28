---
"@esershnr/caramel-skip-segments": minor
---

Auto-skip can wait before it fires: set `auto-skip-delay` (or the `autoSkipDelay` property) to a number of seconds, for every type or per type (`intro:0,outro:3`), and the skip button shows a countdown in media time (it pauses with the video and does not drift when the rate changes). Pressing the button skips at once, the new close button or Escape dismisses the auto-skip for this occurrence, seeking out of the segment cancels it, a segment shorter than the delay is never auto-skipped, and rewinding before the segment re-arms it. The default stays 0 (instant). The start of a countdown is announced once through a polite live region; `dismiss()` is new on the element.
