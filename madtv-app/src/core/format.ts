/** Reine Formatierung. Keine Abhängigkeit zum DOM — auch Tests nutzen das. */

export function money(n: number): string {
  const s = Math.abs(Math.round(n)).toLocaleString('de-DE');
  return (n < 0 ? '−' : '') + s + ' €';
}

export function moneyShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return (n < 0 ? '−' : '') + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + ' Mio €';
  if (a >= 1000) return (n < 0 ? '−' : '') + Math.round(a / 1000) + 'k €';
  return money(n);
}

export function viewers(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + ' Mio';
  if (n >= 1000) return Math.round(n / 1000) + '.000';
  return String(Math.round(n));
}

export function pct(n: number, digits = 1): string {
  return (n * 100).toFixed(digits).replace('.', ',') + '%';
}

/** Minuten seit Mitternacht → "HH:MM", über 24 Uhr hinaus umlaufend. */
export function hhmm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/** HTML-Sonderzeichen entschärfen. Titel und Sendernamen sind frei wählbar. */
export function esc(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
