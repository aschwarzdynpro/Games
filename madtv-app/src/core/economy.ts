/**
 * Tagesabschluss, Betty, Auszeichnungen, Zufallsereignisse, Spielende.
 * Alles, was um 01:00 Uhr passiert, wenn der Sender abschaltet.
 */
import { clamp } from './rng';
import { GENRES, GIFTS, RESSORTS } from './data';
import {
  BANKRUPT_AT, SLOTS, COST_SATELLITE_DAY, COST_STUDIO_DAY, COST_TRANSMITTER_DAY,
  DAY_START, INTEREST_DAY, NEWS_COST,
} from './constants';
import {
  copyLicence, dialog, driftTrends, nextUid, refreshAdMarket, refreshMarket,
  removeFromSchedules, rollNews, sfx, toast,
} from './state';
import { aiTurn } from './ai';
import { esc, money, pct } from './format';
import type { Auction, Channel, Game, Licence } from './types';

/** Laufende Tageskosten eines Senders. */
export function dailyCosts(ch: Channel): number {
  let cost = 0;
  RESSORTS.forEach((r) => {
    const lvl = Math.max(ch.newsSub[r.id] ?? 0, ch.newsSubMax[r.id] ?? 0);
    cost += NEWS_COST[lvl] ?? 0;
  });
  cost += ch.transmitters * COST_TRANSMITTER_DAY;
  if (ch.satellite) cost += COST_SATELLITE_DAY;
  if (ch.studio) cost += COST_STUDIO_DAY;
  if (ch.star) cost += ch.star.salary;
  cost += Math.round(ch.credit * INTEREST_DAY);
  return cost;
}

/* ─────────── Betty ─────────── */

export function updateBetty(g: Game): void {
  g.ch.forEach((c) => {
    let gain = 0;
    if (!c.isAI) {
      gain += c.cultureToday * 1.35;
    } else {
      gain += c.culturePoints * 0.012 + c.aiSkill * 0.45 + (c.money > 900_000 ? c.aiSkill * 0.5 : 0);
      if (c.money > 400_000 && g.rng.chance(c.aiSkill * 0.35)) {
        const avail = GIFTS.filter((x) => x.cost < c.money * 0.35 && c.love >= x.min);
        const x = avail[avail.length - 1];
        if (x) { c.money -= x.cost; gain += x.love * 0.55; }
      }
    }
    // Gedeckelt, damit ein reißerischer Abend die Zuneigung dämpft, aber kein
    // einzelner Tag alles Erarbeitete wegräumt.
    if (!c.isAI) gain -= Math.min(0.8, c.trashToday);

    c.love = clamp(c.love + gain, 0, 100);
    // Originalregel: ihre Zuneigung überflügelt das eigene Image niemals
    if (c.love > c.image) c.love = c.image;
    c.love = Math.max(0, c.love - 0.35);
    c.cultureToday = 0;
    c.trashToday = 0;
  });
}

/* ─────────── Sammy Awards ─────────── */

export function sammyAwards(g: Game): void {
  const cats = [
    { k: 'newsPoints', n: 'Beste Nachrichtensendung', prize: 120_000, img: 1.2 },
    { k: 'culturePoints', n: 'Beste Kultursendung', prize: 90_000, img: 1.6 },
    { k: 'primePoints', n: 'Beste Primetime-Quote', prize: 200_000, img: 1.0 },
  ] as const;

  const lines: string[] = [];
  cats.forEach((cat) => {
    let best = 0;
    let bi = 0;
    g.ch.forEach((c, i) => { if (c[cat.k] > best) { best = c[cat.k]; bi = i; } });
    const w = g.ch[bi]!;
    w.money += cat.prize;
    w.awards++;
    w.image += cat.img;
    lines.push(`<b>${cat.n}</b> → ${esc(w.name)}${bi === 0 ? ' <i data-ic="ui-pokal"></i>' : ''}`);
  });

  const isum = g.ch.reduce((a, c) => a + c.image, 0);
  g.ch.forEach((c) => {
    c.image = (c.image / isum) * 100;
    c.newsPoints = 0;
    c.culturePoints = 0;
    c.primePoints = 0;
  });

  sfx(g, 'award');
  dialog(g, 'ui-pokal', 'Die Sammy-Verleihung', 'Sammy Awards',
    `Woche ${g.week} — die Jury hat entschieden:<br><br>${lines.join('<br>')}`,
    [{ t: 'Weiter', cls: 'btn' }]);
}

