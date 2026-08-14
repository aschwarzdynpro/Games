/**
 * Der Datensatz.
 *
 * Filme, Serien und Werbemarken stehen als Textzeilen mit senkrechten Strichen
 * in `data.ts`. Das ist bequem zu erweitern und genau deshalb heikel: Ein Feld
 * zu wenig, ein Genre falsch geschrieben, ein Titel zweimal — nichts davon
 * bricht den Build, es fällt erst im Spiel auf. Beim Auffüllen auf 186 Filme
 * und 100 Marken sind mir prompt drei Doppelungen durchgerutscht.
 *
 * Diese Prüfungen lesen die Tabellen so, wie der Spielkern sie liest.
 */
import { describe, expect, it } from 'vitest';
import { BRANDS, FILM_DATA, GENRES, GIDX, GROUPS, SERIE_DATA, buildCatalog } from '../src/core';
import type { GenreId } from '../src/core';

/* Die Tabellen liegen bereits als Zeilenarrays vor — data.ts zerlegt sie
   direkt hinter dem Textblock. */
const FILME = FILM_DATA.filter(Boolean);
const SERIEN = SERIE_DATA.filter(Boolean);
const MARKEN = BRANDS.filter(Boolean);

/** Was mehrfach vorkommt — leer heißt sauber. */
function doppelt(werte: string[]): string[] {
  const gesehen = new Set<string>();
  const raus = new Set<string>();
  for (const w of werte) {
    if (gesehen.has(w)) raus.add(w);
    gesehen.add(w);
  }
  return [...raus];
}

describe('Filmkatalog', () => {
  it('ist gewachsen und bleibt vollständig', () => {
    expect(FILME.length).toBeGreaterThanOrEqual(180);
    for (const z of FILME) expect(z.split('|'), z).toHaveLength(4);
  });

  it('nennt jeden Titel nur einmal', () => {
    expect(doppelt(FILME.map((z) => z.split('|')[0]!))).toEqual([]);
  });

  it('benutzt nur bekannte Genres, Jahre und Güteklassen', () => {
    for (const z of FILME) {
      const [titel, genre, jahr, tier] = z.split('|') as [string, GenreId, string, string];
      expect(GENRES[genre], `${titel}: Genre ${genre}`).toBeDefined();
      expect(Number(jahr), titel).toBeGreaterThanOrEqual(1950);
      expect(Number(jahr), titel).toBeLessThanOrEqual(1991);
      expect(Number(tier), titel).toBeGreaterThanOrEqual(1);
      expect(Number(tier), titel).toBeLessThanOrEqual(5);
    }
  });

  it('lässt kein Genre auf einer Handvoll Titel sitzen', () => {
    const je = new Map<string, number>();
    for (const z of FILME) {
      const g = z.split('|')[1]!;
      je.set(g, (je.get(g) ?? 0) + 1);
    }
    // Unter sechs Titeln wiederholt sich ein Genre binnen einer Woche
    for (const [g, n] of je) expect(n, `Genre ${g}`).toBeGreaterThanOrEqual(6);
  });

  it('hält die Spitzenklasse knapp — sonst wäre sie nichts wert', () => {
    const spitze = FILME.filter((z) => z.split('|')[3] === '5').length;
    const anteil = spitze / FILME.length;
    expect(anteil).toBeGreaterThan(0.02);
    expect(anteil).toBeLessThan(0.09);
  });
});

describe('Serien', () => {
  it('sind vollständig und eindeutig', () => {
    expect(SERIEN.length).toBeGreaterThanOrEqual(20);
    for (const z of SERIEN) expect(z.split('|'), z).toHaveLength(5);
    expect(doppelt(SERIEN.map((z) => z.split('|')[0]!))).toEqual([]);
  });

  it('kommen als Staffel mit 8 bis 24 Folgen', () => {
    for (const z of SERIEN) {
      const [titel, genre, , , eps] = z.split('|') as [string, GenreId, string, string, string];
      expect(GENRES[genre], `${titel}: Genre ${genre}`).toBeDefined();
      expect(Number(eps), titel).toBeGreaterThanOrEqual(8);
      expect(Number(eps), titel).toBeLessThanOrEqual(24);
    }
  });
});

describe('Werbekunden', () => {
  it('sind vollständig und eindeutig', () => {
    expect(MARKEN.length).toBeGreaterThanOrEqual(90);
    for (const z of MARKEN) expect(z.split('|'), z).toHaveLength(3);
    expect(doppelt(MARKEN.map((z) => z.split('|')[0]!))).toEqual([]);
  });

  it('zielen alle auf eine bekannte Zielgruppe', () => {
    for (const z of MARKEN) {
      const [marke, , gruppe] = z.split('|') as [string, string, string];
      expect(GIDX[gruppe], `${marke}: Zielgruppe ${gruppe}`).toBeDefined();
    }
  });

  it('verteilen sich auf alle Zielgruppen', () => {
    const je = new Map<string, number>();
    for (const z of MARKEN) {
      const g = z.split('|')[2]!;
      je.set(g, (je.get(g) ?? 0) + 1);
    }
    // Sonst gäbe es für eine Gruppe nie einen passenden Vertrag
    for (const grp of GROUPS) expect(je.get(grp.id) ?? 0, grp.name).toBeGreaterThanOrEqual(8);
  });
});

describe('Der Katalog im Spiel', () => {
  it('übernimmt jede Zeile genau einmal', () => {
    const { catalog } = buildCatalog(4711);
    expect(catalog.length).toBe(FILME.length + SERIEN.length);
    expect(doppelt(catalog.map((l) => l.uid.toString()))).toEqual([]);
  });
});
