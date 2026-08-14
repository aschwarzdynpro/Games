/**
 * Aktionen des Spielers.
 *
 * Alles, was der Spieler anklickt, landet hier. Der Kern wird nur über seine
 * Funktionen verändert — kein Rendering, keine Timer.
 */
import { icon } from './icons';
import {
  SLOTS, GENRES, GIFTS, GROUPS, MAX_CONTRACTS, MAX_CREDIT, MAX_TRANSMITTERS,
  PACKAGE_COST, PRICE_SATELLITE, PRICE_TRANSMITTER, PRODUCTIONS, STARS, STUDIO_RENT,
  buyLicence, clearProgramme, closeAuction, copyLicence, esc, estimateBlock, getDay,
  lengthLabel, money, moneyShort, nextUid, placeProgramme, removeFromSchedules,
  slotHour, slotLabel, trendOf, viewers,
} from '../core';
import type { Channel, GenreId, Licence, RessortId } from '../core';
import { G, S, markDirty } from './session';
import { chooser, dialog, toast } from './overlay';
import { playSfx } from './sfx';
import { addTime, leaveRoom } from './loop';
import { bar, fskTag, licMeta } from './rooms';
import { registerDrag } from './drag';

type Data = Record<string, string | undefined>;

/**
 * Während ein Auswahldialog offen ist, läuft die Uhr weiter — der Block kann
 * also längst gesendet sein, wenn die Wahl zurückkommt.
 */
function slotEditable(day: number, b: number): boolean {
  const g = G();
  if (day < g.day) { toast('warn', 'Zu spät', 'Der Tag ist vorbei.'); return false; }
  if (getDay(g.player, day)[b]!.aired) {
    toast('warn', 'Zu spät', `${slotLabel(b)} läuft bereits.`);
    return false;
  }
  return true;
}

