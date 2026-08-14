/**
 * Wegplanung: die Entkopplung von Spielzeit und Darstellung.
 *
 * Der Kern der Sache: Die Kosten in Spielminuten müssen exakt erhalten
 * bleiben — sie sind die Ressource, um die gespielt wird. Nur ihre Aufteilung
 * auf Laufen und Fahren darf sich verschieben, damit das Laufen bei jeder
 * Geschwindigkeit gleich flott aussieht.
 */
import { describe, expect, it } from 'vitest';
import { easeInOut, planTravel, travelAt } from '../src/world/travel';

describe('planTravel', () => {
  it('behält die Gesamtkosten in Spielminuten exakt bei', () => {
    for (const total of [1, 1.5, 2, 3, 6, 12, 18, 30, 42, 99]) {
      for (const [a, b] of [[0, 12], [6, 7], [11, 1], [3, 8]] as const) {
        const p = planTravel(a, b, total);
        expect(p.toLift + p.ride + p.toDoor).toBeCloseTo(Math.max(1, total), 9);
        expect(p.toLift).toBeGreaterThanOrEqual(0);
        expect(p.ride).toBeGreaterThan(0);
        expect(p.toDoor).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('deckelt die Laufabschnitte, damit Laufen nie zäh wird', () => {
    const kurz = planTravel(6, 7, 6);
    const lang = planTravel(0, 12, 42);
    expect(kurz.toLift).toBeLessThanOrEqual(4);
    expect(lang.toLift).toBeLessThanOrEqual(4);
    // Bei langem Weg schluckt die Fahrt den Rest
    expect(lang.ride).toBeGreaterThan(lang.toLift + lang.toDoor);
  });

  it('gibt bei gleicher Etage keine Fahrt aus', () => {
    const p = planTravel(4, 4, 3);
    expect(p.ride).toBe(0);
    expect(p.toLift).toBe(0);
    expect(p.toDoor).toBe(3);
  });

  it('kommt auch mit unsinnigen Eingaben klar', () => {
    const p = planTravel(2, 9, 0);
    expect(p.total).toBe(1);
    expect(p.toLift + p.ride + p.toDoor).toBeCloseTo(1, 9);
    expect(p.ride).toBeGreaterThan(0);
  });
});

describe('travelAt', () => {
  const plan = planTravel(2, 9, 24);

  it('durchläuft die Abschnitte in der richtigen Reihenfolge', () => {
    const seen: string[] = [];
    for (let e = 0; e <= plan.total; e += 0.25) {
      const ph = travelAt(plan, e).phase;
      if (seen[seen.length - 1] !== ph) seen.push(ph);
    }
    expect(seen).toEqual(['toLift', 'ride', 'toDoor', 'done']);
  });

  it('liefert innerhalb jedes Abschnitts einen Fortschritt von 0 bis 1', () => {
    expect(travelAt(plan, 0).t).toBeCloseTo(0, 6);
    expect(travelAt(plan, plan.toLift - 0.001).t).toBeGreaterThan(0.99);
    expect(travelAt(plan, plan.toLift).t).toBeCloseTo(0, 6);
    expect(travelAt(plan, plan.total).phase).toBe('done');
  });

  it('zählt die Etagen während der Fahrt monoton durch', () => {
    const floors: number[] = [];
    for (let e = plan.toLift; e < plan.toLift + plan.ride; e += 0.1) {
      floors.push(travelAt(plan, e).floor);
    }
    expect(floors[0]).toBe(2);
    expect(floors[floors.length - 1]).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < floors.length; i++) {
      expect(floors[i]!).toBeGreaterThanOrEqual(floors[i - 1]!);
    }
  });

  it('zählt abwärts genauso', () => {
    const ab = planTravel(11, 1, 30);
    const start = travelAt(ab, ab.toLift + 0.01).floor;
    const ende = travelAt(ab, ab.toLift + ab.ride - 0.01).floor;
    expect(start).toBeGreaterThan(ende);
    expect(travelAt(ab, ab.total).floor).toBe(1);
  });

  it('hält den Versatz für den Etagendurchlauf in Grenzen', () => {
    for (let e = 0; e <= plan.total; e += 0.05) {
      const st = travelAt(plan, e);
      expect(Math.abs(st.floorOffset)).toBeLessThanOrEqual(0.5001);
    }
  });

  it('verträgt negative und überlange Zeiten', () => {
    expect(travelAt(plan, -5).phase).toBe('toLift');
    expect(travelAt(plan, 9999).phase).toBe('done');
  });
});

describe('easeInOut', () => {
  it('beginnt bei 0, endet bei 1 und bleibt dazwischen', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6);
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeInOut(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('steigt streng monoton', () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.02) {
      const v = easeInOut(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('begrenzt Werte außerhalb von 0…1', () => {
    expect(easeInOut(-3)).toBe(0);
    expect(easeInOut(7)).toBe(1);
  });
});
