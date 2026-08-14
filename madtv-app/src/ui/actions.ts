/**
 * Aktionen des Spielers.
 *
 * Alles, was der Spieler anklickt, landet hier. Der Kern wird nur über seine
 * Funktionen verändert — kein Rendering, keine Timer.
 */
import {
  BLOCKS, BLOCK_H, GENRES, GIFTS, GROUPS, MAX_CONTRACTS, MAX_CREDIT, MAX_TRANSMITTERS,
  PACKAGE_COST, PRICE_SATELLITE, PRICE_TRANSMITTER, PRODUCTIONS, STARS, STUDIO_RENT,
  buyLicence, closeAuction, copyLicence, esc, estimateBlock, getDay, money, moneyShort,
  nextUid, removeFromSchedules, viewers,
} from '../core';
import type { GenreId, Licence, RessortId } from '../core';
import { G, S, markDirty } from './session';
import { chooser, dialog, toast } from './overlay';
import { playSfx } from './sfx';
import { addTime, leaveRoom } from './loop';
import { bar, fskTag, licMeta } from './rooms';

type Data = Record<string, string | undefined>;

/**
 * Während ein Auswahldialog offen ist, läuft die Uhr weiter — der Block kann
 * also längst gesendet sein, wenn die Wahl zurückkommt.
 */
function slotEditable(day: number, b: number): boolean {
  const g = G();
  if (day < g.day) { toast('warn', 'Zu spät', 'Der Tag ist vorbei.'); return false; }
  if (getDay(g.player, day)[b]!.aired) {
    toast('warn', 'Zu spät', `${String(BLOCK_H[b]).padStart(2, '0')}:00 Uhr läuft bereits.`);
    return false;
  }
  return true;
}

function sellPrice(l: Licence): number {
  return Math.round((l.price * 0.42 * (0.4 + 0.6 * l.fresh)) / 1000) * 1000;
}

