/**
 * Quoten-Engine.
 *
 * Ablauf je Sendeblock: aus Programm, Nachrichten und Umfeld wird für jeden
 * Sender eine Attraktivität pro Zielgruppe berechnet. Die Zuschauer verteilen
 * sich anteilig darauf — plus einem festen Anteil "Fernseher aus", ohne den
 * schlechtes Programm keine Zuschauer verlieren könnte.
 */
import { clamp } from './rng';
import { GENRES, GROUPS, RESSORTS } from './data';
import { ATTR_OFF, BLOCK_H, BLOCKS, NEWS_QUAL, POP } from './constants';
import { getDay, reachOf, toast, sfx, emit, trendOf } from './state';
import { viewers } from './format';
import type { BlockResult, Channel, Game, Licence } from './types';

/** Aktualität einer Meldung: heute 1, danach fallend. */
export function newsAge(day: number, newsDay: number): number {
  return clamp(1 - (day - newsDay) * 0.35, 0, 1);
}

/**
 * Wirkung der zusammengestellten Nachrichtensendung je Zielgruppe.
 * Nur aktuelle Meldungen aus einem hohen Abo ziehen Zuschauer.
 */
export function newsAttraction(g: Game, ch: Channel): number[] {
  const out = new Array(GROUPS.length).fill(0);
  if (!ch.newsShow.length) return out;
  ch.newsShow.forEach((n) => {
    const r = RESSORTS.find((x) => x.id === n.res);
    if (!r) return;
    const age = newsAge(g.day, n.day);
    const q = NEWS_QUAL[ch.newsSub[n.res] ?? 0] ?? 0;
    for (let i = 0; i < GROUPS.length; i++) {
      out[i] += n.weight * age * q * r.aff[i]!;
    }
  });
  for (let i = 0; i < GROUPS.length; i++) out[i] /= 3;
  return out;
}

/** Attraktivität eines Sendeblocks je Zielgruppe. */
export function blockAttraction(
  g: Game, ch: Channel, day: number, block: number, newsAttr: number[],
): number[] {
  const slots = getDay(ch, day);
  const s = slots[block]!;
  const out = new Array(GROUPS.length).fill(0.05);
  const hour = BLOCK_H[block]!;

  if (!s.prog) {
    // Testbild: nur die Nachrichten halten ein paar Zuschauer
    for (let i = 0; i < GROUPS.length; i++) out[i] = 0.05 + newsAttr[i]! * 0.1;
    return out;
  }

  const p = s.prog;
  const gd = GENRES[p.genre];
  const qEff = p.qual * (0.34 + 0.66 * p.fresh);

  // Trailer: lief das Programm heute schon auf einem Werbeplatz?
  let trailer = 0;
  for (let b = 0; b < block; b++) {
    if (slots[b]!.trailer?.uid === p.uid) trailer += 0.13;
  }

  // Zuschauerfluss aus dem Block davor
  let flow = 0;
  const prev = block > 0 ? slots[block - 1]!.prog : null;
  if (prev) {
    if (prev.genre === p.genre) flow = 0.11;
    else if (GENRES[prev.genre].kult === gd.kult) flow = 0.04;
  }

  // Serien binden ihr Publikum an einen festen Sendeplatz
  let loyal = 0;
  if (p.isSerie && p.lastBlock !== null) loyal = p.lastBlock === block ? 0.13 : -0.09;

  const star = ch.star && ch.star.genres.includes(p.genre) ? ch.star.boost : 0;
  const tr = trendOf(g, p.genre);

  for (let i = 0; i < GROUPS.length; i++) {
    let a = (qEff / 52) * gd.aff[i]! * tr;
    a *= 1 + newsAttr[i]! * 0.3;
    a *= 1 + trailer + flow + loyal + star;

    if (p.fsk >= 18) {
      if (hour >= 6 && hour < 22) a *= 0.42;
      if (GROUPS[i]!.id === 'kind') a *= 0.05;
    } else if (p.fsk >= 16) {
      if (hour >= 6 && hour < 20) a *= 0.72;
      if (GROUPS[i]!.id === 'kind') a *= 0.18;
    } else if (p.fsk >= 12 && GROUPS[i]!.id === 'kind') {
      a *= 0.55;
    }
    out[i] = Math.max(0.02, a);
  }
  return out;
}