/* ─────────── Chef ─────────── */

export function bossCheck(g: Game): void {
  const p = g.player;
  if (p.image < g.D.fireImage) {
    p.lowImageDays++;
    if (p.lowImageDays === 1 || p.lowImageDays === 2) {
      dialog(g, 'flr-chef', 'Herr Raffer', 'Chefbüro',
        `Ihre Quoten sind eine Zumutung! ${pct(p.image / 100, 1)} Marktanteil — meine Großmutter ` +
        `macht besseres Fernsehen. Sie haben noch ${3 - p.lowImageDays} Tag(e), das zu ändern.`,
        [{ t: 'Jawohl, Herr Raffer.', cls: 'btn' }]);
    }
  } else {
    p.lowImageDays = 0;
  }
  if (p.money < -600_000) {
    toast(g, 'bad', 'Die Bank mahnt', 'Ihr Konto ist tief im Minus. Bei −1 Mio ist Schluss.');
  }
}

/* ─────────── Auktionen ─────────── */

export function maybeAuction(g: Game): void {
  g.auction = null;
  g.auctionWarned = false;
  if (g.day > 2 && g.rng.chance(0.38)) {
    const pool = g.catalog.filter((x) => x.tier >= 4);
    if (!pool.length) return;
    const c = g.rng.pick(pool);
    const lic = copyLicence(c, nextUid(g));
    g.auction = {
      ...lic,
      bid: Math.round((c.price * 0.45) / 1000) * 1000,
      leader: null, rounds: 0, closed: false, guide: c.price,
    } as Auction;
  }
}

/** Die Konkurrenz steigert auch ohne Zutun des Spielers mit. */
export function auctionTick(g: Game): void {
  const a = g.auction;
  if (!a || a.closed) return;
  for (let i = 1; i < g.ch.length; i++) {
    const c = g.ch[i]!;
    if (a.leader === c.name) continue;
    const limit = a.guide * (0.8 + c.aiSkill * 0.75);
    const next = Math.round((a.bid * 1.12) / 1000) * 1000;
    if (c.money > next * 1.4 && next < limit && g.rng.chance(c.aiSkill * 0.45)) {
      a.bid = next;
      a.leader = c.name;
      a.rounds++;
      if (!g.auctionWarned) {
        g.auctionWarned = true;
        toast(g, 'warn', 'Auktion läuft', `${c.name} bietet auf «${a.title}».`);
      }
      break;
    }
  }
  if (a.rounds >= 8) closeAuction(g);
}

export function closeAuction(g: Game): void {
  const a = g.auction;
  if (!a || a.closed) return;
  a.closed = true;
  if (!a.leader) return;
  const w = g.ch.find((c) => c.name === a.leader);
  if (!w) return;

  w.money -= a.bid;
  const lic: Licence = copyLicence(a as unknown as Licence, nextUid(g));
  w.licences.push(lic);

  if (!w.isAI) {
    g.stats.costs += a.bid;
    dialog(g, 'ui-hammer', 'Zuschlag!', 'Auktion',
      `«${esc(a.title)}» gehört für ${money(a.bid)} dir.`, [{ t: 'Sehr gut', cls: 'btn' }]);
  } else {
    toast(g, 'bad', 'Auktion verloren', `${a.leader} erhält «${a.title}».`);
  }
}

/* ─────────── Zufallsereignisse ─────────── */

