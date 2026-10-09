import { I18nController, SeekIndicatorElement, i18nContext } from '@videojs/html';
import { registerI18n } from '@videojs/html/i18n';

/** HTMLElement stand-in so the module can be imported during SSR. */
const Base: typeof SeekIndicatorElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof SeekIndicatorElement) : SeekIndicatorElement;

export type SeekDirection = 'forward' | 'backward';

const UNIT_KEY = 'caramel.seek.seconds';
const UNIT_EN = 's';
const UNIT_TR = 'sn';

let registered = false;

export function registerSeekIndicatorI18n(): void {
  if (registered) return;
  registered = true;
  const register = registerI18n as unknown as (locale: string, translations: Record<string, unknown>) => void;
  register('tr', { caramel: { seek: { seconds: UNIT_TR } } });
  register('en', { caramel: { seek: { seconds: UNIT_EN } } });
}

/**
 * Label for an accumulated arrow key seek: `+5 sn`, `-15 s`. Null when there
 * is nothing to show (no direction, or the seek hit the start / end).
 */
export function formatSeekLabel(
  total: number,
  direction: SeekDirection | null | undefined,
  unit: string,
  locale?: string,
): string | null {
  if (!direction || !Number.isFinite(total) || total <= 0) return null;
  let amount: string;
  try {
    amount = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, useGrouping: false }).format(total);
  } catch {
    amount = String(Math.round(total * 10) / 10);
  }
  return `${direction === 'forward' ? '+' : '-'}${amount} ${unit}`;
}

interface SeekCoreLike {
  processEvent(event: { action?: string }, snapshot: unknown): boolean;
  state: {
    current: { direction: SeekDirection | null; seekTotal: number };
    patch(value: { value: string | null }): void;
  };
}

/**
 * <caramel-seek-indicator>
 *
 * Video.js seek indicator for the arrow keys (and double tap), with two
 * changes: the 0-9 / Home / End jumps show nothing, and the value reads as a
 * signed, accumulated step from the real seek amount ("+5 sn", "+10 sn",
 * "-5 sn"). Placement (left for backward, right for forward), stacking of
 * rapid presses and the close delay stay Video.js behavior.
 */
export class CaramelSeekIndicatorElement extends Base {
  /** Registration name (the inherited `tagName` is typed as the Video.js tag). */
  static readonly caramelTagName = 'caramel-seek-indicator';

  readonly #i18n = new I18nController(this, i18nContext);

  constructor() {
    super();
    const core = this.core as unknown as SeekCoreLike;
    const processEvent = core.processEvent.bind(core);
    core.processEvent = (event, snapshot) => {
      if (event.action !== 'seekStep') return false;
      const handled = processEvent(event, snapshot);
      if (handled) {
        const { seekTotal, direction } = core.state.current;
        const unit = this.#i18n.value(UNIT_KEY, { default: UNIT_EN });
        core.state.patch({ value: formatSeekLabel(seekTotal, direction, unit, this.#i18n.locale) });
      }
      return handled;
    };
  }

  override connectedCallback(): void {
    registerSeekIndicatorI18n();
    super.connectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'caramel-seek-indicator': CaramelSeekIndicatorElement;
  }
}