const ACTIONS: Record<string, (d: Data) => void> = {
  back() { leaveRoom(); },

  setday(d) { S().viewDay = Number(d.d); },

  filmfilter(d) { S().filmFilter = d.g!; },

  /* ── Sendeplan ── */

  pickprog(d) {
    const g = G();
    const day = Number(d.day);
    const b = Number(d.b);
    const slots = getDay(g.player, day);

    const items: { label: string; sub: string; right?: string; value: { clear?: boolean; lic?: Licence } }[] = [];
    if (slots[b]!.prog) {
      items.push({ label: '⌫ Sendeplatz leeren', sub: 'Testbild senden', value: { clear: true } });
    }
    [...g.player.licences]
      .sort((a, x) => estimateBlock(g, day, b, x).total - estimateBlock(g, day, b, a).total)
      .forEach((l) => {
        const est = estimateBlock(g, day, b, l);
        const gd = GENRES[l.genre];
        const warn = l.fsk >= 18 && BLOCK_H[b]! < 22 && BLOCK_H[b]! >= 6
          ? ' <span class="tag b">zu früh!</span>' : '';
        const used = slots.some((s, i) => i !== b && s.prog?.uid === l.uid)
          ? ' <span class="tag w">läuft heute schon</span>' : '';
        items.push({
          label: `${esc(l.title)} ${fskTag(l.fsk)}${warn}${used}`,
          sub: `${gd.ico} ${gd.name} · Frische ${Math.round(l.fresh * 100)}% · Zuschauerwert ${l.qual}`,
          right: `<b>${viewers(est.total)}</b>`,
          value: { lic: l },
        });
      });

    chooser(
      `${String(BLOCK_H[b]).padStart(2, '0')}:00 Uhr — Sendung wählen`, 'Sendeplan', '📺',
      items,
      (v) => {
        if (!slotEditable(day, b)) return;
        if (v.clear) slots[b]!.prog = null;
        else if (v.lic) { slots[b]!.prog = v.lic; playSfx('buy'); }
      },
      { emptyText: 'Dein Archiv ist leer. Kauf erst Lizenzen in der Filmagentur.', pause: !g.opt.timePressure },
    );
  },

  pickad(d) {
    const g = G();
    const day = Number(d.day);
    const b = Number(d.b);
    const slots = getDay(g.player, day);
    const est = estimateBlock(g, day, b);

    const items: { label: string; sub: string; right?: string; value: { clear?: boolean; ad?: number; brand?: string; trail?: Licence } }[] = [];
    if (slots[b]!.ad || slots[b]!.trailer) {
      items.push({ label: '⌫ Werbeplatz leeren', sub: 'nichts senden', value: { clear: true } });
    }
    g.player.contracts.forEach((c) => {
      if (c.done >= c.spots) return;
      const reached = c.group ? est.groups[c.gi]! : est.total;
      const ok = reached >= c.minAud;
      items.push({
        label: `📣 ${esc(c.brand)} ` +
          (ok ? '<span class="tag g">Quote reicht</span>' : '<span class="tag b">zu wenig</span>'),
        sub: `Braucht ${viewers(c.minAud)}${c.group ? ` ${GROUPS[c.gi]!.name}` : ''} · ` +
          `Prognose ${viewers(reached)} · ${c.done}/${c.spots} Spots`,
        right: `<b class="ok">${moneyShort(c.perSpot)}</b>`,
        value: { ad: c.id, brand: c.brand },
      });
    });
    slots.forEach((s, i) => {
      if (i <= b || !s.prog) return;
      if (items.some((x) => x.value.trail?.uid === s.prog!.uid)) return;
      items.push({
        label: `🎞️ Trailer: ${esc(s.prog.title)}`,
        sub: `Bewirbt die Sendung um ${String(BLOCK_H[i]).padStart(2, '0')}:00 Uhr (+13% Zuschauer)`,
        value: { trail: s.prog },
      });
    });

    chooser(
      `${String(BLOCK_H[b]).padStart(2, '0')}:00 Uhr — Werbeblock`, 'Sendeplan', '📣',
      items,
      (v) => {
        if (!slotEditable(day, b)) return;
        slots[b]!.ad = null;
        slots[b]!.trailer = null;
        if (v.ad !== undefined) { slots[b]!.ad = { id: v.ad, brand: v.brand! }; playSfx('buy'); }
        else if (v.trail) slots[b]!.trailer = v.trail;
      },
      { emptyText: 'Kein Vertrag im Koffer und keine spätere Sendung zum Bewerben.', pause: !g.opt.timePressure },
    );
  },

  showres(d) {
    const g = G();
    const day = Number(d.day);
    const b = Number(d.b);
    const s = getDay(g.player, day)[b]!;
    if (!s.res) return;
    const rivals = g.ch.slice(1).map((c) => ({
      name: c.name,
      aud: c.sched[day]?.[b]?.res?.total ?? 0,
    }));
    const all = s.res.total + rivals.reduce((a, r) => a + r.aud, 0);
    const gmax = Math.max(...s.res.groups);

    dialog('📊', `${String(BLOCK_H[b]).padStart(2, '0')}:00 Uhr — ${s.prog ? s.prog.title : 'Testbild'}`,
      'Zuschauerforschung',
      `<b>${viewers(s.res.total)}</b> Zuschauer · Marktanteil ` +
      `${((s.res.total / (all || 1)) * 100).toFixed(1).replace('.', ',')}%<br><br>` +
      GROUPS.map((grp, i) =>
        `<div class="grouprow"><div class="gn">${grp.ico} ${esc(grp.name)}</div>` +
        `<div class="gb">${bar(s.res!.groups[i]!, gmax)}</div>` +
        `<div class="gv">${viewers(s.res!.groups[i]!)}</div></div>`).join('') +
      '<div style="margin-top:10px;font-size:11.5px;color:var(--dim2)">Gleichzeitig: ' +
      rivals.map((r) => `${esc(r.name)} ${viewers(r.aud)}`).join(' · ') + '</div>',
      [{ t: 'Schließen', cls: 'btn ghost' }]);
  },

  copyprev(d) {
    const g = G();
    const day = Number(d.day);
    const src = getDay(g.player, day - 1);
    const dst = getDay(g.player, day);
    let n = 0;
    for (let b = 0; b < BLOCKS; b++) {
      const from = src[b]!.prog;
      if (dst[b]!.aired || !from) continue;
      if (!g.player.licences.some((l) => l.uid === from.uid)) continue;
      dst[b]!.prog = from;
      n++;
    }
    toast(n ? 'good' : 'warn', 'Plan übernommen', `${n} von ${BLOCKS} Sendeplätzen aus dem Vortag gefüllt.`);
  },

  copynext(d) {
    const g = G();
    const day = Number(d.day);
    const src = getDay(g.player, day);
    const dst = getDay(g.player, day + 1);
    let n = 0;
    for (let b = 0; b < BLOCKS; b++) {
      if (dst[b]!.aired || !src[b]!.prog) continue;
      dst[b]!.prog = src[b]!.prog;
      n++;
    }
    S().viewDay = Math.max(0, Math.min(3, day + 1 - g.day));
    toast('good', 'Kopiert', `${n} Sendeplätze auf den Folgetag übertragen.`);
  },

  autofill(d) {
    const g = G();
    const day = Number(d.day);
    const slots = getDay(g.player, day);
    const used = new Set<number>();
    slots.forEach((s) => { if (s.prog) used.add(s.prog.uid); });
    let n = 0;
    for (let b = 0; b < BLOCKS; b++) {
      if (slots[b]!.aired || slots[b]!.prog) continue;
      const avail = g.player.licences.filter((l) => !used.has(l.uid));
      if (!avail.length) break;
      avail.sort((x, y) => estimateBlock(g, day, b, y).total - estimateBlock(g, day, b, x).total);
      slots[b]!.prog = avail[0]!;
      used.add(avail[0]!.uid);
      n++;
    }
    toast(n ? 'good' : 'warn', 'Lücken gefüllt', `${n} Sendeplätze automatisch belegt — prüf sie ruhig nach.`);
  },

  clearday(d) {
    const day = Number(d.day);
    getDay(G().player, day).forEach((s) => {
      if (!s.aired) { s.prog = null; s.ad = null; s.trailer = null; }
    });
    toast('warn', 'Geleert', 'Alle nicht gesendeten Plätze des Tages sind frei.');
  },

  /* ── Filmagentur ── */

  buy(d) {
    const g = G();
    const m = g.market.find((x) => x.uid === Number(d.u));
    if (!m) return;
    if (g.player.money < m.price) { toast('bad', 'Zu teuer', 'Dafür reicht das Konto nicht.'); return; }
    buyLicence(g, g.player, m);
    addTime(3);
    playSfx('buy');
    toast('good', 'Gekauft', `«${m.title}» liegt im Archiv.`);
  },

  bid() {
    const g = G();
    const a = g.auction;
    if (!a || a.closed) return;
    const next = Math.round((a.bid * 1.12) / 1000) * 1000;
    if (g.player.money < next) { toast('bad', 'Zu teuer', 'Die Bank sagt nein.'); return; }
    a.bid = next;
    a.leader = g.player.name;
    a.rounds++;
    addTime(4);
    playSfx('buy');

    for (let i = 1; i < g.ch.length; i++) {
      const c = g.ch[i]!;
      const limit = a.guide * (0.8 + c.aiSkill * 0.75);
      const raise = Math.round((a.bid * 1.12) / 1000) * 1000;
      if (c.money > raise * 1.4 && raise < limit && g.rng.chance(c.aiSkill)) {
        a.bid = raise;
        a.leader = c.name;
        a.rounds++;
        toast('warn', 'Überboten', `${c.name} bietet ${moneyShort(raise)}.`);
        break;
      }
    }
    if (a.rounds >= 8) closeAuction(g);
  },

  passauction() { closeAuction(G()); },

  package() {
    const g = G();
    const p = g.player;
    if (g.packageTaken || p.money < PACKAGE_COST) return;
    const owned = new Set<string>();
    g.ch.forEach((c) => c.licences.forEach((l) => owned.add(l.title)));
    const pool = g.catalog.filter((c) => c.tier >= 4 && !owned.has(c.title));
    if (pool.length < 5) {
      toast('warn', 'Nichts mehr da', 'Der Verleih hat keine Spitzentitel mehr frei.');
      return;
    }
    p.money -= PACKAGE_COST;
    g.stats.costs += PACKAGE_COST;
    g.packageTaken = true;

    const took: string[] = [];
    for (let i = 0; i < 5; i++) {
      const c = pool.splice(Math.floor(g.rng.next() * pool.length), 1)[0]!;
      const lic = copyLicence(c, nextUid(g));
      p.licences.push(lic);
      took.push(lic.title);
      const mi = g.market.findIndex((m) => m.title === lic.title);
      if (mi >= 0) g.market.splice(mi, 1);
    }
    g.stats.filmsBought += 5;
    addTime(12);
    playSfx('award');
    dialog('📦', 'Paket im Haus', 'Filmagentur',
      `Fünf Titel exklusiv für dich:<br><br>${took.map((t) => `«${esc(t)}»`).join('<br>')}`,
      [{ t: 'Ausgezeichnet', cls: 'btn' }]);
  },

  /* ── Werbeagentur ── */

  takead(d) {
    const g = G();
    const p = g.player;
    if (p.contracts.length >= MAX_CONTRACTS) {
      toast('warn', 'Koffer voll', 'Höchstens vier Verträge gleichzeitig.');
      return;
    }
    const c = g.adMarket.find((x) => x.id === Number(d.i));
    if (!c) return;
    g.adMarket.splice(g.adMarket.indexOf(c), 1);
    p.contracts.push({ ...c, deadline: g.day + c.days, done: 0 });
    addTime(3);
    toast('good', 'Vertrag unterschrieben', `${c.brand} · ${c.spots} Spots bis Tag ${g.day + c.days}`);
  },

  /* ── Nachrichten ── */

  sub(d) {
    const p = G().player;
    const res = d.r as RessortId;
    const lvl = Number(d.l);
    p.newsSub[res] = lvl;
    p.newsSubMax[res] = Math.max(p.newsSubMax[res] ?? 0, lvl);
    p.newsShow = p.newsShow.filter((n) => (p.newsSub[n.res] ?? 0) > 0);
  },

  addnews(d) {
    const g = G();
    const p = g.player;
    if (p.newsShow.length >= 3) return;
    const n = g.newsPool[d.r as RessortId].find((x) => x.id === Number(d.i));
    if (n) p.newsShow.push(n);
    addTime(2);
  },

  unnews(d) {
    const p = G().player;
    p.newsShow = p.newsShow.filter((n) => n.id !== Number(d.i));
  },

  /* ── Archiv ── */

  sell(d) {
    const g = G();
    const p = g.player;
    const l = p.licences.find((x) => x.uid === Number(d.u));
    if (!l) return;
    const sum = sellPrice(l);
    dialog('🗄️', 'Lizenz verkaufen', 'Archiv',
      `«${esc(l.title)}» für ${money(sum)} abgeben?`,
      [
        {
          t: 'Verkaufen', cls: 'btn',
          fn: () => {
            p.licences.splice(p.licences.indexOf(l), 1);
            removeFromSchedules(p, l);
            p.money += sum;
            g.stats.revenue += sum;
            toast('good', 'Verkauft', `${money(sum)} gutgeschrieben.`);
            markDirty();
          },
        },
        { t: 'Behalten', cls: 'btn ghost' },
      ]);
  },

  /* ── Studio ── */

  rentstudio() {
    const g = G();
    if (g.player.money < STUDIO_RENT) return;
    g.player.money -= STUDIO_RENT;
    g.player.studio = true;
    g.stats.costs += STUDIO_RENT;
    addTime(10);
    toast('good', 'Studio angemietet', '40.000 € Tagesmiete laufen ab sofort.');
  },

  produce(d) {
    const g = G();
    const pr = PRODUCTIONS.find((x) => x.id === d.p);
    if (!pr || g.production || g.player.money < pr.cost) return;
    g.player.money -= pr.cost;
    g.stats.costs += pr.cost;
    g.productionNo++;
    g.production = { def: pr, left: pr.days, no: g.productionNo };
    addTime(15);
    toast('good', 'Dreh gestartet', `${pr.name} — fertig in ${pr.days} Tag(en).`);
  },

  hirestar(d) {
    const g = G();
    const p = g.player;
    const s = STARS.find((x) => x.id === d.s);
    if (!s || p.star || p.money < s.fee) return;
    p.money -= s.fee;
    g.stats.costs += s.fee;
    p.star = s;
    addTime(20);
    playSfx('award');
    dialog(s.ico, 'Vertrag unterschrieben', s.name,
      `«Ich mache Ihnen den Sender groß. Und Sie machen mir ${money(s.salary)} am Tag.»<br><br>` +
      `+${Math.round(s.boost * 100)}% Zuschauer auf ${s.genres.map((x) => GENRES[x as GenreId].name).join(', ')}.`,
      [{ t: 'Willkommen', cls: 'btn' }]);
  },

  firestar() {
    const g = G();
    const p = g.player;
    if (!p.star) return;
    const abfind = Math.round(p.star.salary * 8);
    dialog('📄', 'Vertrag lösen', 'Produktionsstudio',
      `${esc(p.star.name)} gehen lassen? Die Abfindung beträgt ${money(abfind)}.`,
      [
        {
          t: 'Auflösen', cls: 'btn danger',
          fn: () => {
            p.money -= abfind;
            g.stats.costs += abfind;
            p.star = null;
            toast('warn', 'Vertrag gelöst', 'Die Gage entfällt ab morgen.');
            markDirty();
          },
        },
        { t: 'Behalten', cls: 'btn ghost' },
      ]);
  },

  /* ── Technik ── */

  mast() {
    const g = G();
    const p = g.player;
    if (p.transmitters >= MAX_TRANSMITTERS || p.money < PRICE_TRANSMITTER) return;
    p.money -= PRICE_TRANSMITTER;
    p.transmitters++;
    g.stats.costs += PRICE_TRANSMITTER;
    addTime(8);
    toast('good', 'Sendemast steht', `Reichweite jetzt ${Math.round((0.4 + p.transmitters * 0.11 + (p.satellite ? 0.22 : 0)) * 100)}%.`);
  },

  sat() {
    const g = G();
    const p = g.player;
    if (p.satellite || p.money < PRICE_SATELLITE) return;
    p.money -= PRICE_SATELLITE;
    p.satellite = true;
    g.stats.costs += PRICE_SATELLITE;
    addTime(8);
    toast('good', 'Satellit aufgeschaltet', 'Die Reichweite steigt spürbar.');
  },

  /* ── Bank ── */

  loan(d) {
    const p = G().player;
    const v = Number(d.v);
    if (p.credit + v > MAX_CREDIT) return;
    p.credit += v;
    p.money += v;
    toast('warn', 'Kredit aufgenommen', `${money(v)} — 0,6% Zins pro Tag.`);
  },

  repay(d) {
    const p = G().player;
    const v = Number(d.v);
    if (p.credit < v || p.money < v) return;
    p.credit -= v;
    p.money -= v;
    toast('good', 'Getilgt', `${money(v)} zurückgezahlt.`);
  },

  /* ── Betty & Kiosk ── */

  visit() {
    const g = G();
    const p = g.player;
    addTime(15);
    playSfx('love');
    const gain = Math.max(0, Math.min(3, 0.6 + p.image / 60));
    p.love = Math.max(0, Math.min(Math.min(p.love + gain, p.image), 100));
    const lines = [
      '«Sie riechen nach Archivstaub.»',
      '«Haben Sie das Ballett gesehen? Nein? Dachte ich mir.»',
      '«Man sagt, Ihr Sender hätte gestern Testbild gezeigt.»',
      '«Sie sind hartnäckig. Das gefällt mir fast.»',
      '«Bringen Sie mir mehr Kultur. Dann reden wir weiter.»',
    ];
    dialog('💗', 'Betty Botterbloom', 'Kulturredaktion',
      `${esc(g.rng.pick(lines))}<br><br><span class="dim">Zuneigung +${gain.toFixed(1).replace('.', ',')}</span>`,
      [{ t: 'Bis morgen', cls: 'btn love' }]);
  },

  gift(d) {
    const g = G();
    const p = g.player;
    const i = Number(d.i);
    const gift = g.gifts[i];
    if (!gift || p.love < gift.min) return;
    g.gifts.splice(i, 1);
    playSfx('love');
    const before = p.love;
    p.love = Math.max(0, Math.min(Math.min(p.love + gift.love, p.image), 100));
    addTime(10);
    const capped = before + gift.love > p.image + 0.01;
    dialog(gift.ico, 'Sie freut sich', 'Betty Botterbloom',
      `«${esc(g.rng.pick(['Oh! Das wäre doch nicht nötig gewesen.', 'Sie sind ja verrückt.', 'Wie aufmerksam.']))}»` +
      `<br><br>Zuneigung: ${Math.round(before)} → <b class="heart">${Math.round(p.love)}</b>` +
      (capped
        ? `<br><span class="warn">Ihre Zuneigung ist durch dein Image gedeckelt (${Math.round(p.image)}). Mehr Quote, mehr Herz.</span>`
        : ''),
      [{ t: 'Gern geschehen', cls: 'btn love' }]);
  },

  buygift(d) {
    const g = G();
    const p = g.player;
    const gift = GIFTS.find((x) => x.id === d.g);
    if (!gift || p.money < gift.cost) return;
    p.money -= gift.cost;
    g.stats.costs += gift.cost;
    g.gifts.push(gift);
    addTime(4);
    toast('good', 'Eingepackt', `${gift.name} liegt in deiner Tasche.`);
  },

  sign(d) {
    const g = G();
    g.terrorSign = d.t as typeof g.terrorSign;
    toast('warn', 'Türschild geändert',
      d.t === 'self' ? 'Alles bleibt, wie es ist.' : 'Die Beschriftung zeigt jetzt woandershin.');
  },
};

/** Wird von der Ansicht aufgerufen, sobald ein data-act angeklickt wurde. */
export function runAction(name: string, data: Data): void {
  const fn = ACTIONS[name];
  if (!fn) return;
  fn(data);
  markDirty();
}

export { licMeta };