/**
 * Was einem an einem Sendetag sonst noch dazwischenkommt.
 *
 * Früher entschied ein einziger Wurf über alle vier Zweige — sie teilten sich
 * denselben Zahlenstrahl und schlossen sich damit gegenseitig aus. An drei von
 * vier Tagen passierte gar nichts. Jetzt würfelt jedes Ereignis für sich; damit
 * ein Tag trotzdem nicht zum Jahrmarkt wird, sind höchstens zwei erlaubt.
 */
export function randomEvent(g: Game): void {
  const p = g.player;
  let heute = 0;
  const wuerfel = (chance: number, abTag: number): boolean =>
    heute < 2 && g.day > abTag && g.rng.chance(chance) && ++heute > 0;

  if (wuerfel(0.1, 3)) {
    g.pendingTerror = true;
    g.terrorDay = g.day + 1;
    dialog(g, 'ui-bombe', 'Bombendrohung', 'Nachrichtenagentur',
      'Eine anonyme Drohung ist eingegangen: Morgen soll im Sendehochhaus ein Sprengsatz hochgehen. ' +
      'Im Foyer hängt das Türschild-Verzeichnis — wer es umhängt, schickt die Herrschaften in eine andere Etage.',
      [{ t: 'Verstanden', cls: 'btn' }]);
  }

  // Die Konkurrenz greift nach dem Besten, was ihre Kasse hergibt. Vorher stand
  // hier immer das teuerste Stück im Regal — das konnte sie sich an sieben von
  // hundert Tagen leisten, und der Toast fiel praktisch nie.
  if (g.market.length && wuerfel(0.16, 2)) {
    const rival = g.rng.pick(g.ch.slice(1));
    const bezahlbar = g.market.filter((m) => m.price <= rival.money * 0.4);
    // aus dem oberen Drittel des Bezahlbaren — es soll wehtun
    const m = bezahlbar[g.rng.int(Math.floor(bezahlbar.length * 0.66), bezahlbar.length - 1)];
    if (m) {
      g.market.splice(g.market.indexOf(m), 1);
      rival.money -= m.price;
      rival.licences.push(copyLicence(m, nextUid(g)));
      g.snipes.push({
        day: g.day, channel: rival.name, title: m.title,
        genre: m.genre, price: m.price, tier: m.tier,
      });
      if (g.snipes.length > 24) g.snipes.shift();
      toast(g, 'warn', 'Weggeschnappt', `${rival.name} hat «${m.title}» gekauft.`);
    } else {
      heute--;
    }
  }

  if (wuerfel(0.12, 4)) {
    const bonus = g.rng.int(40_000, 140_000);
    p.money += bonus;
    toast(g, 'good', 'Sponsorenscheck',
      `Ein Getränkekonzern überweist ${money(bonus)} fürs Product Placement.`);
  }

  if (wuerfel(0.11, 5)) {
    const loss = g.rng.int(30_000, 110_000);
    p.money -= loss;
    toast(g, 'bad', 'Technischer Defekt', `Die Sendeleitung ist durchgeschmort: ${money(loss)} Reparatur.`);
  }

  if (g.pendingTerror && g.day >= g.terrorDay) {
    g.pendingTerror = false;
    if (g.terrorSign === 'self') {
      const cand = p.licences.filter((l) => !l.produced);
      let txt = 'Das halbe Stockwerk liegt in Trümmern.';
      const lost: Licence[] = [];
      for (let i = 0; i < 2; i++) {
        const rest = cand.filter((x) => !lost.includes(x));
        if (!rest.length) break;
        const l = g.rng.pick(rest);
        lost.push(l);
        p.licences.splice(p.licences.indexOf(l), 1);
        removeFromSchedules(p, l);
      }
      if (lost.length) txt += ` Verbrannt sind: ${lost.map((l) => `«${esc(l.title)}»`).join(', ')}.`;
      p.money -= 80_000;
      sfx(g, 'bad');
      dialog(g, 'gen-action', 'Es hat gekracht', 'Schadensmeldung',
        `${txt} Aufräumkosten: ${money(80_000)}.`, [{ t: 'Na großartig.', cls: 'btn' }]);
    } else {
      const victim = g.terrorSign === 'rival1' ? g.ch[1]! : g.ch[2]!;
      for (let i = 0; i < 2 && victim.licences.length; i++) {
        const l = g.rng.pick(victim.licences);
        victim.licences.splice(victim.licences.indexOf(l), 1);
        removeFromSchedules(victim, l);
      }
      victim.money -= 80_000;
      dialog(g, 'gen-action', 'Es hat gekracht', 'Schadensmeldung',
        `Der Sprengsatz ging in der Etage von ${esc(victim.name)} hoch. Deren Archiv ist ein Aschehaufen. ` +
        'Wie bedauerlich.', [{ t: 'Wie bedauerlich.', cls: 'btn' }]);
      g.terrorSign = 'self';
    }
  }
}

