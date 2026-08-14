/**
 * Was die Figuren sagen.
 *
 * Betty, Herr Raffer und die beiden Konkurrenten hatten bisher je eine
 * Handvoll fester Sätze, ausgewählt nach einer einzigen Zahl. Das las sich
 * beim zweiten Besuch wie eine Beschriftung, nicht wie eine Person.
 *
 * Jetzt liegt jeder Satz mit einer **Bedingung** und einem **Rang** in einer
 * Tabelle. Gesagt wird der ranghöchste Satz, dessen Bedingung zutrifft — bei
 * Gleichstand entscheidet der Zufallsgenerator der Partie, und der zuletzt
 * gesagte Satz wird übersprungen, damit sich niemand wiederholt.
 *
 * Der Kern kennt dabei keine Darstellung: Er liefert Text und Stimmung, die
 * Oberfläche macht daraus Sprechblase, Haltung und Farbe.
 */
import { GENRES } from './data';
import type { Channel, Game, GenreId, Snipe } from './types';

export type Speaker = 'betty' | 'raffer' | 'rival';
export type Mood = 'gut' | 'neutral' | 'schlecht';

export interface Talk {
  text: string;
  mood: Mood;
  /** Zum Wiedererkennen in Prüfungen und für die Wiederholungssperre. */
  id: string;
}

/** Alles, worauf eine Bedingung schauen darf. */
export interface TalkCtx {
  g: Game;
  /** Der Sender des Spielers. */
  p: Channel;
  /** Wer spricht — bei Rivalen deren Sender, sonst der des Spielers. */
  ch: Channel;
  image: number;
  love: number;
  /** Veränderung des Marktanteils gegenüber gestern, in Prozentpunkten. */
  trend: number;
  kultur: number;
  trash: number;
  /** Tage unter der Feuergrenze. */
  brenzlig: number;
  awards: number;
  /** Führt der Spieler das Feld an? */
  vorn: boolean;
  /** Jüngster sichtbarer Einkauf des sprechenden Senders. */
  beute: Snipe | null;
}

interface Remark {
  id: string;
  rang: number;
  mood: Mood;
  text: (k: TalkCtx) => string;
  when: (k: TalkCtx) => boolean;
}

const genreName = (g: GenreId): string => GENRES[g].name;

/* ─────────── Betty Botterbloom ─────────── */

const BETTY: Remark[] = [
  { id: 'b-ring', rang: 90, mood: 'gut',
    when: (k) => k.love >= 78,
    text: () => 'Sie sagt nichts. Sie sieht Sie nur an, als hätte sie den Ring längst anprobiert.' },
  { id: 'b-kultur-viel', rang: 70, mood: 'gut',
    when: (k) => k.kultur >= 1.6,
    text: () => '«Ihr Kulturprogramm gestern — ich habe bis zum Schluss geschaut. Das machen hier sonst nur die Techniker.»' },
  { id: 'b-trash', rang: 68, mood: 'schlecht',
    when: (k) => k.trash >= 0.6,
    text: () => '«Ich habe gestern zur besten Zeit eingeschaltet. Ich schalte so schnell nicht wieder ein.»' },
  { id: 'b-award', rang: 66, mood: 'gut',
    when: (k) => k.awards > 0 && k.g.day % 7 === 1,
    text: () => '«Ein Sammy. Na sowas. Und ich dachte, Sie machen nur Filme mit Explosionen.»' },
  { id: 'b-kultur-wenig', rang: 52, mood: 'schlecht',
    when: (k) => k.kultur < 0.2 && k.love >= 20,
    text: () => '«Gestern nichts für mich dabei. Kein einziges Stück, über das man reden könnte.»' },
  { id: 'b-gedeckelt', rang: 50, mood: 'neutral',
    when: (k) => k.love >= k.image - 1.5 && k.image < 60,
    text: (k) => `«Ich mag Sie durchaus. Aber ein Sender mit ${Math.round(k.image)} Prozent — ` +
      'da schaut die Redaktion schon, mit wem ich mittags esse.»' },
  { id: 'b-warm', rang: 40, mood: 'gut',
    when: (k) => k.love >= 50,
    text: () => '«Da sind Sie ja. Ich habe extra einen zweiten Becher hingestellt.»' },
  { id: 'b-lauwarm', rang: 30, mood: 'neutral',
    when: (k) => k.love >= 25,
    text: () => '«Ach, Sie sind das. Der mit den Filmen.»' },
  { id: 'b-kuehl', rang: 20, mood: 'neutral',
    when: (k) => k.love >= 8,
    text: () => '«Ja bitte? Ich habe gleich Redaktionsschluss.»' },
  { id: 'b-kalt', rang: 0, mood: 'schlecht',
    when: () => true,
    text: () => 'Sie blickt kaum auf. Auf ihrem Schreibtisch stapelt sich Wichtigeres.' },
];

