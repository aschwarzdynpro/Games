/**
 * Was die Figuren sagen.
 *
 * Das Reden-System entscheidet über Bedingungen und Ränge, nicht über eine
 * Kette von if-else. Genau das macht es prüfbar: Man stellt einen Zustand her
 * und schaut nach, ob die richtige Figur das Richtige sagt.
 *
 * Die Prüfungen greifen bewusst auf die Kennung des Satzes zu, nicht auf den
 * Wortlaut — Formulierungen sollen sich ändern dürfen, ohne dass hier etwas
 * bricht.
 */
import { describe, expect, it } from 'vitest';
import {
  airBlock, createGame, getDay, peek, placeProgramme, speak, updateBetty,
} from '../src/core';
import type { Game } from '../src/core';

function spiel(seed = 4242): Game {
  return createGame({ seed, diff: 'normal' });
}

describe('Betty', () => {
  it('lobt einen Kulturabend', () => {
    const g = spiel();
    g.player.cultureToday = 2.2;
    expect(peek(g, 'betty').id).toBe('b-kultur-viel');
    expect(peek(g, 'betty').mood).toBe('gut');
  });

  it('nimmt Reißerisches zur besten Zeit übel', () => {
    const g = spiel();
    g.player.trashToday = 0.9;
    const t = peek(g, 'betty');
    expect(t.id).toBe('b-trash');
    expect(t.mood).toBe('schlecht');
  });

  it('sagt bei hoher Zuneigung etwas anderes als bei niedriger', () => {
    const g = spiel();
    g.player.love = 3;
    const kalt = peek(g, 'betty');
    g.player.love = 85;
    g.player.image = 90;
    const warm = peek(g, 'betty');
    expect(kalt.id).not.toBe(warm.id);
    expect(warm.mood).toBe('gut');
  });

  it('erklärt die Deckelung durch das Image, wenn sie greift', () => {
    const g = spiel();
    g.player.image = 40;
    g.player.love = 39.5;
    g.player.cultureToday = 0.5;
    expect(peek(g, 'betty').id).toBe('b-gedeckelt');
  });
});

describe('Herr Raffer', () => {
  it('wird zur letzten Warnung, wenn zwei Tage unter der Grenze liegen', () => {
    const g = spiel();
    g.player.lowImageDays = 2;
    const t = peek(g, 'raffer');
    expect(t.id).toBe('r-letzte');
    expect(t.mood).toBe('schlecht');
  });

  it('bemerkt einen Absturz und einen Sprung', () => {
    const g = spiel();
    g.player.lastImage = 40;
    g.player.image = 34;
    expect(peek(g, 'raffer').id).toBe('r-absturz');

    g.player.lastImage = 34;
    g.player.image = 41;
    const hoch = peek(g, 'raffer');
    expect(hoch.id).toBe('r-sprung');
    expect(hoch.mood).toBe('gut');
  });

  it('lobt nie, solange die Entlassung im Raum steht', () => {
    const g = spiel();
    g.player.image = 60;
    g.player.lastImage = 50;
    g.player.lowImageDays = 2;
    expect(peek(g, 'raffer').mood).toBe('schlecht');
  });
});

describe('Die Konkurrenz', () => {
  it('reibt einen frischen Einkauf unter die Nase', () => {
    const g = spiel();
    g.snipes.length = 0;
    const rival = g.ch[1]!;
    g.snipes.push({
      day: g.day, channel: rival.name, title: 'Der Zeitkurier',
      genre: 'scifi', price: 1_400_000, tier: 5,
    });
    const t = peek(g, 'rival', rival);
    expect(t.id).toBe('v-beute');
    expect(t.text).toContain('Der Zeitkurier');
  });

  it('vergisst alten Klatsch wieder', () => {
    const g = spiel();
    g.snipes.length = 0;
    const rival = g.ch[1]!;
    g.snipes.push({
      day: g.day - 5, channel: rival.name, title: 'Alter Hut',
      genre: 'doku', price: 90_000, tier: 4,
    });
    expect(peek(g, 'rival', rival).id).not.toBe('v-beute');
  });

  it('spricht über den eigenen Vorsprung, nicht über den des anderen', () => {
    const g = spiel();
    // Der Partieaufbau kauft bereits ein; frischer Klatsch hätte Vorrang
    g.snipes.length = 0;
    const a = g.ch[1]!;
    const b = g.ch[2]!;
    g.player.image = 20;
    g.player.love = 20;
    a.image = 50; a.love = 20;
    b.image = 10; b.love = 5;
    expect(peek(g, 'rival', a).id).toBe('v-fuehrt');
    expect(peek(g, 'rival', b).id).toBe('v-hinten');
  });
});

