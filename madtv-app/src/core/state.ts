/**
 * Welterzeugung und Zustandsverwaltung.
 *
 * Kein Modul hier fasst das DOM an. Meldungen an den Spieler werden über
 * emit() in game.events gelegt und von der Oberfläche abgeholt.
 */
import { Rng, hash, clamp } from './rng';
import {
  GENRES, GIDX, GROUPS, FILM_DATA, SERIE_DATA, BRANDS, RESSORTS, HEADLINES, DIFFS,
} from './data';
import { BLOCKS, DAY_START, RIVAL_NAMES } from './constants';
import type {
  Channel, Contract, DifficultyId, Game, GameEvent, GenreId, GroupId, Licence,
  NewsItem, Options, RessortId, SfxName, Slot, ToastLevel,
} from './types';

/* ─────────── Meldungen an die Oberfläche ─────────── */

export function emit(g: Game, ev: GameEvent): void {
  g.events.push(ev);
}
export function toast(g: Game, level: ToastLevel, title: string, text: string): void {
  emit(g, { kind: 'toast', level, title, text });
}
export function dialog(
  g: Game, ico: string, title: string, who: string, html: string,
  buttons?: { t: string; cls?: string }[],
): void {
  emit(g, { kind: 'dialog', ico, title, who, html, buttons });
}
export function sfx(g: Game, name: SfxName): void {
  emit(g, { kind: 'sfx', name });
}

/* ─────────── Kennungen ─────────── */

export function nextUid(g: Game): number {
  return g.uid++;
}

/* ─────────── Lizenzen ─────────── */

/**
 * Kennzahlen einer Lizenz stammen aus dem Titel-Hash, nicht aus dem Rng:
 * derselbe Film hat in jeder Partie denselben Zuschauerwert.
 */
export function makeLicence(line: string, isSerie: boolean, uid: number): Licence {
  const p = line.split('|');
  const title = p[0]!;
  const genre = p[1] as GenreId;
  const year = Number(p[2]);
  const tier = Number(p[3]);
  const eps = isSerie ? Number(p[4]) : 0;
  const gd = GENRES[genre];
  const h1 = hash(title);
  const h2 = hash(title + 'k');
  const h3 = hash(title + 'b');

  const qual = clamp(Math.round(tier * 15 - 6 + h1 * 24), 8, 97);
  const critic = clamp(Math.round(qual + gd.krit * 38 + h2 * 24 - 12), 3, 99);
  const box = clamp(Math.round(qual * 0.62 + tier * 7 + h3 * 20), 4, 99);

  let fsk = gd.fsk;
  if (h2 > 0.75 && fsk < 18) fsk = fsk === 0 ? 6 : fsk === 6 ? 12 : fsk === 12 ? 16 : 18;
  if (h3 > 0.9 && (genre === 'horror' || genre === 'action')) fsk = 18;

  let price = Math.round(
    (qual * 300 + box * 160 + Math.max(0, year - 1968) * 1050) * (1 + tier * 0.14) * 2.1,
  );
  price = Math.round(price / 1000) * 1000;
  if (isSerie) price = Math.round((price * (0.45 + eps * 0.055)) / 1000) * 1000;

  return {
    uid, title, genre, year, tier, fsk, price, qual, critic, box,
    fresh: 1, aired: 0, lastDay: -99, lastBlock: null,
    isSerie, eps, ep: 1, produced: false,
  };
}

export function buildCatalog(startUid: number): { catalog: Licence[]; uid: number } {
  const catalog: Licence[] = [];
  let uid = startUid;
  FILM_DATA.forEach((l) => catalog.push(makeLicence(l, false, uid++)));
  SERIE_DATA.forEach((l) => catalog.push(makeLicence(l, true, uid++)));
  return { catalog, uid };
}

/** Kopie einer Katalogvorlage als handelbares Angebot bzw. Besitz. */
export function copyLicence(src: Licence, uid: number): Licence {
  return { ...src, uid, fresh: 1, aired: 0, lastDay: -99, lastBlock: null, ep: 1 };
}

/* ─────────── Werbeverträge ─────────── */