/** Wie oft dieses Band in den kommenden Sendeplänen steht. */
function countScheduled(p: Channel, uid: number): number {
  let n = 0;
  for (const day of Object.keys(p.sched)) {
    for (const slot of p.sched[Number(day)] ?? []) {
      if (slot.start && slot.prog?.uid === uid) n++;
    }
  }
  return n;
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
    const hour = slotHour(b);
    [...g.player.licences]
      .sort((a, x) => estimateBlock(g, day, b, x).total - estimateBlock(g, day, b, a).total)
      .forEach((l) => {
        const passt = b + l.lenSlots <= SLOTS;
        const est = estimateBlock(g, day, b, l);
        const gd = GENRES[l.genre];
        const warn = l.fsk >= 18 && hour < 22 && hour >= 6
          ? ' <span class="tag b">zu früh!</span>' : '';
        const zuLang = passt ? '' : ' <span class="tag b">passt nicht mehr</span>';
        const used = slots.some((s, i) => i !== b && s.prog?.uid === l.uid)
          ? ' <span class="tag w">läuft heute schon</span>' : '';
        items.push({
          label: `${esc(l.title)} ${fskTag(l.fsk)}${warn}${zuLang}${used}`,
          sub: `${icon(gd.ico)} ${gd.name} · ${lengthLabel(l.lenSlots)} · ` +
            `Frische ${Math.round(l.fresh * 100)}% · Zuschauerwert ${l.qual}`,
          right: `<b>${viewers(est.total)}</b>`,
          value: { lic: l },
        });
      });

    chooser(
      `${slotLabel(b)} — Sendung wählen`, 'Sendeplan', 'gen-serie',
      items,
      (v) => {
        if (!slotEditable(day, b)) return;
        if (v.clear) {
          const cur = slots[b]!.prog;
          if (cur) clearProgramme(slots, cur.uid);
        } else if (v.lic) {
          if (b + v.lic.lenSlots > SLOTS) {
            toast('warn', 'Zu lang',
              `${lengthLabel(v.lic.lenSlots)} passen ab ${slotLabel(b)} nicht mehr in den Abend.`);
            return;
          }
          const weg = placeProgramme(slots, b, v.lic).filter((w) => w.uid !== v.lic!.uid);
          if (weg.length) {
            toast('info', 'Umgeplant', `${weg.map((w) => `«${w.title}»`).join(', ')} zurück in den Ordner.`);
          }
          playSfx('buy');
        }
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
        label: `${icon('flr-werbe')} ${esc(c.brand)} ` +
          (ok ? '<span class="tag g">Quote reicht</span>' : '<span class="tag b">zu wenig</span>'),
        sub: `Braucht ${viewers(c.minAud)}${c.group ? ` ${GROUPS[c.gi]!.name}` : ''} · ` +
          `Prognose ${viewers(reached)} · ${c.done}/${c.spots} Spots`,
        right: `<b class="ok">${moneyShort(c.perSpot)}</b>`,
        value: { ad: c.id, brand: c.brand },
      });
    });
    slots.forEach((s, i) => {
      if (i <= b || !s.prog || !s.start) return;
      if (items.some((x) => x.value.trail?.uid === s.prog!.uid)) return;
      items.push({
        label: `${icon('ui-trailer')} Trailer: ${esc(s.prog.title)}`,
        sub: `Bewirbt die Sendung um ${slotLabel(i)} (+13% Zuschauer)`,
        value: { trail: s.prog },
      });
    });

    chooser(
      `${slotLabel(b)} — Werbeblock`, 'Sendeplan', 'flr-werbe',
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

    dialog('ui-diagramm', `${slotLabel(b)} — ${s.prog ? s.prog.title : 'Testbild'}`,
      'Zuschauerforschung',
      `<b>${viewers(s.res.total)}</b> Zuschauer · Marktanteil ` +
      `${((s.res.total / (all || 1)) * 100).toFixed(1).replace('.', ',')}%<br><br>` +
      GROUPS.map((grp, i) =>
        `<div class="grouprow"><div class="gn">${icon(grp.ico)} ${esc(grp.name)}</div>` +
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
    for (let b = 0; b < SLOTS; b++) {
      const from = src[b]!;
      if (!from.prog || !from.start) continue;
      if (dst[b]!.aired || dst[b]!.prog) continue;
      if (!g.player.licences.some((l) => l.uid === from.prog!.uid)) continue;
      if (b + from.prog.lenSlots > SLOTS) continue;
      if (placeProgramme(dst, b, from.prog).length || dst[b]!.prog) n++;
    }
    toast(n ? 'good' : 'warn', 'Plan übernommen', `${n} Sendungen aus dem Vortag übernommen.`);
  },

  copynext(d) {
    const g = G();
    const day = Number(d.day);
    const src = getDay(g.player, day);
    const dst = getDay(g.player, day + 1);
    let n = 0;
    for (let b = 0; b < SLOTS; b++) {
      const from = src[b]!;
      if (!from.prog || !from.start || dst[b]!.aired) continue;
      placeProgramme(dst, b, from.prog);
      n++;
    }
    S().viewDay = Math.max(0, Math.min(3, day + 1 - g.day));
    toast('good', 'Kopiert', `${n} Sendungen auf den Folgetag übertragen.`);
  },

  autofill(d) {
    const g = G();
    const day = Number(d.day);
    const slots = getDay(g.player, day);
    const used = new Set<number>();
    slots.forEach((s) => { if (s.prog) used.add(s.prog.uid); });
    let n = 0;
    let at = 0;
    while (at < SLOTS) {
      const s = slots[at]!;
      if (s.aired || s.prog) { at++; continue; }
      const avail = g.player.licences.filter((l) => !used.has(l.uid) && at + l.lenSlots <= SLOTS);
      if (!avail.length) { at++; continue; }
      avail.sort((x, y) => estimateBlock(g, day, at, y).total - estimateBlock(g, day, at, x).total);
      const pick = avail[0]!;
      placeProgramme(slots, at, pick);
      used.add(pick.uid);
      at += pick.lenSlots;
      n++;
    }
    toast(n ? 'good' : 'warn', 'Lücken gefüllt', `${n} Sendungen automatisch eingeplant — prüf sie ruhig nach.`);
  },

  clearday(d) {
    const day = Number(d.day);
    getDay(G().player, day).forEach((s) => {
      if (!s.aired) { s.prog = null; s.start = false; s.len = 0; s.ad = null; s.trailer = null; }
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

  /** Schachtel aus dem Regal ziehen und ansehen. */
  inspect(d) {
    const g = G();
    const m = g.market.find((x) => x.uid === Number(d.u));
    if (!m) return;
    const gd = GENRES[m.genre];
    const afford = g.player.money >= m.price;
    const tv = Math.round(trendOf(g, m.genre) * 100);
    const staffel = m.isSerie
      ? `<tr><td>Staffel</td><td class="right num">${m.eps} Folgen à ${lengthLabel(m.lenSlots)}</td></tr>` +
        `<tr><td>Sendezeit gesamt</td><td class="right num">${(m.eps * m.lenSlots) / 2} Stunden</td></tr>`
      : '';

    dialog(gd.ico, m.title, 'Filmagentur',
      '<table class="tbl">' +
      `<tr><td>Genre</td><td class="right">${gd.name}${m.isSerie ? ' · Serie' : ''}</td></tr>` +
      `<tr><td>Jahr</td><td class="right num">${m.year}</td></tr>` +
      `<tr><td>Sendelänge</td><td class="right num"><b>${lengthLabel(m.lenSlots)}</b>` +
      `${m.isSerie ? ' je Folge' : ''}</td></tr>` +
      staffel +
      `<tr><td>Altersfreigabe</td><td class="right">${m.fsk === 0 ? 'ohne' : `ab ${m.fsk}`}</td></tr>` +
      `<tr><td>Zuschauerwert</td><td class="right num">${m.qual}</td></tr>` +
      `<tr><td>Kritikerurteil</td><td class="right num">${m.critic}</td></tr>` +
      `<tr><td>Kinokasse</td><td class="right num">${m.box}</td></tr>` +
      `<tr><td>Genre-Konjunktur</td><td class="right num ${tv > 106 ? 'ok' : tv < 94 ? 'bad' : ''}">${tv}%</td></tr>` +
      `<tr><td>Preis</td><td class="right num ${afford ? '' : 'bad'}"><b>${money(m.price)}</b></td></tr>` +
      '</table>',
      [
        {
          t: afford ? `Kaufen · ${moneyShort(m.price)}` : 'Zu teuer',
          cls: afford ? 'btn' : 'btn ghost',
          fn: afford ? () => {
            buyLicence(g, g.player, m);
            addTime(3);
            playSfx('buy');
            toast('good', 'Gekauft', `«${m.title}» liegt im Archiv.`);
            markDirty();
          } : undefined,
        },
        { t: 'Zurückstellen', cls: 'btn ghost' },
      ]);
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
    dialog('ui-karton', 'Paket im Haus', 'Filmagentur',
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

  /** Kennzahlen eines eigenen Bandes — der Gegenstück-Dialog zur Schachtel im Verleih. */
  bandinfo(d) {
    const g = G();
    const p = g.player;
    const l = p.licences.find((x) => x.uid === Number(d.u));
    if (!l) return;
    const gd = GENRES[l.genre];
    const sum = sellPrice(l);
    const tv = Math.round(trendOf(g, l.genre) * 100);
    const geplant = countScheduled(p, l.uid);

    dialog(gd.ico, l.title, 'Archiv',
      '<table class="tbl">' +
      `<tr><td>Genre</td><td class="right">${gd.name}${l.isSerie ? ' · Serie' : ''}</td></tr>` +
      `<tr><td>Sendelänge</td><td class="right num"><b>${lengthLabel(l.lenSlots)}</b>` +
      `${l.isSerie ? ' je Folge' : ''}</td></tr>` +
      (l.isSerie ? `<tr><td>Folge</td><td class="right num">${l.ep}/${l.eps}</td></tr>` : '') +
      `<tr><td>Altersfreigabe</td><td class="right">${l.fsk === 0 ? 'ohne' : `ab ${l.fsk}`}</td></tr>` +
      `<tr><td>Zuschauerwert</td><td class="right num">${l.qual}</td></tr>` +
      `<tr><td>Frische</td><td class="right num ${l.fresh < 0.4 ? 'bad' : l.fresh >= 0.7 ? 'ok' : 'warn'}">` +
      `${Math.round(l.fresh * 100)}%</td></tr>` +
      `<tr><td>Bisher gesendet</td><td class="right num">${l.aired}×</td></tr>` +
      `<tr><td>Genre-Konjunktur</td><td class="right num ${tv > 106 ? 'ok' : tv < 94 ? 'bad' : ''}">${tv}%</td></tr>` +
      (geplant ? `<tr><td>Eingeplant</td><td class="right num warn">${geplant}× im Sendeplan</td></tr>` : '') +
      `<tr><td>Verleih zahlt</td><td class="right num"><b>${money(sum)}</b></td></tr>` +
      '</table>',
      [
        { t: `Verkaufen · ${moneyShort(sum)}`, cls: 'btn ghost', fn: () => runAction('sell', { u: String(l.uid) }) },
        { t: 'Zurück ins Regal', cls: 'btn' },
      ]);
  },

  sell(d) {
    const g = G();
    const p = g.player;
    const l = p.licences.find((x) => x.uid === Number(d.u));
    if (!l) return;
    const sum = sellPrice(l);
    dialog('flr-archiv', 'Lizenz verkaufen', 'Archiv',
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
    dialog('ui-blatt', 'Vertrag lösen', 'Produktionsstudio',
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
    dialog('flr-betty', 'Betty Botterbloom', 'Kulturredaktion',
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

/* ─────────── Ziehen in den Räumen ─────────── */

/**
 * Die beiden neuen Räume ziehen auf dieselben Aktionen, die auch der Klickweg
 * benutzt. Das ist Absicht: Ein Zug ist eine bequemere Art, denselben Knopf zu
 * drücken — nie ein zweiter Weg mit eigener Logik, die auseinanderlaufen kann.
 */
registerDrag('kunde', {
  accepts: (target) => target.dataset.drop === 'koffer',
  drop: (target, card) => {
    if (target?.dataset.drop !== 'koffer') return;
    runAction('takead', { i: card.dataset.ad });
  },
});

registerDrag('skript', {
  accepts: (target) => target.dataset.drop === 'buehne',
  drop: (target, card) => {
    if (target?.dataset.drop !== 'buehne') return;
    runAction('produce', { p: card.dataset.p });
  },
});

/* An der Bank geht das Geld in beide Richtungen über den Tresen. */
registerDrag('schein', {
  accepts: (target) => target.dataset.drop === 'tasche',
  drop: (target, card) => {
    if (target?.dataset.drop !== 'tasche') return;
    runAction('loan', { v: card.dataset.v });
  },
});

registerDrag('tilgung', {
  accepts: (target) => target.dataset.drop === 'schalter',
  drop: (target, card) => {
    if (target?.dataset.drop !== 'schalter') return;
    runAction('repay', { v: card.dataset.v });
  },
});

registerDrag('ware', {
  accepts: (target) => target.dataset.drop === 'beutel',
  drop: (target, card) => {
    if (target?.dataset.drop !== 'beutel') return;
    runAction('buygift', { g: card.dataset.g });
  },
});

registerDrag('band', {
  accepts: (target) => target.dataset.drop === 'wagen',
  drop: (target, card) => {
    if (target?.dataset.drop !== 'wagen') return;
    runAction('sell', { u: card.dataset.lic });
  },
});

export { licMeta };
