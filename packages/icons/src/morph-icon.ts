import { createMorph, type Morph, type MorphOptions } from 'morphicons/dom';
import type { SpringPreset } from 'morphicons';
import { getIcon, type IconNode } from './icons.js';
import { iconMapFromOnOff, parseIconMap, pickIcon, type IconMap } from './map.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * <esp-morph-icon>
 *
 * A stroke icon that morphs between Lucide shapes when an attribute on its
 * parent (or a `target` selector) changes. Designed to sit inside Video.js 10
 * buttons, which reflect state as data attributes:
 *
 *   <media-play-button>
 *     <esp-morph-icon watch="data-paused" on="play" off="pause"></esp-morph-icon>
 *   </media-play-button>
 *
 *   <media-mute-button>
 *     <esp-morph-icon watch="data-volume-level"
 *       map="off:volume-off,low:volume-low,*:volume-high"></esp-morph-icon>
 *   </media-mute-button>
 *
 * Attributes: watch, on, off, map, target (CSS selector resolved with
 * closest()), spring (smooth|snappy|bouncy), icon (static, no watching).
 * Reduced motion follows the OS setting: morphs become instant swaps.
 */
export class EspMorphIconElement extends HTMLElement {
  static readonly tagName = 'esp-morph-icon';
  static readonly observedAttributes = ['watch', 'on', 'off', 'map', 'target', 'spring', 'icon'];

  #path: SVGPathElement | null = null;
  #morph: Morph | null = null;
  #observer: MutationObserver | null = null;
  #observedTarget: Element | null = null;
  #current: string | null = null;

  connectedCallback(): void {
    this.#ensureSvg();
    this.#bind();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observedTarget = null;
    this.#morph?.destroy();
    this.#morph = null;
    this.#current = null;
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.#bind();
  }

  /** Morph to a registry icon or raw IconNode by hand. */
  morphTo(icon: string | IconNode, spring?: SpringPreset | MorphOptions): void {
    const node = typeof icon === 'string' ? getIcon(icon) : icon;
    if (!node) return;
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

  #map(): IconMap {
    const map = this.getAttribute('map');
    if (map) return parseIconMap(map);
    return iconMapFromOnOff(this.getAttribute('on'), this.getAttribute('off'));
  }

  #resolveTarget(): Element | null {
    const selector = this.getAttribute('target');
    if (selector) return this.closest(selector);
    return this.parentElement;
  }

  #bind(): void {
    const staticIcon = this.getAttribute('icon');
    const watch = this.getAttribute('watch');

    if (staticIcon || !watch) {
      this.#unobserve();
      if (staticIcon) this.#apply(staticIcon, false);
      return;
    }

    const target = this.#resolveTarget();
    if (!target) return;

    if (target !== this.#observedTarget) {
      this.#unobserve();
      this.#observer = new MutationObserver(() => this.#sync(true));
      this.#observer.observe(target, { attributes: true, attributeFilter: [watch] });
      this.#observedTarget = target;
    }
    this.#sync(false);
  }

  #unobserve(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observedTarget = null;
  }

  #sync(animate: boolean): void {
    const watch = this.getAttribute('watch');
    const target = this.#observedTarget;
    if (!watch || !target) return;
    const icon = pickIcon(this.#map(), target.getAttribute(watch));
    if (icon) this.#apply(icon, animate);
  }

  #apply(icon: string, animate: boolean): void {
    if (icon === this.#current) return;
    const node = getIcon(icon);
    if (!node) return;
    this.#current = icon;
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
    'esp-morph-icon': EspMorphIconElement;
  }
}