/* ─────────── Herr Raffer ─────────── */

const RAFFER: Remark[] = [
  { id: 'r-letzte', rang: 95, mood: 'schlecht',
    when: (k) => k.brenzlig >= 2,
    text: () => '«Morgen früh ist Ihr Schreibtisch leer oder Ihre Quote oben. Suchen Sie es sich aus.»' },
  { id: 'r-warnung', rang: 90, mood: 'schlecht',
    when: (k) => k.brenzlig === 1,
    text: (k) => `«${k.image.toFixed(1).replace('.', ',')} Prozent. Meine Großmutter macht besseres ` +
      'Fernsehen, und die ist seit elf Jahren tot. Sie haben zwei Tage.»' },
  { id: 'r-absturz', rang: 80, mood: 'schlecht',
    when: (k) => k.trend <= -4,
    text: (k) => `«Vier Punkte weg. An einem Tag. Was haben Sie gesendet, ${genreName(schlimmstesGenre(k))}?»` },
  { id: 'r-sprung', rang: 78, mood: 'gut',
    when: (k) => k.trend >= 4,
    text: () => '«Da geht ja was. Ich habe dem Aufsichtsrat schon gesagt, dass ich Sie geholt habe.»' },
  { id: 'r-vorn', rang: 74, mood: 'gut',
    when: (k) => k.vorn && k.image >= 45,
    text: () => '«Erster im Haus. Genießen Sie es, so was hält selten.»' },
  { id: 'r-schulden', rang: 70, mood: 'schlecht',
    when: (k) => k.p.money < -300_000,
    text: () => '«Die Bank hat angerufen. Mich. Wissen Sie, wie das ist, wenn die Bank mich anruft?»' },
  { id: 'r-awards', rang: 60, mood: 'gut',
    when: (k) => k.awards >= 2,
    text: (k) => `«${k.awards} Sammys im Regal. Das Regal habe übrigens ich bezahlt.»` },
  { id: 'r-gut', rang: 40, mood: 'gut',
    when: (k) => k.image >= 50,
    text: () => '«Nicht schlecht. Für Ihre Verhältnisse. Weiter so, dann rede ich beim Aufsichtsrat ein gutes Wort.»' },
  { id: 'r-mittel', rang: 25, mood: 'neutral',
    when: (k) => k.image >= 34,
    text: () => '«Mittelmaß. Damit gewinnt man keinen Sammy und schon gar nicht Frau Botterbloom.»' },
  { id: 'r-schlecht', rang: 0, mood: 'neutral',
    when: () => true,
    text: () => '«Das ist kein Fernsehen, das ist eine Bildstörung mit Ton. Ich beobachte Sie.»' },
];

/* ─────────── Die Konkurrenz ─────────── */