describe('Auswahl', () => {
  it('wiederholt sich nicht unmittelbar', () => {
    const g = spiel();
    g.player.love = 30;                 // mehrere Sätze möglich, keiner überragend
    const erste = speak(g, 'betty').id;
    const zweite = speak(g, 'betty').id;
    expect(zweite).not.toBe(erste);
  });

  it('liefert für jede Figur und jeden Zustand einen Satz', () => {
    const g = spiel();
    for (const image of [2, 15, 40, 70, 95]) {
      for (const love of [0, 20, 55, 90]) {
        g.player.image = image;
        g.player.love = Math.min(love, image);
        for (const who of ['betty', 'raffer'] as const) {
          const t = peek(g, who);
          expect(t.text.length, `${who} bei ${image}/${love}`).toBeGreaterThan(8);
          expect(['gut', 'neutral', 'schlecht']).toContain(t.mood);
        }
        for (const ch of g.ch.slice(1)) {
          expect(peek(g, 'rival', ch).text.length).toBeGreaterThan(8);
        }
      }
    }
  });
});

/**
 * Die Reden hängen an einer Wirkung, nicht nur an Zahlen im Kopf: Was zur
 * besten Zeit läuft, verändert Bettys Zuneigung. Der Balancing-Bot plant nie
 * Reißerisches in die Primetime — diese Regel wäre dort also nie gemessen
 * worden.
 */
describe('Wirkung auf Betty', () => {
  function abendMit(genre: 'erotik' | 'doku'): number {
    const g = createGame({ seed: 909, diff: 'normal' });
    const lic = g.catalog.find((l) => l.genre === genre && !l.isSerie)!;
    g.player.licences.push({ ...lic, uid: 91_000 });
    const eigen = g.player.licences[g.player.licences.length - 1]!;
    const slots = getDay(g.player, g.day);
    slots.forEach((s2) => { s2.prog = null; s2.start = false; s2.len = 0; });
    placeProgramme(slots, 4, eigen);            // 20:00 — beste Sendezeit
    for (let i = 4; i < 4 + eigen.lenSlots; i++) airBlock(g, g.day, i);
    const vorher = g.player.love;
    updateBetty(g);
    return g.player.love - vorher;
  }

  it('zieht ab, wenn zur besten Zeit Reißerisches läuft', () => {
    const g = createGame({ seed: 909, diff: 'normal' });
    const lic = g.catalog.find((l) => l.genre === 'erotik' && !l.isSerie)!;
    g.player.licences.push({ ...lic, uid: 91_001 });
    const eigen = g.player.licences[g.player.licences.length - 1]!;
    const slots = getDay(g.player, g.day);
    placeProgramme(slots, 4, eigen);
    expect(g.player.trashToday).toBe(0);
    for (let i = 4; i < 4 + eigen.lenSlots; i++) airBlock(g, g.day, i);
    expect(g.player.trashToday).toBeGreaterThan(0);
  });

  it('lässt eine Dokumentation besser dastehen als einen Reißer', () => {
    expect(abendMit('doku')).toBeGreaterThan(abendMit('erotik'));
  });

  it('räumt den Abzug am Tagesende wieder ab', () => {
    const g = createGame({ seed: 909, diff: 'normal' });
    g.player.trashToday = 0.7;
    updateBetty(g);
    expect(g.player.trashToday).toBe(0);
  });

  it('lässt einen einzelnen Abend die Zuneigung nicht einreißen', () => {
    const g = createGame({ seed: 909, diff: 'normal' });
    g.player.love = 40;
    g.player.image = 90;
    g.player.trashToday = 5;                    // absurd viel
    updateBetty(g);
    expect(g.player.love).toBeGreaterThan(38);  // Deckel bei −0,8 plus Tageszerfall
  });
});
