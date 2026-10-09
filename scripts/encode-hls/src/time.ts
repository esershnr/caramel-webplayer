/**
 * Parses "ss", "ss.s", "m:ss", "m:ss.s", "h:mm:ss" and "h:mm:ss.sss" into seconds.
 * Numbers are accepted as seconds. Throws on anything else.
 */
export function parseTime(value: unknown, label = 'time'): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${label}: ${value} is not a valid time`);
    return value;
  }
  if (typeof value !== 'string')
    throw new Error(`${label}: expected "m:ss", "h:mm:ss" or seconds, got ${typeof value}`);
  const text = value.trim();
  const match = /^(?:(\d+):)?(?:(\d{1,2}):)?(\d{1,2}(?:[.,]\d+)?)$/.exec(text);
  if (!match) throw new Error(`${label}: "${value}" is not a valid time (use "m:ss", "h:mm:ss" or seconds)`);
  const [, a, b, c] = match;
  const seconds = Number(c!.replace(',', '.'));
  let hours = 0;
  let minutes = 0;
  if (a !== undefined && b !== undefined) {
    hours = Number(a);
    minutes = Number(b);
  } else if (a !== undefined) {
    minutes = Number(a);
  }
  if (minutes >= 60 && hours > 0) throw new Error(`${label}: "${value}" has minutes above 59`);
  if (seconds >= 60 && (a !== undefined || b !== undefined))
    throw new Error(`${label}: "${value}" has seconds above 59`);
  return hours * 3600 + minutes * 60 + seconds;
}

/** WebVTT timestamp `HH:MM:SS.mmm`. */
export function formatVttTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  if (ms === 1000) return formatVttTime(Math.floor(total) + 1);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}
