/**
 * Konkurrenzsender.
 *
 * Wichtig für die Prognose des Spielers: die KI plant drei Tage im Voraus.
 * Plante sie nur einen, rechnete die Vorschau des Spielers für übermorgen
 * gegen ein leeres Konkurrenzprogramm und lag dadurch rund 55 % zu hoch.
 */
import { GENRES, GROUPS, RESSORTS, STARS } from './data';
import {
  SLOTS, MAX_CONTRACTS, MAX_TRANSMITTERS, POP, PRICE_SATELLITE, PRICE_TRANSMITTER,
  adSlotOf, BLOCKS, slotHour,
} from './constants';
import { buyLicence, getDay, placeProgramme, reachOf, toast, trendOf } from './state';
import { pct } from './format';
import type { Channel, Game, Licence } from './types';

/**
 * Wieviel von einer Zuschauerzahl für einen Werbevertrag zählt.
 *
 * Ein Zielgruppenvertrag misst nicht das ganze Publikum, sondern nur seine
 * Gruppe. Die Konkurrenz hat diese Unterscheidung lange nicht gemacht und ihre
 * Gruppenquoten am Gesamtpublikum gemessen — sie unterschrieb dadurch Verträge,
 * von denen sie keinen einzigen Spot erfüllen konnte, und zahlte statt Einnahmen
 * nur noch Konventionalstrafen.
 */
function erreichbar(total: number, group: string | null | undefined, gi: number): number {
  return group ? total * (GROUPS[gi]?.share ?? 0.2) * 1.1 : total;
}

/** Grobe Selbsteinschätzung eines Senders für ein Halbstundenfeld. */
export function estimateAudience(ch: Channel, slot: number): number {
  let pot = 0;
  for (const grp of GROUPS) pot += POP * grp.share * grp.act[slot]!;
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

  const hour = slotHour(block);
  if (lic.fsk >= 18 && hour >= 6 && hour < 22) s *= 0.35;
  if (lic.fsk >= 16 && hour >= 6 && hour < 20) s *= 0.7;
  return s;
}

/** Bewertung je belegtem Feld — sonst gewinnt der Dreistünder immer. */
function scorePerSlot(g: Game, ch: Channel, lic: Licence, at: number): number {
  const len = Math.min(lic.lenSlots, SLOTS - at);
  if (len < lic.lenSlots) return -1;             // passt nicht mehr in den Abend
  let sum = 0;
  for (let i = 0; i < len; i++) sum += progScore(g, ch, lic, at + i);
  return sum / len;
}

/**
 * Programmplätze eines Tages füllen (ohne Werbung).
 *
 * Sendungen sind jetzt verschieden lang, also wird der Abend von vorn nach
 * hinten belegt: Für jedes freie Feld wird der Titel gewählt, der pro belegter
 * Halbstunde am meisten bringt und noch in den Rest des Abends passt.
 */