/* ─────────── Spielende ─────────── */

export function checkEnd(g: Game): void {
  const p = g.player;
  const W = g.D.winImage;

  if (p.image >= W && p.love >= W) {
    g.over = true;
    g.end = {
      win: true, title: 'Hochzeit!', ico: 'ui-hochzeit',
      text: `Bei ${pct(p.image / 100, 1)} Marktanteil und einer Zuneigung von ${Math.round(p.love)} ` +
        `Punkten sagt Betty Botterbloom Ja. Herr Raffer weint in sein Taschentuch, die Konkurrenz ` +
        `sendet Testbild. Sie haben es geschafft — nach ${g.day} Tagen.`,
    };
    return;
  }
  for (let i = 1; i < g.ch.length; i++) {
    const c = g.ch[i]!;
    if (c.image >= W && c.love >= W) {
      g.over = true;
      g.end = {
        win: false, title: 'Zu spät', ico: 'ui-herzbruch',
        text: `${esc(c.name)} hat Betty vor Ihrer Nase weggeheiratet. Sie stehen mit ` +
          `${pct(p.image / 100, 1)} Marktanteil und einem Blumenstrauß im Flur.`,
      };
      return;
    }
  }
  if (p.lowImageDays >= 3) {
    g.over = true;
    g.end = {
      win: false, title: 'Gefeuert', ico: 'ui-karton',
      text: `Herr Raffer hat Ihren Schreibtisch bereits ausgeräumt. Drei Tage unter ` +
        `${g.D.fireImage}% Marktanteil sind zwei Tage zu viel.`,
    };
    return;
  }
  if (p.money < BANKRUPT_AT) {
    g.over = true;
    g.end = {
      win: false, title: 'Insolvenz', ico: 'flr-bank',
      text: 'Die Nordsee-Bank hat den Kredit fällig gestellt. Der Sender gehört jetzt den Gläubigern.',
    };
  }
}

/* ─────────── Tagesabschluss ─────────── */