export function makeContract(g: Game, tierHint?: number): Contract {
  const b = g.rng.pick(BRANDS).split('|');
  const brand = b[0]!;
  const product = b[1]!;
  const gid = b[2] as GroupId;
  const useGroup = g.rng.chance(0.34);
  const tier = tierHint ?? g.rng.int(1, 6);
  const baseAud = [700_000, 1_400_000, 2_400_000, 3_600_000, 5_200_000, 7_400_000][tier - 1]!;
  const gi = GIDX[gid]!;

  let minAud: number;
  let group: GroupId | null = null;
  if (useGroup) {
    group = gid;
    minAud = Math.round((baseAud * GROUPS[gi]!.share * 1.55) / 10_000) * 10_000;
  } else {
    minAud = Math.round((baseAud * (0.85 + g.rng.next() * 0.3)) / 10_000) * 10_000;
  }

  const spots = g.rng.int(2, 6);
  const days = spots + g.rng.int(1, 4);
  let perSpot = minAud * (useGroup ? 0.115 : 0.03) * (0.85 + g.rng.next() * 0.55);
  perSpot = Math.round(perSpot / 500) * 500;
  const penalty = Math.round((perSpot * spots * (0.55 + g.rng.next() * 0.75)) / 1000) * 1000;

  return {
    id: nextUid(g), brand, product, group, gi,
    minAud, spots, done: 0, days, deadline: g.day + days,
    perSpot, penalty, tier, added: g.day,
  };
}

/* ─────────── Nachrichten ─────────── */

export function makeNews(g: Game, res: RessortId): NewsItem {
  return {
    id: nextUid(g),
    res,
    text: g.rng.pick(HEADLINES[res]),
    day: g.day,
    weight: 0.55 + g.rng.next() * 0.65,
  };
}

export function rollNews(g: Game): void {
  RESSORTS.forEach((r) => {
    const kept = g.newsPool[r.id].filter((n) => g.day - n.day < 3);
    for (let i = 0; i < 3; i++) kept.push(makeNews(g, r.id));
    g.newsPool[r.id] = kept;
  });
  g.ch.forEach((ch) => {
    ch.newsShow = ch.newsShow.filter((n) => g.day - n.day < 3);
  });
}

/* ─────────── Genre-Konjunktur ─────────── */

export function initTrends(rng: Rng): Record<GenreId, number> {
  const t = {} as Record<GenreId, number>;
  (Object.keys(GENRES) as GenreId[]).forEach((k) => { t[k] = 0.9 + rng.next() * 0.25; });
  return t;
}

export function driftTrends(g: Game): void {
  (Object.keys(g.trend) as GenreId[]).forEach((k) => {
    let v = g.trend[k] + (g.rng.next() - 0.5) * 0.13;
    v += (1 - v) * 0.09;          // sanfte Rückkehr zur Mitte
    g.trend[k] = clamp(v, 0.68, 1.34);
  });
}

export function trendOf(g: Game, genre: GenreId): number {
  return g.trend[genre] ?? 1;
}

/* ─────────── Sender ─────────── */

function emptyNewsRecord(): Record<RessortId, number> {
  return { pol: 0, spo: 0, sho: 0, sen: 0, tec: 0 };
}

export function makeChannel(name: string, isAI: boolean, money: number, aiSkill: number): Channel {
  return {
    name, isAI, money, credit: 0,
    licences: [], contracts: [], sched: {},
    newsSub: emptyNewsRecord(), newsSubMax: emptyNewsRecord(), newsShow: [],
    star: null, transmitters: 0, satellite: false, studio: false,
    image: 33.34, love: 0, aiSkill,
    lastAud: new Array(BLOCKS).fill(0),
    todayAud: new Array(BLOCKS).fill(0),
    audHist: [],
    awards: 0, culturePoints: 0, newsPoints: 0, primePoints: 0,
    lowImageDays: 0, cultureToday: 0,
  };
}

export function emptyDay(): Slot[] {
  return Array.from({ length: BLOCKS }, () => ({
    prog: null, ad: null, trailer: null, aired: false, res: null,
  }));
}

export function getDay(ch: Channel, day: number): Slot[] {
  let d = ch.sched[day];
  if (!d) { d = emptyDay(); ch.sched[day] = d; }
  return d;
}

/** Reichweite des Senders, 0–1 der Bevölkerung. */
export function reachOf(ch: Channel): number {
  return clamp(0.4 + ch.transmitters * 0.11 + (ch.satellite ? 0.22 : 0), 0, 1);
}

/* ─────────── Märkte ─────────── */

export function refreshMarket(g: Game, initial: boolean): void {
  const owned = new Set<string>();
  g.ch.forEach((c) => c.licences.forEach((l) => owned.add(l.title)));

  if (initial) g.market = [];
  else g.market = g.market.filter(() => g.rng.next() > 0.22);

  const want = 30;
  let guard = 0;
  while (g.market.length < want && guard++ < 500) {
    const c = g.rng.pick(g.catalog);
    if (owned.has(c.title)) continue;
    if (g.market.some((m) => m.title === c.title)) continue;
    g.market.push(copyLicence(c, nextUid(g)));
  }
  g.market.sort((a, b) => a.price - b.price);
}

