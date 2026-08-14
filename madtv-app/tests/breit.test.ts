/**
 * Breite Messung der Schwierigkeitskurve.
 *
 * `npm run sim` läuft mit drei Startwerten — schnell genug für jeden Commit,
 * aber zu wenig, um eine Kurve zu beurteilen. Als der Katalog auf über tausend
 * Titel wuchs, sahen diese drei Läufe nach einem Einbruch aus; mit zehn
 * Startwerten war die Ordnung völlig intakt. Seitdem gibt es beides.
 *
 * Läuft nicht bei `npm test` mit — dafür dauert sie zu lang:
 *
 *     npm run sim:breit
 */
import { describe, it } from 'vitest';
import { runBot } from './bot';
import type { DifficultyId } from '../src/core';

const SEEDS = [20250814, 777, 31337, 12345, 99, 5150, 42424, 8080, 31415, 271828];
const AN = process.env.MADTV_BREIT === '1';

describe.skipIf(!AN)('Breite Messung', () => {
  it('misst zehn Startwerte je Grad', () => {
    for (const [diff, late] of [['leicht', true], ['normal', true],
                                ['schwer', false], ['schwer', true]] as [DifficultyId, boolean][]) {
      const rs = SEEDS.map((seed) => runBot(diff, { seed, lateGame: late, maxDays: 90 }));
      const siege = rs.filter((r) => r.won);
      const tage = siege.map((r) => r.days).sort((a, b) => a - b);
      const mittel = tage.length ? Math.round(tage.reduce((a, b) => a + b, 0) / tage.length) : 0;
      const median = tage.length ? tage[Math.floor(tage.length / 2)] : 0;
      console.log(
        `${diff}${late ? ' (mit Werkzeugen)' : ' (ohne)'}: ${siege.length}/10 Siege · ` +
        `Median ${median} · Mittel ${mittel} · Spanne ${tage[0] ?? '—'}–${tage[tage.length - 1] ?? '—'}`);
    }
  }, 180_000);
});
