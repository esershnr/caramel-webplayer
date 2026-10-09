export const MEDIA_MARKER = '<!--esp:media-->';

/** Turns an arbitrary string (for example React's useId) into a safe id prefix. */
export function sanitizeUid(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, '');
  return cleaned ? `esp-${cleaned}` : 'esp';
}

/** Fills the `{{uid}}` id placeholders of the template. */
export function applyUid(template: string, uid: string): string {
  return template.replaceAll('{{uid}}', uid);
}

/**
 * Splits the template at the media marker. `before` is the opening
 * `<media-container ...>` tag and anything before the media, `after` is the rest.
 */
export function splitAtMedia(template: string): { before: string; after: string } {
  const index = template.indexOf(MEDIA_MARKER);
  if (index === -1) throw new Error('Skin template has no media marker');
  return { before: template.slice(0, index), after: template.slice(index + MEDIA_MARKER.length) };
}

/**
 * Splits the template into the container's opening tag, the inner markup
 * (without the media marker) and the closing tag. Used by the React wrapper,
 * which renders the container itself.
 */
export function splitContainer(template: string): { open: string; inner: string; close: string } {
  const openEnd = template.indexOf('>');
  const closeStart = template.lastIndexOf('</media-container>');
  if (openEnd === -1 || closeStart === -1) throw new Error('Skin template has no media-container root');
  const open = template.slice(0, openEnd + 1);
  const inner = template.slice(openEnd + 1, closeStart).replace(MEDIA_MARKER, '');
  return { open, inner, close: template.slice(closeStart) };
}

/** Reads attributes of the container's opening tag as a plain object. */
export function parseOpenTag(open: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g;
  const body = open.replace(/^<media-container\s*/, '').replace(/>$/, '');
  for (const match of body.matchAll(re)) {
    const name = match[1];
    if (!name) continue;
    attrs[name] = match[2] ?? '';
  }
  return attrs;
}
