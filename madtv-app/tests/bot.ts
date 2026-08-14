/**
 * Ein Spieler-Bot als Prüfstein für die Simulation.
 *
 * Der Bot spielt bewusst nur solide, nicht optimal: kauft nach Preis-Leistung,
 * plant den besten verfügbaren Titel je Block, nimmt erreichbare Werbeverträge
 * und baut Reichweite aus. Damit lässt sich die Schwierigkeitskurve messen,
 * ohne dass jemand von Hand vierzig Spieltage klickt.
 */
import {
  SLOTS, BLOCKS, GIFTS, GROUPS, MAX_CONTRACTS, MAX_TRANSMITTERS, PRODUCTIONS, RESSORTS, STARS,
  PRICE_SATELLITE, PRICE_TRANSMITTER, STUDIO_RENT, adSlotOf,
  airRemainingBlocks, buyLicence, createGame, endOfDay, estimateBlock, getDay, placeProgramme,
  progScore, reachOf,
} from '../src/core';
import type { DifficultyId, Game } from '../src/core';

export interface BotOptions {
  /** Nutzt Satellit, Starmoderator und Exklusivpaket — das komplette Spätspiel. */
  lateGame?: boolean;
  maxDays?: number;
  seed?: number;
}

export interface BotResult {
  days: number;
  won: boolean;
  ending: string;
  image: number;
  love: number;
  money: number;
  licences: number;
  reach: number;
  rivalImages: number[];
  /** Kassenstand der beiden Konkurrenzsender am Ende — sie sollen mitspielen können. */
  rivalMoney: number[];
  /** Wie oft die Konkurrenz dem Spieler einen guten Titel vor der Nase weggekauft hat. */
  snipes: number;
  history: { day: number; image: number; money: number; love: number }[];
}

