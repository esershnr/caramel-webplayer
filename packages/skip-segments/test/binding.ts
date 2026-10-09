/**
 * Shared DOM fixture for the registration order tests. The element is bound
 * once its controllers reach the player store; the visible proof is the
 * marker layer it appends to the player's `<media-time-slider>` on update.
 */
export function mountFixture(skipTag = 'caramel-skip-segments'): HTMLElement {
  document.body.innerHTML = `
    <video-player>
      <media-time-slider></media-time-slider>
      <${skipTag} segments='[{"start":0,"end":30,"type":"intro"}]'></${skipTag}>
    </video-player>`;
  return document.querySelector('video-player')!;
}

export function isBound(player: HTMLElement): boolean {
  return player.querySelector('media-time-slider > .caramel-segment-markers') !== null;
}

/** Lets pending `whenDefined` callbacks and element updates run. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}