/** Zuschauer aller Sender für einen Block, ohne Nebenwirkungen. */
function computeBlock(g: Game, day: number, block: number): BlockResult[] {
  const news = g.ch.map((c) => newsAttraction(g, c));
  const attrs = g.ch.map((c, i) => blockAttraction(g, c, day, block, news[i]!));
  const reach = g.ch.map(reachOf);
  const result: BlockResult[] = g.ch.map(() => ({
    total: 0, groups: new Array(GROUPS.length).fill(0),
  }));

  for (let gi = 0; gi < GROUPS.length; gi++) {
    const grp = GROUPS[gi]!;
    const potential = POP * grp.share * grp.act[block]!;
    let denom = ATTR_OFF;
    for (let c = 0; c < g.ch.length; c++) denom += attrs[c]![gi]! * reach[c]!;
    for (let c = 0; c < g.ch.length; c++) {
      const v = (potential * (attrs[c]![gi]! * reach[c]!)) / denom;
      result[c]!.groups[gi] = v;
      result[c]!.total += v;
    }
  }
  return result;
}

/**
 * Prognose für den Spieler — optional mit einem Kandidaten auf dem Sendeplatz.
 * Setzt den Platz kurz, rechnet und stellt den alten Zustand wieder her.
 */
export function estimateBlock(
  g: Game, day: number, block: number, cand: Licence | null = null,
): BlockResult {
  const slots = getDay(g.player, day);
  const old = slots[block]!.prog;
  if (cand) slots[block]!.prog = cand;
  const res = computeBlock(g, day, block);
  slots[block]!.prog = old;
  return res[0]!;
}

/** Einen Sendeblock tatsächlich ausstrahlen — mit allen Folgen. */
export function airBlock(g: Game, day: number, block: number): void {
  const result = computeBlock(g, day, block);

  g.ch.forEach((ch, ci) => {
    const slots = getDay(ch, day);
    const s = slots[block]!;
    const r = result[ci]!;
    s.aired = true;
    s.res = r;
    ch.todayAud[block] = r.total;

    if (s.prog) {
      const p = s.prog;
      p.aired++;
      p.lastDay = day;
      p.lastBlock = block;

      if (p.isSerie) {
        p.fresh = Math.max(0.15, p.fresh * 0.86);
        p.ep++;
        if (p.ep > p.eps) { p.ep = 1; p.fresh = Math.max(0.1, p.fresh * 0.55); }
      } else {
        p.fresh = Math.max(0.08, p.fresh * 0.48);
      }

      if (GENRES[p.genre].kult) {
        const starK = ch.star?.id === 'harms' ? 2 : 1;
        ch.culturePoints += (p.critic / 100) * (r.total / 1_000_000) * starK;
        ch.cultureToday +=
          ((p.critic / 100) * (1 + r.total / 6_000_000) + (p.bettyBonus ?? 0) * 0.16) * starK;
      }
      if (block === 2 || block === 3) ch.primePoints += r.total / 1_000_000;

      // Film ab 18 vor 22 Uhr: der Gerichtsvollzieher merkt sich das
      if (p.fsk >= 18 && BLOCK_H[block]! < 22 && BLOCK_H[block]! >= 6 && !ch.isAI) {
        if (g.rng.chance(0.25)) g.bailiff = true;
      }
    }

    ch.newsPoints +=
      ch.newsShow.reduce(
        (a, n) => a + n.weight * newsAge(g.day, n.day) * (NEWS_QUAL[ch.newsSub[n.res] ?? 0] ?? 0),
        0,
      ) * (r.total / 4_000_000);

    // Werbespot abrechnen
    if (s.ad) {
      const ct = ch.contracts.find((c) => c.id === s.ad!.id);
      if (ct && ct.done < ct.spots) {
        const reached = ct.group ? r.groups[ct.gi]! : r.total;
        if (reached >= ct.minAud) {
          ct.done++;
          ch.money += ct.perSpot;
          if (!ch.isAI) {
            g.stats.revenue += ct.perSpot;
            toast(g, 'good', 'Werbespot gelaufen', `${ct.brand} zahlt ${ct.perSpot.toLocaleString('de-DE')} €`);
            sfx(g, 'cash');
          }
        } else if (!ch.isAI) {
          toast(g, 'warn', 'Quote verfehlt',
            `${ct.brand}: ${viewers(reached)} statt ${viewers(ct.minAud)}`);
          sfx(g, 'miss');
        }
      }
    }
  });

  const pr = result[0]!;
  const all = result.reduce((a, x) => a + x.total, 0) || 1;
  g.log.unshift({
    day, block,
    aud: pr.total,
    share: pr.total / all,
    title: getDay(g.player, day)[block]!.prog?.title ?? 'Testbild',
  });
  if (g.log.length > 90) g.log.length = 90;

  emit(g, { kind: 'blockAired', day, block });
}

/** Alle Sendeblöcke eines Tages nachholen, die noch nicht liefen. */
export function airRemainingBlocks(g: Game, day: number): void {
  const slots = getDay(g.player, day);
  for (let b = 0; b < BLOCKS; b++) {
    if (!slots[b]!.aired) airBlock(g, day, b);
  }
}
