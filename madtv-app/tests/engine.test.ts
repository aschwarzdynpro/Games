/**
 * Prüfungen der Simulation.
 *
 * Die drei Fehler, die im Review des Einzeldatei-Spiels auffielen, haben hier
 * jeweils einen eigenen Test — damit sie nicht zurückkommen.
 */
import { describe, expect, it } from 'vitest';
import {
  SLOTS, DIFFS, GENRES, GROUPS, NEWS_COST, POP, RESSORTS, slotHour,
  airBlock, airRemainingBlocks, buildCatalog, createGame, dailyCosts,
  deserialize, endOfDay, estimateBlock, getDay, newsAttraction, placeProgramme,
  reachOf, serialize,
} from '../src/core';
import { Rng, hash } from '../src/core';

describe('Zufallszahlen', () => {
  it('liefert bei gleichem Startwert dieselbe Folge', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('liefert bei anderem Startwert eine andere Folge', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('bleibt in [0,1) und deckt den Bereich ab', () => {
    const r = new Rng(7);
    let min = 1;
    let max = 0;
    for (let i = 0; i < 20_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeLessThan(0.01);
    expect(max).toBeGreaterThan(0.99);
  });

  it('int() erreicht beide Grenzen', () => {
    const r = new Rng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(r.int(1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('hash() ist stabil und titelabhängig', () => {
    expect(hash('Der Terminierer')).toBe(hash('Der Terminierer'));
    expect(hash('Der Terminierer')).not.toBe(hash('Der Zeitkurier'));
  });
});

describe('Partie ist reproduzierbar', () => {
  it('gleicher Startwert ergibt nach 10 Tagen denselben Zustand', () => {
    const play = () => {
      const g = createGame({ seed: 4242, diff: 'normal' });
      for (let d = 0; d < 10; d++) {
        const slots = getDay(g.player, g.day);
        let at = 0;
        for (const l of g.player.licences) {
          if (at + l.lenSlots > SLOTS) break;
          placeProgramme(slots, at, l);
          at += l.lenSlots;
        }
        airRemainingBlocks(g, g.day);
        endOfDay(g);
        g.events.length = 0;
        if (g.over) break;
      }
      return {
        day: g.day,
        image: g.player.image.toFixed(6),
        money: Math.round(g.player.money),
        rivals: g.ch.slice(1).map((c) => c.image.toFixed(6)),
      };
    };
    expect(play()).toEqual(play());
  });
});

describe('Katalog', () => {
  it('erzeugt Filme und Serien mit plausiblen Kennzahlen', () => {
    const { catalog } = buildCatalog(1);
    expect(catalog.length).toBeGreaterThan(100);
    for (const l of catalog) {
      expect(l.qual).toBeGreaterThanOrEqual(8);
      expect(l.qual).toBeLessThanOrEqual(97);
      expect(l.critic).toBeGreaterThanOrEqual(3);
      expect(l.box).toBeGreaterThanOrEqual(4);
      expect(l.price).toBeGreaterThan(0);
      expect(GENRES[l.genre]).toBeDefined();
      if (l.isSerie) expect(l.eps).toBeGreaterThan(0);
    }
  });

  it('vergibt eindeutige Kennungen', () => {
    const { catalog } = buildCatalog(1);
    expect(new Set(catalog.map((l) => l.uid)).size).toBe(catalog.length);
  });
});

describe('Quoten', () => {
  it('verteilt niemals mehr Zuschauer als die Zielgruppe hergibt', () => {
    const g = createGame({ seed: 5, diff: 'normal' });
    for (let b = 0; b < SLOTS; b++) {
      airBlock(g, g.day, b);
      const potential = GROUPS.reduce((a, grp) => a + POP * grp.share * grp.act[b]!, 0);
      const total = g.ch.reduce((a, c) => a + c.todayAud[b]!, 0);
      expect(total).toBeLessThanOrEqual(potential);
      expect(total).toBeGreaterThan(0);
    }
  });

  it('lässt einen Teil des Publikums abschalten', () => {
    const g = createGame({ seed: 6, diff: 'normal' });
    airBlock(g, g.day, 5);
    const potential = GROUPS.reduce((a, grp) => a + POP * grp.share * grp.act[5]!, 0);
    const total = g.ch.reduce((a, c) => a + c.todayAud[5]!, 0);
    expect(total / potential).toBeLessThan(0.85);
  });

  it('belohnt besseres Programm mit mehr Zuschauern', () => {
    const g = createGame({ seed: 7, diff: 'normal' });
    const sorted = [...g.player.licences].sort((a, b) => b.qual - a.qual);
    const best = sorted[0]!;
    const worst = sorted[sorted.length - 1]!;
    if (best.uid === worst.uid) return;
    const hi = estimateBlock(g, g.day, 5, best).total;
    const lo = estimateBlock(g, g.day, 5, worst).total;
    expect(hi).toBeGreaterThan(lo);
  });

  it('bestraft einen Film ab 18 zur frühen Sendezeit', () => {
    const g = createGame({ seed: 8, diff: 'normal' });
    const adult = g.catalog.find((l) => l.fsk >= 18)!;
    const early = estimateBlock(g, g.day, 0, adult).total;    // 18:00
    const late = estimateBlock(g, g.day, 10, adult).total;   // 23:00
    expect(slotHour(0)).toBe(18);
    expect(slotHour(10)).toBe(23);
    // Trotz geringerer Sehbeteiligung um 23 Uhr darf die Strafe nicht verpuffen
    expect(early).toBeLessThan(late * 2.2);
  });

  it('Nachrichten wirken nur mit Abo', () => {
    const g = createGame({ seed: 9, diff: 'normal' });
    g.player.newsShow = RESSORTS.map((r) => g.newsPool[r.id][0]!);
    RESSORTS.forEach((r) => { g.player.newsSub[r.id] = 0; });
    const ohne = newsAttraction(g, g.player).reduce((a, b) => a + b, 0);
    RESSORTS.forEach((r) => { g.player.newsSub[r.id] = 3; });
    const mit = newsAttraction(g, g.player).reduce((a, b) => a + b, 0);
    expect(ohne).toBe(0);
    expect(mit).toBeGreaterThan(0);
  });
});

describe('Behobene Fehler bleiben behoben', () => {
  it('Prognose für kommende Tage rechnet gegen ein echtes Konkurrenzprogramm', () => {
    const g = createGame({ seed: 11, diff: 'normal' });
    // Die KI muss für heute UND die Folgetage geplant haben
    for (let d = 0; d < 3; d++) {
      const rivalSlots = getDay(g.ch[1]!, g.day + d).filter((s) => s.prog).length;
      // Der Abend darf ein, zwei Restfelder frei lassen, wenn nichts mehr passt
      expect(rivalSlots).toBeGreaterThanOrEqual(SLOTS - 2);
    }
    const cand = g.player.licences[0]!;
    const heute = estimateBlock(g, g.day, 5, cand).total;
    const morgen = estimateBlock(g, g.day + 1, 5, cand).total;
    // Früher lag die Vorschau für morgen rund 55 % zu hoch
    expect(Math.abs(morgen / heute - 1)).toBeLessThan(0.15);
  });

  it('Nachrichtenabo lässt sich nach Sendeschluss nicht kostenlos abbestellen', () => {
    const g = createGame({ seed: 12, diff: 'normal' });
    RESSORTS.forEach((r) => {
      g.player.newsSub[r.id] = 3;
      g.player.newsSubMax[r.id] = Math.max(g.player.newsSubMax[r.id] ?? 0, 3);
    });
    const voll = dailyCosts(g.player);
    RESSORTS.forEach((r) => { g.player.newsSub[r.id] = 0; });
    const nachAbbestellen = dailyCosts(g.player);
    expect(voll).toBe(NEWS_COST[3] * RESSORTS.length);
    expect(nachAbbestellen).toBe(voll);
  });

  it('höherer Schwierigkeitsgrad macht die Konkurrenz reicher, nicht ärmer', () => {
    const leicht = createGame({ seed: 13, diff: 'leicht' });
    const schwer = createGame({ seed: 13, diff: 'schwer' });
    const rivalMoney = (g: ReturnType<typeof createGame>) =>
      g.ch.slice(1).reduce((a, c) => a + c.money, 0);
    expect(schwer.player.money).toBeLessThan(leicht.player.money);
    expect(rivalMoney(schwer)).toBeGreaterThan(rivalMoney(leicht));
  });
});

describe('Wirtschaft', () => {
  it('zahlt einen Werbespot nur bei erreichter Mindestquote', () => {
    const g = createGame({ seed: 21, diff: 'normal' });
    const slots = getDay(g.player, g.day);
    placeProgramme(slots, 4, g.player.licences[0]!);
    const est = estimateBlock(g, g.day, 5).total;

    const leicht = { ...g.adMarket[0]!, id: 90001, minAud: Math.round(est * 0.5), spots: 3, done: 0, group: null };
    const schwer = { ...g.adMarket[0]!, id: 90002, minAud: Math.round(est * 5), spots: 3, done: 0, group: null };
    g.player.contracts = [leicht, schwer];

    slots[5]!.ad = { id: leicht.id, brand: leicht.brand };
    const vorher = g.player.money;
    airBlock(g, g.day, 5);
    expect(leicht.done).toBe(1);
    expect(g.player.money).toBe(vorher + leicht.perSpot);

    const slots2 = getDay(g.player, g.day + 1);
    placeProgramme(slots2, 4, g.player.licences[0]!);
    slots2[5]!.ad = { id: schwer.id, brand: schwer.brand };
    const vorher2 = g.player.money;
    airBlock(g, g.day + 1, 5);
    expect(schwer.done).toBe(0);
    expect(g.player.money).toBe(vorher2);
  });

  it('zieht die Konventionalstrafe bei verfallenem Vertrag ab', () => {
    const g = createGame({ seed: 22, diff: 'normal' });
    const ct = { ...g.adMarket[0]!, deadline: g.day, done: 0, spots: 4 };
    g.player.contracts = [ct];
    const vorher = g.player.money;
    airRemainingBlocks(g, g.day);
    endOfDay(g);
    expect(g.player.contracts).toHaveLength(0);
    expect(g.player.money).toBeLessThan(vorher - ct.penalty + 1);
    expect(g.stats.contractsFailed).toBe(1);
  });

  it('Marktanteile der drei Sender ergeben immer 100 Prozent', () => {
    const g = createGame({ seed: 23, diff: 'normal' });
    for (let d = 0; d < 12; d++) {
      airRemainingBlocks(g, g.day);
      endOfDay(g);
      g.events.length = 0;
      if (g.over) break;
      const sum = g.ch.reduce((a, c) => a + c.image, 0);
      expect(sum).toBeCloseTo(100, 6);
    }
  });

  it('Reichweite wächst mit Sendemasten und Satellit, bleibt aber bei 100 Prozent', () => {
    const g = createGame({ seed: 24, diff: 'normal' });
    expect(reachOf(g.player)).toBeCloseTo(0.4, 6);
    g.player.transmitters = 4;
    g.player.satellite = true;
    expect(reachOf(g.player)).toBe(1);
  });
});

describe('Betty', () => {
  it('Zuneigung überflügelt niemals das eigene Image', () => {
    const g = createGame({ seed: 31, diff: 'normal' });
    g.player.love = 90;
    g.player.image = 20;
    for (let d = 0; d < 6; d++) {
      airRemainingBlocks(g, g.day);
      endOfDay(g);
      g.events.length = 0;
      if (g.over) break;
      expect(g.player.love).toBeLessThanOrEqual(g.player.image + 1e-9);
    }
  });
});

describe('Spielstand', () => {
  it('übersteht Speichern und Laden unverändert', () => {
    const g = createGame({ seed: 41, diff: 'normal' });
    for (let d = 0; d < 5; d++) {
      const slots = getDay(g.player, g.day);
      let at = 0;
      for (const l of g.player.licences) {
        if (at + l.lenSlots > SLOTS) break;
        placeProgramme(slots, at, l);
        at += l.lenSlots;
      }
      airRemainingBlocks(g, g.day);
      endOfDay(g);
      g.events.length = 0;
    }
    const before = serialize(g);
    const loaded = deserialize(before);
    expect(serialize(loaded)).toBe(before);
    expect(loaded.player.image).toBeCloseTo(g.player.image, 9);
    expect(loaded.day).toBe(g.day);
  });

  it('stellt die Verweise im Sendeplan wieder her', () => {
    const g = createGame({ seed: 42, diff: 'normal' });
    const slots = getDay(g.player, g.day);
    const lic = g.player.licences[0]!;
    placeProgramme(slots, 2, lic);
    slots[9]!.trailer = lic;
    const loaded = deserialize(serialize(g));
    const ls = getDay(loaded.player, loaded.day);
    expect(ls[2]!.prog).not.toBeNull();
    expect(ls[2]!.prog!.uid).toBe(lic.uid);
    expect(ls[2]!.start).toBe(true);
    expect(ls[2]!.len).toBe(lic.lenSlots);
    // Kein Duplikat: der Sendeplatz zeigt auf genau dasselbe Objekt im Archiv
    expect(ls[2]!.prog).toBe(loaded.player.licences.find((l) => l.uid === lic.uid));
    expect(ls[9]!.trailer!.uid).toBe(lic.uid);
  });

  it('setzt die Partie deterministisch fort', () => {
    const g = createGame({ seed: 43, diff: 'normal' });
    airRemainingBlocks(g, g.day);
    endOfDay(g);
    g.events.length = 0;

    const snapshot = serialize(g);
    const weiter = (game: ReturnType<typeof deserialize>) => {
      for (let d = 0; d < 5; d++) {
        airRemainingBlocks(game, game.day);
        endOfDay(game);
        game.events.length = 0;
        if (game.over) break;
      }
      return game.player.image.toFixed(9) + '|' + Math.round(game.player.money);
    };
    expect(weiter(deserialize(snapshot))).toBe(weiter(deserialize(snapshot)));
  });

  it('lehnt Spielstände aus einer neueren Fassung ab', () => {
    const g = createGame({ seed: 44, diff: 'normal' });
    const kaputt = JSON.parse(serialize(g));
    kaputt.v = 999;
    expect(() => deserialize(JSON.stringify(kaputt))).toThrow(/Version/);
  });
});

describe('Ereignisse verlassen den Kern als Daten', () => {
  it('sammelt Meldungen, statt eine Oberfläche aufzurufen', () => {
    const g = createGame({ seed: 51, diff: 'normal' });
    airRemainingBlocks(g, g.day);
    const kinds = new Set(g.events.map((e) => e.kind));
    expect(kinds.has('blockAired')).toBe(true);
    expect(g.events.filter((e) => e.kind === 'blockAired')).toHaveLength(SLOTS);
  });
});

describe('Schwierigkeitsgrade', () => {
  it('sind aufsteigend fordernder abgestuft', () => {
    expect(DIFFS.leicht.money).toBeGreaterThan(DIFFS.normal.money);
    expect(DIFFS.normal.money).toBeGreaterThan(DIFFS.schwer.money);
    expect(DIFFS.leicht.aiSkill).toBeLessThan(DIFFS.normal.aiSkill);
    expect(DIFFS.normal.aiSkill).toBeLessThan(DIFFS.schwer.aiSkill);
    expect(DIFFS.leicht.winImage).toBeLessThan(DIFFS.schwer.winImage);
  });
});
