/**
 * Zeichensatz.
 *
 * Der Build löst Symbolnamen erst zur Laufzeit auf: `icon('flr-buero')` mit
 * einem Tippfehler wirft keinen Fehler, es erscheint nur ein blasser Kreis.
 * Diese Prüfungen schließen die Lücke — sie lesen den Quelltext und die
 * Symboldateien und halten beide Seiten zusammen.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('..', import.meta.url).pathname;
const ICON_DIR = join(ROOT, 'src/assets/icons');

const FILES = readdirSync(ICON_DIR).filter((f) => f.endsWith('.svg'));
const NAMES = new Set(FILES.map((f) => f.slice(0, -4)));

function sources(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (f.endsWith('.ts')) out.push(p);
  }
  return out;
}
const SRC = sources(join(ROOT, 'src')).map((p) => ({ p, t: readFileSync(p, 'utf8') }));

describe('Symboldateien', () => {
  it('liegen vollständig vor', () => {
    expect(FILES.length).toBeGreaterThan(60);
  });

  it('halten alle dasselbe Raster und dieselbe Strichstärke', () => {
    for (const f of FILES) {
      const svg = readFileSync(join(ICON_DIR, f), 'utf8');
      expect(svg, f).toContain('viewBox="0 0 24 24"');
      expect(svg, f).toContain('stroke="currentColor"');
      // Feste Farben würden sich nicht mehr einfärben lassen
      expect(svg, f).not.toMatch(/(?:fill|stroke)="#[0-9a-f]/i);
    }
  });

  it('tragen sprechende Namen mit Bereichspräfix', () => {
    for (const n of NAMES) expect(n, n).toMatch(/^(gen|grp|res|flr|mod|gsh|dif|ui)-[a-z0-9]+$/);
  });
});

/**
 * Das Bereichspräfix macht die Prüfung überhaupt erst möglich: Eine Zeichenkette
 * der Form `flr-office` kann im Quelltext nichts anderes sein als ein Symbolname.
 * Deshalb muss keine Aufrufform bekannt sein — weder `icon()` noch `dialog()`
 * noch das Feld `ico` — es reicht, alle Zeichenketten dieser Form einzusammeln.
 */
const REF = /'((?:gen|grp|res|flr|mod|gsh|dif|ui)-[a-z0-9]+)'/g;

describe('Verwendung im Quelltext', () => {
  const used = new Set<string>();
  const missing: string[] = [];
  for (const { p, t } of SRC) {
    for (const m of t.matchAll(REF)) {
      used.add(m[1]!);
      if (!NAMES.has(m[1]!)) missing.push(`${p}: ${m[1]}`);
    }
  }

  it('zeigt auf kein Symbol, das es nicht gibt', () => {
    expect(missing).toEqual([]);
  });

  it('lässt keine Datei ungenutzt liegen', () => {
    const tot = [...NAMES].filter((n) => !used.has(n));
    expect(tot).toEqual([]);
  });
});

describe('Keine Emoji mehr', () => {
  it('weder im Quelltext noch in der Rahmendatei', () => {
    const re = /\p{Extended_Pictographic}/u;
    const fund = SRC.filter(({ t }) => re.test(t)).map(({ p }) => p);
    fund.push(...(re.test(readFileSync(join(ROOT, 'index.html'), 'utf8')) ? ['index.html'] : []));
    expect(fund).toEqual([]);
  });
});
