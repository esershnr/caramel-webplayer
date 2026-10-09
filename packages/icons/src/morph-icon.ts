import { createMorph, type Morph, type MorphOptions } from 'morphicons/dom';
import type { SpringPreset } from 'morphicons';
import { getIcon, type IconNode } from './icons.js';
import { parseIconRules, pickIcon, rulesFromOnOff, watchedAttributes, type IconRule } from './map.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** HTMLElement stand-in so the module can be imported during SSR and in Node scripts. */
const Base: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/**
 * <caramel-morph-icon>
 *
 * A stroke icon that morphs between Lucide shapes when attributes on its
 * parent (or a `target` ancestor) change. Designed to sit inside Video.js 10
 * buttons, which reflect state as data attributes:
 *
 *   <media-play-button>
 *     <caramel-morph-icon map="data-ended:restart,data-paused:play,*:pause"></caramel-morph-icon>
 *   </media-play-button>
 *
 *   <media-mute-button>
 *     <caramel-morph-icon map="data-muted:volume-off,data-volume-level=low:volume-low,*:volume-high"></caramel-morph-icon>
 *   </media-mute-button>
 *
 * Attributes:
 *   map     rules, see map.ts (first match wins, `*` is the fallback)
 *   watch / on / off   shorthand for a single boolean attribute
 *   target  CSS selector resolved with closest(); default is the parent
 *   spring  smooth | snappy | bouncy (default: a light overshoot)
 *   icon    static icon name, no watching
 *
 * Reduced motion follows the OS setting: morphs become instant swaps.
 */
export class CaramelMorphIconElement extends Base {
  static readonly tagName = 'caramel-morph-icon';
  static readonly observedAttributes = ['map', 'watch', 'on', 'off', 'target', 'spring', 'icon'];

  #path: SVGPathElement | null = null;
  #morph: Morph | null = null;
  #observer: MutationObserver | null = null;
  #observedTarget: Element | null = null;
  #observedAttrs = '';
  #rules: IconRule[] = [];
  #current: string | null = null;

  connectedCallback(): void {
    this.#ensureSvg();
    this.#bind();
  }

  disconnectedCallback(): void {
    this.#unobserve();
    this.#morph?.destroy();
    this.#morph = null;
    this.#current = null;
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.#bind();
  }

  /** Name of the icon currently shown. */
  get current(): string | null {
    return this.#current;
  }

  /** Morph to a registry icon or raw IconNode by hand. */
  morphTo(icon: string | IconNode, spring?: SpringPreset | MorphOptions): void {
    const node = typeof icon === 'string' ? getIcon(icon) : icon;
    if (!node) return;
    this.#current = typeof icon === 'string' ? icon : null;
    if (this.#current) this.dataset['icon'] = this.#current;
    else delete this.dataset['icon'];
    this.#ensureSvg();
    if (!this.#morph) {
      this.#morph = createMorph(this.#path!, node, { reducedMotion: 'user' });
      return;
    }
    this.#morph.morphTo(node, spring ?? this.#spring());
  }

  #spring(): SpringPreset | MorphOptions {
    const value = this.getAttribute('spring');
    if (value === 'smooth' || value === 'snappy' || value === 'bouncy') return value;
    // Default: a touch of overshoot, close to the design's spring curve.
    return { stiffness: 380, damping: 26 };
  }

  #ensureSvg(): void {
    if (this.#path) return;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    svg.append(path);
    this.replaceChildren(svg);
    this.#path = path;
  }

  #readRules(): IconRule[] {
    const map = this.getAttribute('map');
    if (map) return parseIconRules(map);
    return rulesFromOnOff(this.getAttribute('watch'), this.getAttribute('on'), this.getAttribute('off'));
  }

  #resolveTarget(): Element | null {
    const selector = this.getAttribute('target');
    if (selector) return this.closest(selector);
    return this.parentElement;
  }

  #bind(): void {
    const staticIcon = this.getAttribute('icon');
    this.#rules = staticIcon ? [] : this.#readRules();
    const attrs = watchedAttributes(this.#rules);

    if (staticIcon || attrs.length === 0) {
      this.#unobserve();
      const icon = staticIcon ?? pickIcon(this.#rules, () => null);
      if (icon) this.#apply(icon, false);
      return;
    }

    const target = this.#resolveTarget();
    if (!target) return;

    const key = attrs.join(' ');
    if (target !== this.#observedTarget || key !== this.#observedAttrs) {
      this.#unobserve();
      this.#observer = new MutationObserver(() => this.#sync(true));
      this.#observer.observe(target, { attributes: true, attributeFilter: attrs });
      this.#observedTarget = target;
      this.#observedAttrs = key;
    }
    this.#sync(false);
  }

  #unobserve(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observedTarget = null;
    this.#observedAttrs = '';
  }

  #sync(animate: boolean): void {
    const target = this.#observedTarget;
    if (!target) return;
    const icon = pickIcon(this.#rules, (attr) => target.getAttribute(attr));
    if (icon) this.#apply(icon, animate);
  }

  #apply(icon: string, animate: boolean): void {
    if (icon === this.#current) return;
    const node = getIcon(icon);
    if (!node) return;
    this.#current = icon;
    this.dataset['icon'] = icon;
    this.#ensureSvg();
    if (!this.#morph) {
      this.#morph = createMorph(this.#path!, node, { reducedMotion: 'user' });
    } else if (animate) {
      this.#morph.morphTo(node, this.#spring());
    } else {
      this.#morph.set(node);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-morph-icon': CaramelMorphIconElement;
  }
}