export function playDay(g: Game, o: BotOptions): void {
  const P = g.player;

  // Nachrichten: Abostufe nach Kassenlage
  const level = P.money > 900_000 ? 3 : P.money > 450_000 ? 2 : 1;
  RESSORTS.forEach((r) => {
    P.newsSub[r.id] = level;
    P.newsSubMax[r.id] = Math.max(P.newsSubMax[r.id] ?? 0, level);
  });
  const fresh = RESSORTS.flatMap((r) => g.newsPool[r.id].filter((n) => n.day === g.day));
  fresh.sort((a, b) => b.weight - a.weight);
  P.newsShow = fresh.slice(0, 3);

  // Lizenzen nach Preis-Leistung. Gezählt wird Sendezeit, nicht Titel: Der
  // Abend hat 14 Halbstunden, und ein Magazin füllt eine davon.
  const covered = () => P.licences.reduce((a, l) => a + l.lenSlots, 0);
  let guard = 0;
  while (covered() < SLOTS + 6 && guard++ < 25) {
    // Solange der Abend nicht einmal gefüllt ist, wird auch die Reserve
    // angegriffen — Testbild kostet mehr Marktanteil als jeder Film Geld.
    const floor = covered() < SLOTS ? 120_000 : 260_000;
    if (P.money <= floor) break;
    const afford = g.market.filter((m) => m.price <= P.money * 0.3);
    if (!afford.length) break;
    // Preis je Sendeminute statt Preis je Titel
    afford.sort((a, b) => (b.qual * b.lenSlots) / b.price - (a.qual * a.lenSlots) / a.price);
    buyLicence(g, P, afford[0]!);
  }

  // Studio und Kultursendung für Betty
  if (!P.studio && P.money > 800_000) {
    P.money -= STUDIO_RENT;
    P.studio = true;
  }
  if (P.studio && !g.production && P.money > 200_000) {
    const def = PRODUCTIONS.find((x) => x.id === 'kultur_heute')!;
    P.money -= def.cost;
    g.productionNo++;
    g.production = { def, left: def.days, no: g.productionNo };
  }

  // Sendeplan: von vorn nach hinten belegen, Sendungen sind verschieden lang
  const slots = getDay(P, g.day);
  const used = new Set<number>();
  let at = 0;
  while (at < SLOTS) {
    const s = slots[at]!;
    if (s.aired || (s.prog && !s.start)) { at++; continue; }
    const avail = P.licences.filter((l) => !used.has(l.uid) && at + l.lenSlots <= SLOTS);
    if (!avail.length) { at++; continue; }
    avail.sort((x, y) => progScore(g, P, y, at) - progScore(g, P, x, at));
    const pick = avail[0]!;
    placeProgramme(slots, at, pick);
    used.add(pick.uid);
    at += pick.lenSlots;
  }

  // Werbeverträge, die die eigene Primetime auch trägt
  const est = estimateBlock(g, g.day, 5).total;
  while (P.contracts.length < MAX_CONTRACTS) {
    const fit = g.adMarket.filter((c) => {
      const reachable = c.group ? est * GROUPS[c.gi]!.share * 1.1 : est;
      return reachable >= c.minAud * 1.05;
    });
    if (!fit.length) break;
    fit.sort((a, b) => b.perSpot * b.spots - a.perSpot * a.spots);
    const t = fit[0]!;
    g.adMarket.splice(g.adMarket.indexOf(t), 1);
    P.contracts.push({ ...t, deadline: g.day + t.days, done: 0 });
  }
  P.contracts.forEach((ct) => {
    let need = ct.spots - ct.done;
    for (let b = BLOCKS - 1; b >= 0 && need > 0; b--) {
      const slot = adSlotOf(b);
      if (slots[slot]!.aired || slots[slot]!.ad) continue;
      const e = estimateBlock(g, g.day, slot);
      const reached = ct.group ? e.groups[ct.gi]! : e.total;
      if (reached >= ct.minAud) {
        slots[slot]!.ad = { id: ct.id, brand: ct.brand };
        need--;
      }
    }
  });

  // Ausbau
  if (P.money > 1_500_000 && P.transmitters < MAX_TRANSMITTERS) {
    P.money -= PRICE_TRANSMITTER;
    P.transmitters++;
  } else if (o.lateGame && P.money > 2_200_000 && !P.satellite) {
    P.money -= PRICE_SATELLITE;
    P.satellite = true;
  }
  if (o.lateGame && !P.star && P.money > 3_500_000) {
    const s = STARS.find((x) => x.id === 'harms')!;
    P.money -= s.fee;
    P.star = s;
  }

  // Geschenke, solange Bettys Zuneigung noch Luft zum Image hat
  const gifts = GIFTS.filter((x) => x.cost < P.money * 0.3 && P.love >= x.min);
  const gift = gifts[gifts.length - 1];
  if (gift && P.love < P.image - 3) {
    P.money -= gift.cost;
    P.love = Math.min(P.love + gift.love, P.image);
  }

  airRemainingBlocks(g, g.day);
  endOfDay(g);
  g.events.length = 0;   // die Oberfläche würde sie hier abholen
}

export function runBot(diff: DifficultyId, o: BotOptions = {}): BotResult {
  const maxDays = o.maxDays ?? 70;
  const g = createGame({ name: 'Bot TV', diff, seed: o.seed ?? 20250814 });
  const history: BotResult['history'] = [];
  // Die Liste im Spiel ist bei 24 Einträgen gedeckelt; gezählt wird deshalb
  // nach jedem Tag, was neu dazugekommen ist.
  const gesehen = new Set<string>();

  for (let d = 0; d < maxDays; d++) {
    playDay(g, o);
    g.snipes.forEach((s) => gesehen.add(`${s.day}|${s.channel}|${s.title}`));
    history.push({
      day: g.day,
      image: g.player.image,
      money: g.player.money,
      love: g.player.love,
    });
    if (g.over) break;
  }

  return {
    days: g.day,
    won: !!g.end?.win,
    ending: g.end?.title ?? 'offen',
    image: g.player.image,
    love: g.player.love,
    money: g.player.money,
    licences: g.player.licences.length,
    reach: reachOf(g.player),
    rivalImages: g.ch.slice(1).map((c) => c.image),
    rivalMoney: g.ch.slice(1).map((c) => c.money),
    snipes: gesehen.size,
    history,
  };
}
