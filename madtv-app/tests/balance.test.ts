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
/** Obergrenze der Messläufe — ein nicht gewonnener Lauf zählt schlechter als jeder Sieg. */
const MAX_DAYS = 80;

function bestOf(diff: DifficultyId, lateGame: boolean) {
  return SEEDS.map((seed) => runBot(diff, { seed, lateGame, maxDays: MAX_DAYS }));
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

    // Gemessen wird, wie schnell gewonnen wird — nicht, wie hoch das Image am
    // Ende steht. Ein Lauf, der erst an Tag 78 gewinnt, hatte 78 Tage Zeit zum
    // Klettern; ein Lauf, der an Tag 46 heiratet, hört genau dann auf. Nach dem
    // Spitzenimage zu fragen belohnte also die lange Partie und verkehrte den
    // Nutzen der Werkzeuge ins Gegenteil.
    const siege = (rs: typeof ohne) => rs.filter((r) => r.won).length;
    const dauer = (rs: typeof ohne) =>
      rs.reduce((a, r) => a + (r.won ? r.days : MAX_DAYS + 20), 0) / rs.length;

    expect(siege(mit)).toBeGreaterThanOrEqual(siege(ohne));
    expect(dauer(mit)).toBeLessThan(dauer(ohne) - 10);
    // Und die Reichweite ist der Weg dorthin: Satellit und Masten wirken direkt
    expect(Math.max(...mit.map((r) => r.reach))).toBeGreaterThan(Math.max(...ohne.map((r) => r.reach)));
  });

  /**
   * Die Konkurrenz muss die ganze Partie über handlungsfähig bleiben.
   *
   * Sie war es lange nicht: Weil sie die Mindestquote von Zielgruppenverträgen
   * mit ihrer Gesamtzuschauerzahl verglich, unterschrieb sie Verträge, von
   * denen sie keinen einzigen Spot erfüllen konnte, und war ab Tag 7 mit
   * Millionenschulden aus dem Spiel — unsichtbar, denn ihre Kasse steht
   * nirgends. Der Marktanteil, den der Spieler ab Woche zwei gewann, war zu
   * einem guten Teil der Anteil zweier Sender, die sich selbst abgeschafft
   * hatten. Genau das prüfen diese beiden Zahlen.
   */
  it('lässt die Konkurrenz nicht am eigenen Werbegeschäft zugrunde gehen', () => {
    const runs = bestOf('normal', true);
    const kassen = runs.flatMap((r) => r.rivalMoney);
    console.log(
      `Konkurrenzkassen am Partieende: ${kassen.map((m) => Math.round(m / 1000) + 'k').join(', ')}` +
      ` · weggeschnappte Titel je Partie: ${runs.map((r) => r.snipes).join(', ')}`,
    );

    // Ein Minus darf vorkommen; ein Millionenloch heißt, dass sie sich selbst
    // zerlegt hat statt gegen den Spieler zu verlieren.
    kassen.forEach((m) => expect(m).toBeGreaterThan(-3_000_000));
    // Und sie muss dem Spieler mindestens gelegentlich einen Titel wegkaufen.
    expect(runs.reduce((a, r) => a + r.snipes, 0)).toBeGreaterThan(0);
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
