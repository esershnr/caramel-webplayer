---
'@esershnr/caramel-skip-segments': patch
---

Bind to the player when `<caramel-skip-segments>` is registered before `<video-player>`. The element now waits for the undefined ancestor and requests the player context again once it is defined.
