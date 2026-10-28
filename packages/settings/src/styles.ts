/**
 * Puts the caption and display CSS where it reaches the video.
 *
 * A `<video>` in the light DOM is styled from one `<style>` in the document
 * head, scoped by `[data-caramel-settings="<uid>"]` on the media container.
 * Media elements that render their `<video>` in a shadow root (hls-video and
 * the other custom media elements) get an adopted stylesheet on that shadow
 * root instead, with no scope, because page CSS does not cross the boundary.
 * When `adoptedStyleSheets` is missing a `<style>` in the shadow root is used.
 */

export const SCOPE_ATTRIBUTE = 'data-caramel-settings';

/** Selector prefix for the document stylesheet of one player. */
export function documentScope(uid: string): string {
  return `[${SCOPE_ATTRIBUTE}="${uid}"] `;
}

/** The element that plays the media: a light DOM `<video>` or a custom media element such as `<hls-video>`. */
export function findMediaElement(container: ParentNode): Element | null {
  // The skin puts the media as a direct child of the container.
  for (const element of container.children) {
    const tag = element.localName;
    if (tag === 'video' || tag.endsWith('-video')) return element;
  }
  return container.querySelector('video');
}

interface ShadowTarget {
  root: ShadowRoot;
  sheet: CSSStyleSheet | null;
  style: HTMLStyleElement | null;
}

function supportsAdoptedSheets(root: ShadowRoot): boolean {
  try {
    return (
      typeof CSSStyleSheet === 'function' &&
      'replaceSync' in CSSStyleSheet.prototype &&
      Array.isArray(root.adoptedStyleSheets)
    );
  } catch {
    return false;
  }
}

export class SettingsStyles {
  readonly #uid: string;
  #documentStyle: HTMLStyleElement | null = null;
  #documentText = '';
  #shadow: ShadowTarget | null = null;
  #shadowText = '';

  constructor(uid: string) {
    this.#uid = uid;
  }

  /**
   * Applies the CSS for the current media element. `build(scope)` returns the
   * stylesheet text for a selector prefix. Nothing is written when the text
   * did not change; an empty text removes the stylesheet.
   */
  update(media: Element | null, build: (scope: string) => string): void {
    const root = media?.shadowRoot ?? null;
    if (root) {
      this.#setDocument('');
      this.#setShadow(root, build(''));
    } else {
      this.#setShadow(null, '');
      this.#setDocument(build(documentScope(this.#uid)));
    }
  }

  /** Removes every stylesheet this instance added. */
  clear(): void {
    this.#setDocument('');
    this.#setShadow(null, '');
  }

  /** The text currently applied, for tests and debugging. */
  get text(): string {
    return this.#shadowText || this.#documentText;
  }

  #setDocument(text: string): void {
    if (!text) {
      this.#documentStyle?.remove();
      this.#documentStyle = null;
      this.#documentText = '';
      return;
    }
    if (text === this.#documentText && this.#documentStyle?.isConnected) return;
    if (!this.#documentStyle) {
      const style = document.createElement('style');
      style.setAttribute(SCOPE_ATTRIBUTE, this.#uid);
      this.#documentStyle = style;
    }
    if (this.#documentStyle.textContent !== text) this.#documentStyle.textContent = text;
    if (!this.#documentStyle.isConnected) (document.head ?? document.documentElement).append(this.#documentStyle);
    this.#documentText = text;
  }

  #setShadow(root: ShadowRoot | null, text: string): void {
    const current = this.#shadow;
    if (current && (current.root !== root || !text)) {
      this.#detachShadow(current);
      this.#shadow = null;
      this.#shadowText = '';
    }
    if (!root || !text) return;
    if (this.#shadow && text === this.#shadowText) return;
    let target = this.#shadow;
    if (!target) {
      target = { root, sheet: null, style: null };
      this.#shadow = target;
    }
    if (supportsAdoptedSheets(root)) {
      try {
        if (!target.sheet) {
          target.sheet = new CSSStyleSheet();
          target.sheet.replaceSync(text);
          root.adoptedStyleSheets = [...root.adoptedStyleSheets, target.sheet];
        } else {
          target.sheet.replaceSync(text);
        }
        this.#shadowText = text;
        return;
      } catch {
        // Fall through to a <style> element.
        target.sheet = null;
      }
    }
    if (!target.style) {
      target.style = document.createElement('style');
      target.style.setAttribute(SCOPE_ATTRIBUTE, this.#uid);
    }
    if (target.style.textContent !== text) target.style.textContent = text;
    if (target.style.parentNode !== root) root.append(target.style);
    this.#shadowText = text;
  }

  #detachShadow(target: ShadowTarget): void {
    if (target.sheet) {
      const sheet = target.sheet;
      try {
        target.root.adoptedStyleSheets = target.root.adoptedStyleSheets.filter((s) => s !== sheet);
      } catch {
        // The root is gone with its media element.
      }
    }
    target.style?.remove();
  }
}
