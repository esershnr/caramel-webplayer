import { I18nController, UIElement, i18nContext, type PropertyValues } from '@videojs/html';
import { registerI18n } from '@videojs/html/i18n';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof UIElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof UIElement) : UIElement;

export type TimeDisplayMode = 'elapsed' | 'remaining';

export const TIME_DISPLAY_STORAGE_KEY = 'caramel-time-display';

const KEYS = {
  showRemaining: 'caramel.time.showRemaining',
  showElapsed: 'caramel.time.showElapsed',
} as const;

const EN = { showRemaining: 'Show remaining time', showElapsed: 'Show elapsed time' };
const TR = { showRemaining: 'Kalan süreyi göster', showElapsed: 'Geçen süreyi göster' };

let registered = false;

export function registerTimeDisplayI18n(): void {
  if (registered) return;
  registered = true;
  const register = registerI18n as unknown as (locale: string, translations: Record<string, unknown>) => void;
  register('tr', { caramel: { time: TR } });
  register('en', { caramel: { time: EN } });
}

/** Reads the stored preference; anything unexpected means `elapsed`. */
export function readTimeDisplayMode(storage: Pick<Storage, 'getItem'> | null): TimeDisplayMode {
  try {
    return storage?.getItem(TIME_DISPLAY_STORAGE_KEY) === 'remaining' ? 'remaining' : 'elapsed';
  } catch {
    return 'elapsed';
  }
}

export function writeTimeDisplayMode(storage: Pick<Storage, 'setItem'> | null, mode: TimeDisplayMode): void {
  try {
    storage?.setItem(TIME_DISPLAY_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable (private mode, quota): the choice lives for this page only.
  }
}

/**
 * <caramel-time-display>
 *
 * YouTube style clickable counter: `01:23 / 05:00` or `-03:37 / 05:00`. The
 * host markup provides the three `<media-time>` children inside a button:
 *
 *   <caramel-time-display>
 *     <button type="button" class="caramel-time-button">
 *       <media-time class="caramel-time-current" type="current"></media-time>
 *       <media-time class="caramel-time-remaining" type="remaining"></media-time>
 *       <span class="caramel-time-sep" aria-hidden="true">/</span>
 *       <media-time class="caramel-time-duration" type="duration"></media-time>
 *     </button>
 *   </caramel-time-display>
 *
 * The element toggles `data-mode="elapsed|remaining"` (CSS shows one of the
 * two left values), keeps the choice in localStorage and labels the button
 * with the action it performs (TR/EN through the Video.js i18n registry).
 */
export class CaramelTimeDisplayElement extends Base {
  static readonly tagName = 'caramel-time-display';

  readonly #i18n = new I18nController(this, i18nContext);
  #mode: TimeDisplayMode = 'elapsed';
  #bound = false;

  get mode(): TimeDisplayMode {
    return this.#mode;
  }

  set mode(value: TimeDisplayMode) {
    this.#mode = value === 'remaining' ? 'remaining' : 'elapsed';
    writeTimeDisplayMode(storage(), this.#mode);
    this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerTimeDisplayI18n();
    this.#mode = readTimeDisplayMode(storage());
    if (!this.#bound) {
      this.#bound = true;
      // Own-child listener: lives with the element, survives reconnects.
      this.addEventListener('click', (event) => {
        const button = (event.target as Element | null)?.closest('button');
        if (button && this.contains(button)) this.toggle();
      });
    }
    this.requestUpdate();
  }

  /** Switches between elapsed and remaining. */
  toggle(): TimeDisplayMode {
    this.mode = this.#mode === 'elapsed' ? 'remaining' : 'elapsed';
    return this.#mode;
  }

  override update(changed: PropertyValues): void {
    super.update(changed);
    this.dataset['mode'] = this.#mode;
    const button = this.querySelector('button');
    if (!button) return;
    const key = this.#mode === 'elapsed' ? KEYS.showRemaining : KEYS.showElapsed;
    const fallback = this.#mode === 'elapsed' ? EN.showRemaining : EN.showElapsed;
    const label = this.#i18n.value(key, { default: fallback });
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-time-display': CaramelTimeDisplayElement;
  }
}