export function endOfDay(g: Game): void {
  const day = g.day;
  const totals = g.ch.map((c) => c.todayAud.reduce((a, b) => a + b, 0));
  const sum = totals.reduce((a, b) => a + b, 0) || 1;

  // Marktanteil, gleitend
  g.ch.forEach((c, i) => {
    // Vor der Neuberechnung merken: Daraus wird der Trend, auf den Herr Raffer
    // seine Laune stützt.
    c.lastImage = c.image;
    const share = (totals[i]! / sum) * 100;
    c.image = c.image * 0.72 + share * 0.28;
    c.audHist.push(totals[i]!);
    if (c.audHist.length > 21) c.audHist.shift();
    c.lastAud = c.todayAud.slice();
    c.todayAud = new Array(SLOTS).fill(0);
  });
  const isum = g.ch.reduce((a, c) => a + c.image, 0);
  g.ch.forEach((c) => { c.image = (c.image / isum) * 100; });

  // Laufende Kosten. Nachrichten nach der höchsten Tagesstufe, damit sich ein
  // Abo nicht nach Sendeschluss kostenlos abbestellen lässt.
  g.ch.forEach((c) => {
    const cost = dailyCosts(c);
    c.money -= cost;
    if (!c.isAI) g.stats.costs += cost;
    RESSORTS.forEach((r) => { c.newsSubMax[r.id] = c.newsSub[r.id] ?? 0; });
  });

  // Werbeverträge: erfüllt oder verfallen
  g.ch.forEach((c) => {
    c.contracts = c.contracts.filter((ct) => {
      if (ct.done >= ct.spots) {
        if (!c.isAI) {
          g.stats.contractsDone++;
          toast(g, 'good', 'Vertrag erfüllt', `${ct.brand} — alle ${ct.spots} Spots gelaufen.`);
        }
        return false;
      }
      if (day >= ct.deadline) {
        c.money -= ct.penalty;
        if (!c.isAI) {
          g.stats.contractsFailed++;
          g.stats.costs += ct.penalty;
          toast(g, 'bad', 'Konventionalstrafe', `${ct.brand} verlangt ${money(ct.penalty)}`);
          sfx(g, 'bad');
        }
        return false;
      }
      return true;
    });
  });

  // Aktualität erholt sich
  g.ch.forEach((c) => c.licences.forEach((l) => {
    if (l.lastDay < day) l.fresh = Math.min(1, l.fresh + 0.1);
  }));

  updateBetty(g);

  // Eigenproduktion
  if (g.production) {
    g.production.left--;
    if (g.production.left <= 0) {
      const pr = g.production.def;
      const lic: Licence = {
        uid: nextUid(g),
        title: `${pr.name} #${g.production.no}`,
        genre: pr.genre, year: 1991, tier: 3, fsk: 6, price: pr.cost,
        qual: clamp(Math.round(pr.quality + g.rng.int(-6, 8)), 10, 98),
        critic: clamp(Math.round(pr.quality + GENRES[pr.genre].krit * 30 + g.rng.int(-5, 10)), 5, 99),
        box: 40, fresh: 1, aired: 0, lastDay: -99, lastBlock: null,
        lenSlots: pr.lenSlots,
        isSerie: !!pr.episodes, eps: pr.episodes ?? 0, ep: 1, produced: true,
        bettyBonus: pr.betty,
      };
      g.player.licences.push(lic);
      toast(g, 'good', 'Produktion fertig', `${lic.title} liegt im Archiv bereit.`);
      g.production = null;
    }
  }

  // Gerichtsvollzieher
  if (g.bailiff) {
    g.bailiff = false;
    const cand = g.player.licences.filter((l) => !l.produced);
    if (cand.length) {
      const l = g.rng.pick(cand);
      g.player.licences.splice(g.player.licences.indexOf(l), 1);
      removeFromSchedules(g.player, l);
      sfx(g, 'bad');
      dialog(g, 'ui-waage', 'Der Gerichtsvollzieher', 'Gerichtsvollzieher',
        `Sie haben einen Film ab 18 Jahren vor 22 Uhr gesendet. Die Lizenz «${esc(l.title)}» wird ` +
        'hiermit beschlagnahmt. Einen schönen Tag noch.', [{ t: 'Verdammt.', cls: 'btn' }]);
    }
  }

  if (day % 7 === 0) sammyAwards(g);

  for (let i = 1; i < g.ch.length; i++) aiTurn(g, g.ch[i]!);

  bossCheck(g);
  randomEvent(g);
  checkEnd(g);
  if (g.over) return;

  // Alte Sendepläne aufräumen
  g.ch.forEach((c) => {
    Object.keys(c.sched).forEach((k) => {
      if (Number(k) < g.day - 1) delete c.sched[Number(k)];
    });
  });

  g.day++;
  g.weekday = (g.weekday + 1) % 7;
  if (g.weekday === 0) g.week++;
  g.time = DAY_START;

  driftTrends(g);
  refreshMarket(g, false);
  refreshAdMarket(g, false);
  rollNews(g);
  closeAuction(g);
  maybeAuction(g);
}
