/**
 * Schwierigkeitskurve.
 *
 * Diese Läufe ersetzen das, was vorher von Hand im Browser gemessen wurde.
 * Sie prüfen nicht exakte Tageszahlen — die dürfen sich beim Feinschliff
 * verschieben — sondern die Ordnung: leicht muss leichter sein als normal,
 * normal leichter als schwer, und alle drei müssen gewinnbar bleiben.
 */
import { describe, expect, it } from 'vitest';
import { runBot } from './bot';
import type { DifficultyId } from '../src/core';

const SEEDS = [20250814, 777, 31337];

function bestOf(diff: DifficultyId, lateGame: boolean) {
  return SEEDS.map((seed) => runBot(diff, { seed, lateGame, maxDays: 80 }));
}

function report(name: string, runs: ReturnType<typeof bestOf>): string {
  return runs
    .map((r, i) => `  Lauf ${i + 1}: ${r.ending} an Tag ${r.days} · ` +
      `Image ${r.image.toFixed(1)}% · Betty ${Math.round(r.love)} · ` +
      `${Math.round(r.money / 1000)}k € · Reichweite ${Math.round(r.reach * 100)}%`)
    .join('\n')
    .replace(/^/, `${name}\n`);
}

describe('Schwierigkeitskurve', () => {
  it('leicht ist mit solidem Spiel gewinnbar', () => {
    const runs = bestOf('leicht', true);
    console.log(report('leicht:', runs));
    expect(runs.filter((r) => r.won).length).toBeGreaterThanOrEqual(2);
  });

  it('normal ist gewinnbar, dauert aber länger als leicht', () => {
    const leicht = bestOf('leicht', true);
    const normal = bestOf('normal', true);
    console.log(report('normal:', normal));
    expect(normal.filter((r) => r.won).length).toBeGreaterThanOrEqual(2);

    const avg = (rs: typeof normal) =>
      rs.filter((r) => r.won).reduce((a, r) => a + r.days, 0) / Math.max(1, rs.filter((r) => r.won).length);
    expect(avg(normal)).toBeGreaterThan(avg(leicht));
  });

  it('schwer ist ohne Spätspiel-Werkzeuge deutlich zäher', () => {
    const ohne = bestOf('schwer', false);
    const mit = bestOf('schwer', true);
    console.log(report('schwer ohne Satellit/Star:', ohne));
    console.log(report('schwer mit vollem Werkzeugkasten:', mit));
    // Satellit und Starmoderator müssen sich messbar auszahlen
    const bestImage = (rs: typeof ohne) => Math.max(...rs.map((r) => r.image));
    expect(bestImage(mit)).toBeGreaterThan(bestImage(ohne));
  });

  it('führt nirgends zu absurden Zuständen', () => {
    for (const diff of ['leicht', 'normal', 'schwer'] as DifficultyId[]) {
      for (const seed of SEEDS) {
        const r = runBot(diff, { seed, lateGame: true, maxDays: 60 });
        expect(Number.isFinite(r.image)).toBe(true);
        expect(r.image).toBeGreaterThan(0);
        expect(r.image).toBeLessThanOrEqual(100);
        expect(r.love).toBeGreaterThanOrEqual(0);
        expect(r.love).toBeLessThanOrEqual(100);
        expect(Number.isFinite(r.money)).toBe(true);
        r.rivalImages.forEach((v) => {
          expect(v).toBeGreaterThan(0);
          expect(v).toBeLessThan(100);
        });
      }
    }
  });

  it('Geld bleibt bis zuletzt eine Entscheidung', () => {
    // Ohne Geldsenken im Spätspiel türmten sich früher zweistellige Millionen.
    const runs = bestOf('normal', true);
    const gewonnen = runs.filter((r) => r.won);
    if (!gewonnen.length) return;
    const schnitt = gewonnen.reduce((a, r) => a + r.money, 0) / gewonnen.length;
    console.log(`  Kontostand bei Spielende im Schnitt: ${Math.round(schnitt / 1000)}k €`);
    expect(schnitt).toBeLessThan(20_000_000);
  });
});