export function refreshAdMarket(g: Game, initial: boolean): void {
  if (initial) g.adMarket = [];
  g.adMarket = g.adMarket.filter((c) => c.deadline > g.day && g.rng.next() > 0.18);
  while (g.adMarket.length < 14) g.adMarket.push(makeContract(g));
  g.adMarket.sort((a, b) => a.minAud - b.minAud);
}

/** Lizenz vom Markt in den Besitz übernehmen. */
export function buyLicence(g: Game, ch: Channel, mkt: Licence, free = false): Licence | null {
  if (!free && ch.money < mkt.price) return null;
  const idx = g.market.indexOf(mkt);
  if (idx >= 0) g.market.splice(idx, 1);
  if (!free) {
    ch.money -= mkt.price;
    if (!ch.isAI) g.stats.costs += mkt.price;
  }
  const lic = copyLicence(mkt, nextUid(g));
  ch.licences.push(lic);
  if (!ch.isAI) g.stats.filmsBought++;
  return lic;
}

/** Lizenz aus allen künftigen Sendeplänen entfernen. */
export function removeFromSchedules(ch: Channel, lic: Licence): void {
  Object.values(ch.sched).forEach((slots) => {
    slots.forEach((s) => {
      if (s.prog && s.prog.uid === lic.uid && !s.aired) s.prog = null;
      if (s.trailer && s.trailer.uid === lic.uid && !s.aired) s.trailer = null;
    });
  });
}

/* ─────────── Neues Spiel ─────────── */

export interface NewGameOpts {
  name?: string;
  diff?: DifficultyId;
  opt?: Partial<Options>;
  seed?: number;
}

export function newGame(o: NewGameOpts = {}): Game {
  const diff = o.diff ?? 'normal';
  const D = DIFFS[diff];
  const seed = o.seed ?? ((Math.random() * 0xffffffff) >>> 0);
  const rng = new Rng(seed);
  const { catalog, uid } = buildCatalog(1);

  const g: Game = {
    diff, D,
    opt: { timePressure: true, sound: true, world: true, ...(o.opt ?? {}) },
    day: 1, weekday: 0, week: 1, time: DAY_START,
    rng, seed,
    catalog, market: [], adMarket: [],
    newsPool: { pol: [], spo: [], sho: [], sen: [], tec: [] },
    auction: null, auctionWarned: false,
    trend: initTrends(rng),
    player: makeChannel(o.name?.trim().slice(0, 18) || 'Mad TV', false, D.money, 0),
    ch: [],
    production: null, productionNo: 0, packageTaken: false, gifts: [],
    terrorSign: 'self', terrorDay: 0, pendingTerror: false, bailiff: false,
    log: [],
    stats: { revenue: 0, costs: 0, filmsBought: 0, contractsDone: 0, contractsFailed: 0 },
    over: false, end: null,
    events: [],
    uid,
  };

  // Die Konkurrenz startet mit eigenem Kapital, das mit ihrer Spielstärke wächst.
  // Würde sie das Startgeld des Spielers teilen, machte ein knapper
  // Schwierigkeitsgrad auch die KI arm und damit harmlos.
  const aiMoney = (s: number) => Math.round(500_000 + s * 700_000);
  g.ch = [
    g.player,
    makeChannel(RIVAL_NAMES[0], true, aiMoney(D.aiSkill), D.aiSkill),
    makeChannel(RIVAL_NAMES[1], true, aiMoney(D.aiSkill * 0.92), D.aiSkill * 0.92),
  ];
  g.player.image = 33.34;
  g.ch[1]!.image = 33.33;
  g.ch[2]!.image = 33.33;

  refreshMarket(g, true);
  refreshAdMarket(g, true);
  rollNews(g);

  // Startausstattung, damit der erste Abend nicht leer bleibt
  g.market.slice(0, 3).forEach((m) => buyLicence(g, g.player, m, true));
  for (let i = 1; i < 3; i++) {
    for (let k = 0; k < 4; k++) {
      const cheap = g.market.filter((m) => m.price < 140_000);
      if (cheap.length) buyLicence(g, g.ch[i]!, g.rng.pick(cheap), true);
    }
  }

  return g;
}
