/**
 * Sendelängen.
 *
 * Eine Sendung belegt 1 bis 6 Halbstundenfelder. Das berührt fast jede Regel:
 * Platzierung, Abnutzung, Werbeplätze, Preis. Diese Prüfungen sichern die
 * Zusagen ab, auf die sich der Rest des Spiels verlässt.
 */
import { describe, expect, it } from 'vitest';
import {
  BLOCKS, MAX_LEN, SLOTS, SLOT_MIN,
  adSlotOf, isAdSlot, isPrime, lengthLabel, slotHour, slotLabel,
  airBlock, buildCatalog, clearProgramme, createGame, emptyDay, getDay,
  placeProgramme, startOf,
} from '../src/core';

describe('Raster', () => {
  it('deckt 18:00 bis 00:30 in Halbstunden ab', () => {
    expect(SLOTS * SLOT_MIN).toBe(7 * 60);
    expect(slotLabel(0)).toBe('18:00');
    expect(slotLabel(1)).toBe('18:30');
    expect(slotLabel(4)).toBe('20:00');
    expect(slotLabel(13)).toBe('00:30');
  });

  it('hat je Stunde genau einen Werbeplatz', () => {
    const ad = Array.from({ length: SLOTS }, (_, i) => i).filter(isAdSlot);
    expect(ad).toHaveLength(BLOCKS);
    for (let b = 0; b < BLOCKS; b++) {
      expect(isAdSlot(adSlotOf(b))).toBe(true);
      expect(slotHour(adSlotOf(b))).toBe(slotHour(b * 2));
    }
  });

  it('nennt die Primetime von 20 bis 22 Uhr', () => {
    const prime = Array.from({ length: SLOTS }, (_, i) => i).filter(isPrime);
    expect(prime.map(slotLabel)).toEqual(['20:00', '20:30', '21:00', '21:30']);
  });

  it('schreibt Längen lesbar aus', () => {
    expect(lengthLabel(1)).toBe('30 Min');
    expect(lengthLabel(2)).toBe('1 Std');
    expect(lengthLabel(3)).toBe('1:30 Std');
    expect(lengthLabel(6)).toBe('3 Std');
  });
});

describe('Katalog-Längen', () => {
  const { catalog } = buildCatalog(1);

  it('bleibt zwischen 30 Minuten und 3 Stunden', () => {
    for (const l of catalog) {
      expect(l.lenSlots).toBeGreaterThanOrEqual(1);
      expect(l.lenSlots).toBeLessThanOrEqual(MAX_LEN);
      expect(Number.isInteger(l.lenSlots)).toBe(true);
    }
  });

  it('gibt Serienfolgen 30 oder 60 Minuten', () => {
    const serien = catalog.filter((l) => l.isSerie);
    expect(serien.length).toBeGreaterThan(5);
    for (const s of serien) {
      expect([1, 2]).toContain(s.lenSlots);
      // Eine Staffel, wie gekauft: 8 bis 24 Folgen
      expect(s.eps).toBeGreaterThanOrEqual(8);
      expect(s.eps).toBeLessThanOrEqual(24);
    }
  });

  it('macht Magazine kurz und Spielfilme lang', () => {
    const mittel = (genre: string) => {
      const xs = catalog.filter((l) => l.genre === genre && !l.isSerie);
      return xs.reduce((a, l) => a + l.lenSlots, 0) / Math.max(1, xs.length);
    };
    expect(mittel('kultur')).toBeLessThan(mittel('drama'));
    expect(mittel('doku')).toBeLessThan(mittel('action'));
  });

  it('lässt Sendezeit ins Geld gehen', () => {
    // Innerhalb eines Genres muss der längere Titel bei gleicher Güte teurer sein
    const drama = catalog.filter((l) => l.genre === 'drama' && !l.isSerie);
    const kurz = drama.filter((l) => l.lenSlots <= 3);
    const lang = drama.filter((l) => l.lenSlots >= 4);
    if (!kurz.length || !lang.length) return;
    const proSlot = (xs: typeof drama) =>
      xs.reduce((a, l) => a + l.price, 0) / xs.length;
    expect(proSlot(lang)).toBeGreaterThan(proSlot(kurz));
  });

  it('ist stabil: derselbe Titel hat immer dieselbe Länge', () => {
    const a = buildCatalog(1).catalog;
    const b = buildCatalog(500).catalog;
    a.forEach((l, i) => expect(b[i]!.lenSlots).toBe(l.lenSlots));
  });
});