const RIVAL: Remark[] = [
  { id: 'v-beute', rang: 85, mood: 'schlecht',
    when: (k) => !!k.beute && k.g.day - k.beute.day <= 1,
    text: (k) => `«${k.beute!.title}» — der lag im Verleih so schön herum. ` +
      `${k.beute!.price >= 1_000_000 ? 'Teuer? Für uns nicht.' : 'Danke fürs Zögern.'}` },
  { id: 'v-fuehrt', rang: 70, mood: 'schlecht',
    when: (k) => k.ch.image > k.image + 6,
    text: (k) => `«${k.ch.image.toFixed(1).replace('.', ',')} zu ${k.image.toFixed(1).replace('.', ',')}. ` +
      'Wir haben Ihren Sendeplan übrigens ausgedruckt und im Flur aufgehängt.»' },
  { id: 'v-betty', rang: 65, mood: 'schlecht',
    when: (k) => k.ch.love > k.love + 8,
    text: () => '«Frau Botterbloom war gestern bei uns im Studio. Nur beruflich, natürlich.»' },
  { id: 'v-knapp', rang: 50, mood: 'neutral',
    when: (k) => Math.abs(k.ch.image - k.image) <= 2,
    text: () => '«Kopf an Kopf. Aber wir haben den längeren Atem — und den größeren Etat.»' },
  { id: 'v-hinten', rang: 45, mood: 'gut',
    when: (k) => k.image > k.ch.image + 6,
    text: () => 'Am Schreibtisch wird telefoniert und dabei betont in eine andere Richtung geschaut.' },
  { id: 'v-neutral', rang: 0, mood: 'neutral',
    when: () => true,
    text: () => '«Sie dürfen sich gern umsehen. Mitschreiben wäre allerdings unhöflich.»' },
];

const TABLES: Record<Speaker, Remark[]> = { betty: BETTY, raffer: RAFFER, rival: RIVAL };

/** Das Genre, das gestern am spätesten in der besten Zeit lief — für Raffers Spott. */
function schlimmstesGenre(k: TalkCtx): GenreId {
  const slots = k.p.sched[k.g.day - 1] ?? [];
  for (let i = 7; i >= 4; i--) {
    const s = slots[i];
    if (s?.prog) return s.prog.genre;
  }
  return 'doku';
}

/** Den Zustand zusammentragen, auf den die Bedingungen schauen. */
export function talkCtx(g: Game, ch: Channel = g.player): TalkCtx {
  const p = g.player;
  const beute = [...(g.snipes ?? [])].reverse().find((s) => s.channel === ch.name) ?? null;
  return {
    g, p, ch,
    image: p.image,
    love: p.love,
    trend: p.image - (p.lastImage ?? p.image),
    kultur: p.cultureToday,
    trash: p.trashToday ?? 0,
    brenzlig: p.lowImageDays,
    awards: p.awards,
    vorn: g.ch.every((c) => c === p || c.image <= p.image),
    beute,
  };
}

/**
 * Was diese Figur gerade sagt.
 *
 * Der ranghöchste passende Satz gewinnt. Steht der zuletzt gesagte Satz allein
 * an der Spitze, weicht die Auswahl eine Stufe tiefer aus — lieber ein etwas
 * schwächerer Satz als zweimal derselbe.
 */
export function speak(g: Game, who: Speaker, ch: Channel = g.player): Talk {
  const k = talkCtx(g, ch);
  const passend = TABLES[who].filter((r) => r.when(k));
  if (!passend.length) return { id: 'leer', mood: 'neutral', text: '…' };

  const zuletzt = (g.saidLast ?? {})[`${who}:${ch.name}`];
  const ohneWdh = passend.filter((r) => r.id !== zuletzt);
  const feld = ohneWdh.length ? ohneWdh : passend;

  const best = Math.max(...feld.map((r) => r.rang));
  const spitze = feld.filter((r) => r.rang === best);
  const r = spitze.length === 1 ? spitze[0]! : g.rng.pick(spitze);

  if (!g.saidLast) g.saidLast = {};
  g.saidLast[`${who}:${ch.name}`] = r.id;
  return { id: r.id, mood: r.mood, text: r.text(k) };
}

/** Nur lesen, ohne die Wiederholungssperre zu setzen — für Prüfungen. */
export function peek(g: Game, who: Speaker, ch: Channel = g.player): Talk {
  const merker = g.saidLast;
  g.saidLast = {};
  const t = speak(g, who, ch);
  g.saidLast = merker;
  return t;
}
