---
"@esershnr/caramel-skip-segments": patch
---

A segment that starts at 0 (or within half a second of it) re-arms its auto-skip when the playhead returns to the media start. Before, the rewind had to land before `start - 0.5`, which no position can for such a segment, so the countdown and the automatic skip only ever ran once.