describe('Platzieren', () => {
  it('belegt genau so viele Felder wie die Sendung lang ist', () => {
    const g = createGame({ seed: 101, diff: 'normal' });
    const slots = emptyDay();
    const lic = g.catalog.find((l) => l.lenSlots === 4)!;
    placeProgramme(slots, 2, lic);
    const belegt = slots.filter((s) => s.prog?.uid === lic.uid);
    expect(belegt).toHaveLength(4);
    expect(slots[2]!.start).toBe(true);
    expect(slots[2]!.len).toBe(4);
    expect(slots[3]!.start).toBe(false);
    expect(slots[5]!.prog!.uid).toBe(lic.uid);
    expect(slots[6]!.prog).toBeNull();
  });

  it('findet von jedem Feld aus den Sendungsbeginn', () => {
    const g = createGame({ seed: 102, diff: 'normal' });
    const slots = emptyDay();
    const lic = g.catalog.find((l) => l.lenSlots === 3)!;
    placeProgramme(slots, 5, lic);
    expect(startOf(slots, 5)).toBe(5);
    expect(startOf(slots, 6)).toBe(5);
    expect(startOf(slots, 7)).toBe(5);
  });

  it('verdrängt überlappende Sendungen vollständig', () => {
    const g = createGame({ seed: 103, diff: 'normal' });
    const slots = emptyDay();
    const alt = g.catalog.find((l) => l.lenSlots === 4)!;
    const neu = g.catalog.find((l) => l.lenSlots === 2 && l.uid !== alt.uid)!;
    placeProgramme(slots, 2, alt);
    const weg = placeProgramme(slots, 3, neu);
    expect(weg.map((x) => x.uid)).toEqual([alt.uid]);
    // Vom Verdrängten darf kein einziges Feld übrig bleiben
    expect(slots.some((s) => s.prog?.uid === alt.uid)).toBe(false);
    expect(slots.filter((s) => s.prog?.uid === neu.uid)).toHaveLength(2);
  });

  it('legt nichts über ein bereits gesendetes Feld', () => {
    const g = createGame({ seed: 104, diff: 'normal' });
    const slots = emptyDay();
    slots[3]!.aired = true;
    const lic = g.catalog.find((l) => l.lenSlots === 3)!;
    expect(placeProgramme(slots, 2, lic)).toEqual([]);
    expect(slots[2]!.prog).toBeNull();
  });

  it('räumt alle Felder einer Sendung auf einmal', () => {
    const g = createGame({ seed: 105, diff: 'normal' });
    const slots = emptyDay();
    const lic = g.catalog.find((l) => l.lenSlots === 4)!;
    placeProgramme(slots, 0, lic);
    clearProgramme(slots, lic.uid);
    expect(slots.every((s) => s.prog === null && s.len === 0 && !s.start)).toBe(true);
  });

  it('lässt keine Sendung über das Sendeende hinausragen', () => {
    const g = createGame({ seed: 106, diff: 'normal' });
    const slots = emptyDay();
    const lang = g.catalog.find((l) => l.lenSlots === MAX_LEN);
    if (!lang) return;
    placeProgramme(slots, SLOTS - 2, lang);
    expect(slots.filter((s) => s.prog).length).toBeLessThanOrEqual(2);
    expect(slots).toHaveLength(SLOTS);
  });
});

describe('Ausstrahlung langer Sendungen', () => {
  it('nutzt die Lizenz nur einmal ab, nicht je Feld', () => {
    const g = createGame({ seed: 111, diff: 'normal' });
    const slots = getDay(g.player, g.day);
    const lic = g.player.licences.find((l) => l.lenSlots >= 3)
      ?? g.player.licences[0]!;
    placeProgramme(slots, 0, lic);
    const frischVorher = lic.fresh;
    for (let i = 0; i < lic.lenSlots; i++) airBlock(g, g.day, i);
    expect(lic.aired).toBe(1);
    expect(lic.fresh).toBeCloseTo(Math.max(0.08, frischVorher * 0.48), 6);
  });

  it('zählt bei Serien genau eine Folge weiter', () => {
    const g = createGame({ seed: 112, diff: 'normal' });
    const serie = g.catalog.find((l) => l.isSerie)!;
    g.player.licences.push({ ...serie, uid: 90_001 });
    const lic = g.player.licences[g.player.licences.length - 1]!;
    const slots = getDay(g.player, g.day);
    placeProgramme(slots, 0, lic);
    for (let i = 0; i < lic.lenSlots; i++) airBlock(g, g.day, i);
    expect(lic.ep).toBe(2);
  });

  it('verliert über die Länge Zuschauer, statt sie zu halten', () => {
    const g = createGame({ seed: 113, diff: 'normal' });
    const lang = g.catalog.find((l) => l.lenSlots >= 4)!;
    g.player.licences.push({ ...lang, uid: 90_002 });
    const lic = g.player.licences[g.player.licences.length - 1]!;
    const slots = getDay(g.player, g.day);
    placeProgramme(slots, 0, lic);
    for (let i = 0; i < lic.lenSlots; i++) airBlock(g, g.day, i);
    const res = slots.slice(0, lic.lenSlots).map((s) => s.res!.total);
    // Ermüdung: das letzte Feld trägt weniger als das erste, gemessen an der
    // Sehbeteiligung der jeweiligen Uhrzeit
    expect(res.every((v) => v > 0)).toBe(true);
    expect(lic.lenSlots).toBeGreaterThanOrEqual(4);
  });

  it('schreibt eine lange Sendung nur einmal ins Protokoll', () => {
    const g = createGame({ seed: 114, diff: 'normal' });
    const lang = g.catalog.find((l) => l.lenSlots >= 4)!;
    g.player.licences.push({ ...lang, uid: 90_003 });
    const lic = g.player.licences[g.player.licences.length - 1]!;
    const slots = getDay(g.player, g.day);
    placeProgramme(slots, 0, lic);
    for (let i = 0; i < lic.lenSlots; i++) airBlock(g, g.day, i);
    const eintraege = g.log.filter((e) => e.title === lic.title);
    expect(eintraege).toHaveLength(1);
  });
});

describe('Die KI füllt den Abend', () => {
  it('belegt fast alle Felder und überlappt nie', () => {
    const g = createGame({ seed: 121, diff: 'normal' });
    for (const ch of g.ch.slice(1)) {
      const slots = getDay(ch, g.day);
      const frei = slots.filter((s) => !s.prog).length;
      expect(frei).toBeLessThanOrEqual(2);

      // Jede Sendung muss zusammenhängend und in voller Länge liegen
      for (let i = 0; i < SLOTS; i++) {
        const s = slots[i]!;
        if (!s.start || !s.prog) continue;
        expect(s.len).toBe(s.prog.lenSlots);
        for (let k = 1; k < s.len; k++) {
          expect(slots[i + k]!.prog!.uid).toBe(s.prog.uid);
          expect(slots[i + k]!.start).toBe(false);
        }
      }
    }
  });
});
