/**
 * Konkurrenzsender.
 *
 * Wichtig für die Prognose des Spielers: die KI plant drei Tage im Voraus.
 * Plante sie nur einen, rechnete die Vorschau des Spielers für übermorgen
 * gegen ein leeres Konkurrenzprogramm und lag dadurch rund 55 % zu hoch.
 */
import { GENRES, GROUPS, RESSORTS, STARS } from './data';
import {
  BLOCKS, BLOCK_H, MAX_CONTRACTS, MAX_TRANSMITTERS, POP,
  PRICE_SATELLITE, PRICE_TRANSMITTER,
} from './constants';
import { buyLicence, getDay, reachOf, trendOf } from './state';
import type { Channel, Game, Licence } from './types';

/** Grobe Selbsteinschätzung eines Senders für einen Sendeblock. */
export function estimateAudience(ch: Channel, block: number): number {
  let pot = 0;
  for (const grp of GROUPS) pot += POP * grp.share * grp.act[block]!;
  return pot * (ch.image / 100) * (reachOf(ch) / 0.55) * 0.62;
}

/** Wie gut passt eine Lizenz in einen Sendeblock? */
export function progScore(g: Game, ch: Channel, lic: Licence, block: number): number {
  const gd = GENRES[lic.genre];
  let s = 0;
  for (let i = 0; i < GROUPS.length; i++) {
    s += GROUPS[i]!.share * GROUPS[i]!.act[block]! * gd.aff[i]!;
  }
  s *= lic.qual * (0.34 + 0.66 * lic.fresh) * trendOf(g, lic.genre);
  if (ch.star && ch.star.genres.includes(lic.genre)) s *= 1 + ch.star.boost;
  if (lic.isSerie && lic.lastBlock === block) s *= 1.13;

  const hour = BLOCK_H[block]!;
  if (lic.fsk >= 18 && hour >= 6 && hour < 22) s *= 0.35;
  if (lic.fsk >= 16 && hour >= 6 && hour < 20) s *= 0.7;
  return s;
}

/** Programmplätze eines Tages füllen (ohne Werbung). */
export function aiPlanDay(g: Game, ch: Channel, day: number): void {
  const slots = getDay(ch, day);
  const used = new Set<number>();
  slots.forEach((s) => { if (s.aired && s.prog) used.add(s.prog.uid); });

  for (let b = 0; b < BLOCKS; b++) {
    if (slots[b]!.aired) continue;
    const avail = ch.licences.filter((l) => !used.has(l.uid));
    if (!avail.length) { slots[b]!.prog = null; continue; }
    avail.sort((a, x) => progScore(g, ch, x, b) - progScore(g, ch, a, b));
    const idx = g.rng.next() < ch.aiSkill ? 0 : Math.min(avail.length - 1, g.rng.int(0, 2));
    const chosen = avail[idx]!;
    slots[b]!.prog = chosen;
    used.add(chosen.uid);
  }
}

/** Eine vollständige Runde eines Konkurrenzsenders. */
export function aiTurn(g: Game, ch: Channel): void {
  const sk = ch.aiSkill;
  const nextDay = g.day + 1;

  // Nachrichtenabos
  RESSORTS.forEach((r) => {
    const want = ch.money > 700_000 ? (sk > 0.85 ? 3 : 2) : ch.money > 300_000 ? 1 : 0;
    const lvl = g.rng.next() < sk * 0.75 ? want : Math.max(0, want - 1);
    ch.newsSub[r.id] = lvl;
    ch.newsSubMax[r.id] = Math.max(ch.newsSubMax[r.id] ?? 0, lvl);
  });

  // Nachrichtensendung zusammenstellen
  const cand = RESSORTS.flatMap((r) => ((ch.newsSub[r.id] ?? 0) > 0 ? g.newsPool[r.id] : []));
  cand.sort(
    (a, b) => b.weight - (g.day - b.day) * 0.3 - (a.weight - (g.day - a.day) * 0.3),
  );
  ch.newsShow = cand.slice(0, 3);

  // Lizenzen kaufen
  let budget = ch.money * (0.3 + sk * 0.28);
  let tries = 0;
  while (budget > 30_000 && ch.licences.length < 16 && tries++ < 30) {
    const affordable = g.market.filter((m) => m.price <= budget && m.price <= ch.money * 0.5);
    if (!affordable.length) break;
    affordable.sort(
      (a, b) => (b.qual / Math.max(1, b.price)) * (g.rng.next() * 0.4 + 0.8) - a.qual / Math.max(1, a.price),
    );
    const buy = affordable[Math.floor(g.rng.next() * Math.min(4, affordable.length))];
    if (!buy) break;
    budget -= buy.price;
    buyLicence(g, ch, buy);
  }

  // Ausbau
  if (ch.money > 900_000 && ch.transmitters < MAX_TRANSMITTERS && g.rng.chance(sk * 0.4)) {
    ch.money -= PRICE_TRANSMITTER;
    ch.transmitters++;
  } else if (ch.money > 1_600_000 && !ch.satellite && g.rng.chance(sk * 0.35)) {
    ch.money -= PRICE_SATELLITE;
    ch.satellite = true;
  }
  if (!ch.star && ch.money > 4_000_000 && g.rng.chance(sk * 0.5)) {
    const s = g.rng.pick(STARS);
    ch.money -= s.fee;
    ch.star = s;
  }

  // Sendepläne der kommenden Tage
  for (let d = nextDay; d <= nextDay + 2; d++) aiPlanDay(g, ch, d);
  const slots = getDay(ch, nextDay);

  // Werbeverträge annehmen
  const estMax = estimateAudience(ch, 3);
  while (ch.contracts.length < MAX_CONTRACTS) {
    const fit = g.adMarket.filter((c) => c.minAud <= estMax * (0.55 + sk * 0.6));
    if (!fit.length) break;
    fit.sort((a, b) => b.perSpot * b.spots - a.perSpot * a.spots);
    const take = fit[0]!;
    g.adMarket.splice(g.adMarket.indexOf(take), 1);
    ch.contracts.push({ ...take, deadline: g.day + take.days, done: 0 });
  }

  // Spots auf die Blöcke verteilen
  ch.contracts.forEach((ct) => {
    let need = ct.spots - ct.done;
    for (let b = BLOCKS - 1; b >= 0 && need > 0; b--) {
      if (!slots[b]!.ad && estimateAudience(ch, b) >= ct.minAud * (ct.group ? 0.25 : 1)) {
        slots[b]!.ad = { id: ct.id, brand: ct.brand };
        need--;
      }
    }
  });
}

/**
 * Erster Sendetag: ohne diesen Schritt liefe bei der Konkurrenz an Tag 1
 * Testbild, und der Spieler startete mit einem geschenkten Vorsprung.
 */
export function aiBootstrap(g: Game): void {
  const realDay = g.day;
  g.day = realDay - 1;
  for (let i = 1; i < g.ch.length; i++) aiTurn(g, g.ch[i]!);
  g.day = realDay;
}
