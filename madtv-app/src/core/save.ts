/**
 * Speicherstände.
 *
 * Sendepläne verweisen auf Lizenzobjekte. JSON kennt keine Verweise, also
 * werden beim Speichern Kennungen abgelegt und beim Laden wieder aufgelöst.
 * Jeder Stand trägt eine Version — künftige Formatwechsel bekommen hier eine
 * Migration, statt alte Stände unbrauchbar zu machen.
 */
import { Rng } from './rng';
import { DIFFS, GIFTS, PRODUCTIONS, STARS } from './data';
import { buildCatalog, makeChannel } from './state';
import type {
  Channel, Contract, DifficultyId, Game, Licence, NewsItem, RessortId, Slot,
} from './types';

export const SAVE_VERSION = 3;

interface SavedSlot {
  p: number | null;
  a: { id: number; brand: string } | null;
  t: number | null;
  aired: boolean;
  res: Slot['res'];
}

interface SavedChannel {
  name: string; isAI: boolean; money: number; credit: number;
  licences: Licence[]; contracts: Contract[];
  sched: Record<string, SavedSlot[]>;
  newsSub: Record<RessortId, number>;
  newsSubMax: Record<RessortId, number>;
  newsShow: NewsItem[];
  star: string | null;
  transmitters: number; satellite: boolean; studio: boolean;
  image: number; love: number; aiSkill: number;
  lastAud: number[]; todayAud: number[]; audHist: number[];
  awards: number; culturePoints: number; newsPoints: number; primePoints: number;
  lowImageDays: number; cultureToday: number;
}

export interface SavedGame {
  v: number;
  uid: number;
  seed: number;
  rngState: number;
  day: number; weekday: number; week: number; time: number;
  diff: DifficultyId;
  opt: Game['opt'];
  trend: Game['trend'];
  packageTaken: boolean;
  market: Licence[];
  adMarket: Contract[];
  newsPool: Record<RessortId, NewsItem[]>;
  auction: Game['auction'];
  auctionWarned: boolean;
  terrorSign: Game['terrorSign'];
  terrorDay: number;
  pendingTerror: boolean;
  bailiff: boolean;
  stats: Game['stats'];
  gifts: string[];
  production: { id: string; left: number; no: number } | null;
  productionNo: number;
  ch: SavedChannel[];
}

export function serialize(g: Game): string {
  const save: SavedGame = {
    v: SAVE_VERSION,
    uid: g.uid,
    seed: g.seed,
    rngState: g.rng.state,
    day: g.day, weekday: g.weekday, week: g.week, time: g.time,
    diff: g.diff,
    opt: g.opt,
    trend: g.trend,
    packageTaken: g.packageTaken,
    market: g.market,
    adMarket: g.adMarket,
    newsPool: g.newsPool,
    auction: g.auction,
    auctionWarned: g.auctionWarned,
    terrorSign: g.terrorSign,
    terrorDay: g.terrorDay,
    pendingTerror: g.pendingTerror,
    bailiff: g.bailiff,
    stats: g.stats,
    gifts: g.gifts.map((x) => x.id),
    production: g.production
      ? { id: g.production.def.id, left: g.production.left, no: g.production.no }
      : null,
    productionNo: g.productionNo,
    ch: g.ch.map((c) => ({
      name: c.name, isAI: c.isAI, money: c.money, credit: c.credit,
      licences: c.licences, contracts: c.contracts,
      sched: Object.fromEntries(
        Object.entries(c.sched).map(([d, slots]) => [
          d,
          slots.map((s) => ({
            p: s.prog?.uid ?? null,
            a: s.ad,
            t: s.trailer?.uid ?? null,
            aired: s.aired,
            res: s.res,
          })),
        ]),
      ),
      newsSub: c.newsSub, newsSubMax: c.newsSubMax, newsShow: c.newsShow,
      star: c.star?.id ?? null,
      transmitters: c.transmitters, satellite: c.satellite, studio: c.studio,
      image: c.image, love: c.love, aiSkill: c.aiSkill,
      lastAud: c.lastAud, todayAud: c.todayAud, audHist: c.audHist,
      awards: c.awards, culturePoints: c.culturePoints, newsPoints: c.newsPoints,
      primePoints: c.primePoints, lowImageDays: c.lowImageDays, cultureToday: c.cultureToday,
    })),
  };
  return JSON.stringify(save);
}

export function deserialize(json: string): Game {
  const s = JSON.parse(json) as SavedGame;
  if (typeof s.v !== 'number' || s.v > SAVE_VERSION) {
    throw new Error(`Spielstand-Version ${s.v} ist neuer als diese Fassung (${SAVE_VERSION}).`);
  }

  const D = DIFFS[s.diff] ?? DIFFS.normal;
  const rng = new Rng(s.seed ?? 1);
  rng.state = s.rngState ?? s.seed ?? 1;

  const ch: Channel[] = s.ch.map((c) => {
    const k = makeChannel(c.name, c.isAI, c.money, c.aiSkill);
    Object.assign(k, {
      credit: c.credit,
      licences: c.licences,
      contracts: c.contracts,
      newsSub: c.newsSub,
      newsSubMax: c.newsSubMax ?? { ...c.newsSub },
      newsShow: c.newsShow,
      star: c.star ? STARS.find((x) => x.id === c.star) ?? null : null,
      transmitters: c.transmitters, satellite: c.satellite, studio: c.studio,
      image: c.image, love: c.love,
      lastAud: c.lastAud, todayAud: c.todayAud, audHist: c.audHist,
      awards: c.awards, culturePoints: c.culturePoints, newsPoints: c.newsPoints,
      primePoints: c.primePoints, lowImageDays: c.lowImageDays,
      cultureToday: c.cultureToday ?? 0,
    });
    // Verweise im Sendeplan wieder auflösen
    const byUid = new Map(k.licences.map((l) => [l.uid, l]));
    k.sched = {};
    Object.entries(c.sched).forEach(([d, slots]) => {
      k.sched[Number(d)] = slots.map((sl) => ({
        prog: sl.p !== null ? byUid.get(sl.p) ?? null : null,
        ad: sl.a,
        trailer: sl.t !== null ? byUid.get(sl.t) ?? null : null,
        aired: sl.aired,
        res: sl.res,
      }));
    });
    return k;
  });

  const g: Game = {
    diff: s.diff, D,
    opt: { timePressure: s.opt?.timePressure ?? true, sound: s.opt?.sound ?? true },
    day: s.day, weekday: s.weekday, week: s.week, time: s.time,
    rng, seed: s.seed,
    catalog: buildCatalog(1).catalog,
    market: s.market, adMarket: s.adMarket, newsPool: s.newsPool,
    auction: s.auction, auctionWarned: s.auctionWarned ?? false,
    trend: s.trend,
    player: ch[0]!, ch,
    production: null,
    productionNo: s.productionNo ?? 0,
    packageTaken: s.packageTaken ?? false,
    gifts: (s.gifts ?? []).map((id) => GIFTS.find((x) => x.id === id)).filter(Boolean) as Game['gifts'],
    terrorSign: s.terrorSign ?? 'self',
    terrorDay: s.terrorDay ?? 0,
    pendingTerror: s.pendingTerror ?? false,
    bailiff: s.bailiff ?? false,
    log: [],
    stats: s.stats,
    over: false, end: null,
    events: [],
    uid: s.uid,
  };

  if (s.production) {
    const def = PRODUCTIONS.find((p) => p.id === s.production!.id);
    if (def) g.production = { def, left: s.production.left, no: s.production.no };
  }
  return g;
}