export function aiPlanDay(g: Game, ch: Channel, day: number): void {
  const slots = getDay(ch, day);
  const used = new Set<number>();
  slots.forEach((s) => { if (s.aired && s.prog) used.add(s.prog.uid); });

  let at = 0;
  while (at < SLOTS) {
    const s = slots[at]!;
    if (s.aired) { at++; continue; }
    if (s.prog && !s.start) { at++; continue; }

    // Passt nichts Frisches mehr in den Rest des Abends, läuft eben eine
    // Wiederholung — Testbild kostet mehr Marktanteil als jeder gesehene Film.
    const fitting = ch.licences.filter((l) => at + l.lenSlots <= SLOTS);
    const avail = fitting.filter((l) => !used.has(l.uid));
    if (!fitting.length) { at++; continue; }
    if (!avail.length) {
      fitting.sort((a, x) => scorePerSlot(g, ch, x, at) - scorePerSlot(g, ch, a, at));
      const rerun = fitting[0]!;
      placeProgramme(slots, at, rerun);
      at += rerun.lenSlots;
      continue;
    }
    avail.sort((a, x) => scorePerSlot(g, ch, x, at) - scorePerSlot(g, ch, a, at));
    const idx = g.rng.next() < ch.aiSkill ? 0 : Math.min(avail.length - 1, g.rng.int(0, 2));
    const chosen = avail[idx]!;
    placeProgramme(slots, at, chosen);
    used.add(chosen.uid);
    at += chosen.lenSlots;
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

  // Lizenzen kaufen. Maßstab ist die Sendezeit im Archiv, nicht die Zahl der
  // Titel — ein Dreistünder ersetzt sechs Magazine.
  const covered = () => ch.licences.reduce((a, l) => a + l.lenSlots, 0);
  let budget = ch.money * (0.3 + sk * 0.28);
  let tries = 0;
  while (budget > 30_000 && covered() < SLOTS + 8 && tries++ < 30) {
    const affordable = g.market.filter((m) => m.price <= budget && m.price <= ch.money * 0.5);
    if (!affordable.length) break;
    affordable.sort(
      (a, b) => ((b.qual * b.lenSlots) / Math.max(1, b.price)) * (g.rng.next() * 0.4 + 0.8)
        - (a.qual * a.lenSlots) / Math.max(1, a.price),
    );
    const buy = affordable[Math.floor(g.rng.next() * Math.min(4, affordable.length))];
    if (!buy) break;
    budget -= buy.price;
    buyLicence(g, ch, buy);

    // Was drüben im Regal landet, soll der Spieler mitbekommen — sonst
    // verschwinden die guten Titel für ihn ohne erkennbaren Grund.
    if (buy.tier >= 4) {
      g.snipes.push({
        day: g.day, channel: ch.name, title: buy.title,
        genre: buy.genre, price: buy.price, tier: buy.tier,
      });
      if (g.snipes.length > 24) g.snipes.shift();
      // Nur der ganz große Fang unterbricht den Spieler — und erst ab Tag 2:
      // Was beim Aufbau der Partie gekauft wurde, hat er nie im Regal gesehen.
      if (buy.tier >= 5 && g.day > 1) {
        toast(g, 'warn', 'Weggeschnappt',
          `${ch.name} hat «${buy.title}» aus dem Verleih geholt.`);
      }
    }
  }

  // Ausbau. Reichweite ist der stärkste Imagehebel im Spiel — wenn die
  // Konkurrenz daran dreht, muss der Spieler es erfahren. Sonst wächst der
  // Nachbar in einer Zahl, die nur sein eigenes Büro anzeigt. Am Aufbautag
  // (g.day === 0) bleibt es still: Was vor Spielbeginn gekauft wurde, hat
  // niemand vorher anders gesehen.
  const melden = (text: string): void => {
    if (g.day > 1) toast(g, 'warn', 'Die Konkurrenz rüstet auf', text);
  };

  if (ch.money > 900_000 && ch.transmitters < MAX_TRANSMITTERS && g.rng.chance(sk * 0.4)) {
    ch.money -= PRICE_TRANSMITTER;
    ch.transmitters++;
    melden(`${ch.name} hat einen Sendemasten gebaut — ${pct(reachOf(ch), 0)} Reichweite.`);
  } else if (ch.money > 1_600_000 && !ch.satellite && g.rng.chance(sk * 0.35)) {
    ch.money -= PRICE_SATELLITE;
    ch.satellite = true;
    melden(`${ch.name} sendet jetzt über Satellit — ${pct(reachOf(ch), 0)} Reichweite.`);
  }
  if (!ch.star && ch.money > 4_000_000 && g.rng.chance(sk * 0.5)) {
    const s = g.rng.pick(STARS);
    ch.money -= s.fee;
    ch.star = s;
    melden(`${s.name} moderiert ab sofort bei ${ch.name}.`);
  }

  // Sendepläne der kommenden Tage
  for (let d = nextDay; d <= nextDay + 2; d++) aiPlanDay(g, ch, d);
  const slots = getDay(ch, nextDay);

  // Werbeverträge annehmen. Der Sender rechnet nach, bevor er unterschreibt:
  // Was seine Reichweite nicht hergibt oder nicht mehr in die verbleibenden
  // Werbeplätze passt, lässt er liegen. Ohne diese Rechnung nahm er stur alle
  // vier Verträge, verfehlte die Hälfte und war nach einer Woche so tief im
  // Minus, dass er nie wieder eine Lizenz kaufte — die Konkurrenz verschwand
  // dann als Gegner aus dem Spiel, ohne dass es jemand merkte.
  // Maßstab ist, was gestern tatsächlich zugeschaut hat, nicht was der Sender
  // sich für den besten Sendeplatz ausrechnet: Wer dem Spieler das Publikum
  // gerade verloren hat, darf sich nicht weiter Quoten zutrauen, die er nicht
  // mehr erreicht.
  const gestern = ch.lastAud.length ? Math.max(...ch.lastAud) : 0;
  const estMax = Math.max(gestern, estimateAudience(ch, 5) * 0.6);
  const offen = (): number => ch.contracts.reduce((a, c) => a + (c.spots - c.done), 0);
  while (ch.contracts.length < MAX_CONTRACTS) {
    const fit = g.adMarket.filter((c) =>
      c.minAud <= erreichbar(estMax, c.group, c.gi) * (0.5 + sk * 0.35)
      && (offen() + c.spots) / Math.max(1, c.days) <= BLOCKS * 0.75);
    if (!fit.length) break;
    fit.sort((a, b) => b.perSpot * b.spots - a.perSpot * a.spots);
    const take = fit[0]!;
    g.adMarket.splice(g.adMarket.indexOf(take), 1);
    ch.contracts.push({ ...take, deadline: g.day + take.days, done: 0 });
  }

  // Spots auf die stündlichen Werbeplätze verteilen — die anspruchsvollsten
  // Verträge zuerst und immer auf den stärksten noch freien Platz. Vorher lief
  // die Schleife von hinten, der Sender legte seine Spots also zuerst auf
  // Mitternacht und verfehlte reihenweise die zugesagte Quote; die Strafen
  // dafür waren am Ende ein Vielfaches seiner Werbeeinnahmen.
  const beste = Array.from({ length: BLOCKS }, (_, b) => adSlotOf(b))
    .sort((a, b) => estimateAudience(ch, b) - estimateAudience(ch, a));
  [...ch.contracts].sort((a, b) => b.minAud - a.minAud).forEach((ct) => {
    let need = ct.spots - ct.done;
    for (const slot of beste) {
      if (need <= 0) break;
      const da = erreichbar(estimateAudience(ch, slot), ct.group, ct.gi);
      if (!slots[slot]!.ad && da >= ct.minAud) {
        slots[slot]!.ad = { id: ct.id, brand: ct.brand };
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
