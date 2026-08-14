/**
 * Raumansichten.
 *
 * Jede Funktion liefert HTML; Klickziele tragen data-act und werden zentral
 * in actions.ts aufgelöst. In Etappe 3 wandern diese Räume nach und nach in
 * gezeichnete SVG-Szenen — die Datenzugriffe hier bleiben dabei dieselben.
 */
import {
  SLOTS, DIFFS, FLOORS, GENRES, GIFTS, GROUPS, MAX_CONTRACTS, MAX_CREDIT,
  MAX_TRANSMITTERS, NEWS_COST, NEWS_QUAL, PACKAGE_COST, POP, PRICE_SATELLITE,
  PRICE_TRANSMITTER, PRODUCTIONS, RESSORTS, STARS, STUDIO_RENT, WEEKDAYS,
  dailyCosts, esc, estimateBlock, getDay, lengthLabel, money, moneyShort,
  newsAttraction, pct, reachOf, slotLabel, trendOf, viewers,
} from '../core';
import type { Channel, GenreId, Licence, RoomId } from '../core';
import { icon } from './icons';
import { G, S } from './session';
import { renderBoard } from './board';

/* ─────────── Bausteine ─────────── */

export function head(ico: string, title: string, sub: string): string {
  return `<div class="roomhead"><div class="ico">${icon(ico, { cls: 'big' })}</div>` +
    `<div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>` +
    '<button class="backbtn" data-act="back">← Flur</button></div>';
}

export function bar(v: number, max = 100, color = 'var(--acc)'): string {
  const w = Math.max(0, Math.min(100, (v / (max || 100)) * 100));
  return `<div class="bar"><i style="width:${w}%;background:${color}"></i></div>`;
}

export function fskTag(f: number): string {
  if (f >= 18) return '<span class="tag b">FSK 18</span>';
  if (f >= 16) return '<span class="tag w">FSK 16</span>';
  if (f >= 12) return '<span class="tag">FSK 12</span>';
  if (f >= 6) return '<span class="tag">FSK 6</span>';
  return '<span class="tag g">o. A.</span>';
}

export function licMeta(l: Licence): string {
  const g = GENRES[l.genre];
  return `${icon(g.ico)} ${g.name} · ${l.year} · ${lengthLabel(l.lenSlots)}` +
    (l.isSerie ? ` je Folge · Staffel mit ${l.eps} Folgen (aktuell ${l.ep})` : '');
}

function sellPrice(l: Licence): number {
  return Math.round((l.price * 0.42 * (0.4 + 0.6 * l.fresh)) / 1000) * 1000;
}

/* ─────────── Dein Büro ─────────── */

function office(): string {
  const g = G();
  const s = S();
  const p = g.player;
  const day = g.day + s.viewDay;
  const slots = getDay(p, day);

  let h = '<div class="room">' + head('flr-office', 'Dein Büro', 'Sendeplan, Werbekoffer und die nackte Bilanz');

  const todaySum = p.todayAud.reduce((a, b) => a + b, 0);
  const yesterSum = p.lastAud.reduce((a, b) => a + b, 0);
  h += '<div class="grid3" style="margin-bottom:10px">' +
    `<div class="kpi"><div class="k">Zuschauer heute</div><div class="v">${viewers(todaySum)}</div>` +
    `<div class="d">gestern ${viewers(yesterSum)}</div></div>` +
    `<div class="kpi"><div class="k">Marktanteil</div><div class="v acc">${p.image.toFixed(1).replace('.', ',')}%</div>` +
    `<div class="d">${esc(g.ch[1]!.name)} ${g.ch[1]!.image.toFixed(0)}% · ${esc(g.ch[2]!.name)} ${g.ch[2]!.image.toFixed(0)}%</div></div>` +
    `<div class="kpi"><div class="k">Konto</div><div class="v ${p.money < 0 ? 'bad' : 'ok'}">${moneyShort(p.money)}</div>` +
    `<div class="d">Fixkosten ${moneyShort(dailyCosts(p))}/Tag</div></div></div>`;

  h += '<div class="card"><div class="btnrow" style="margin-bottom:9px">';
  for (let i = 0; i < 4; i++) {
    const wd = WEEKDAYS[(g.weekday + i) % 7]!;
    h += `<button class="btn sm ${s.viewDay === i ? '' : 'ghost'}" data-act="setday" data-d="${i}">` +
      `${i === 0 ? 'Heute' : i === 1 ? 'Morgen' : wd}</button>`;
  }
  h += '<span class="dim" style="font-size:11px;margin-left:auto">' +
    'Sendeschema: 4 Min Nachrichten · Film · 5 Min Werbung</span></div>';

  const openSlots = slots.filter((x) => !x.prog && !x.aired).length;
  h += '<div class="btnrow" style="margin-bottom:9px">' +
    `<button class="btn sm ghost" data-act="copyprev" data-day="${day}" ` +
    `${getDay(p, day - 1).some((x) => x.prog) ? '' : 'disabled'}>⟲ Plan von gestern übernehmen</button>` +
    `<button class="btn sm ghost" data-act="copynext" data-day="${day}" ` +
    `${slots.some((x) => x.prog) ? '' : 'disabled'}>→ Auf morgen kopieren</button>` +
    `<button class="btn sm ghost" data-act="autofill" data-day="${day}" ` +
    `${openSlots && p.licences.length ? '' : 'disabled'}>✦ Lücken füllen (${openSlots})</button>` +
    `<button class="btn sm ghost" data-act="clearday" data-day="${day}" ` +
    `${slots.some((x) => x.prog && !x.aired) ? '' : 'disabled'}>✕ Leeren</button></div>`;

  const na = newsAttraction(g, p);
  const naSum = na.reduce((a, b) => a + b, 0) / GROUPS.length;
  h += `<div class="newsband" style="margin-bottom:7px">${icon('flr-news')} <b>Nachrichten</b> ` +
    (p.newsShow.length
      ? p.newsShow.map((n) => `${esc(n.text.slice(0, 34))}…`).join(' · ')
      : '<span class="bad">keine Sendung zusammengestellt</span>') +
    `<span style="margin-left:auto">Wirkung ${(naSum * 100).toFixed(0)}</span></div>`;

  h += renderBoard(day);
  h += '<div class="hint">Karten aus dem Programmordner auf einen Sendeplatz ziehen — oder den Platz ' +
    'anklicken und aus der Liste wählen. Eine Programmkarte auf einem <b>Werbeplatz</b> wird zum Trailer ' +
    'und zieht später Zuschauer. Filme ab 18 vor 22 Uhr kosten Quote — und rufen den Gerichtsvollzieher.</div></div>';

  // Werbekoffer
  h += `<div class="card"><h3>Werbekoffer (${p.contracts.length}/${MAX_CONTRACTS})</h3>`;
  if (!p.contracts.length) {
    h += '<div class="empty-note">Kein Vertrag. Ohne Werbung kein Geld — ab in die Werbeagentur.</div>';
  } else {
    h += '<table class="tbl"><tr><th>Kunde</th><th>Ziel</th><th class="right">Spots</th>' +
      '<th class="right">Frist</th><th class="right">pro Spot</th><th class="right">Strafe</th></tr>';
    p.contracts.forEach((c) => {
      const left = c.deadline - g.day;
      h += `<tr><td><b>${esc(c.brand)}</b><br><span class="dim" style="font-size:10.5px">${esc(c.product)}</span></td>` +
        `<td>${viewers(c.minAud)}${c.group ? ` <span class="tag p">${GROUPS[c.gi]!.name}</span>` : ''}</td>` +
        `<td class="right num">${c.done}/${c.spots}</td>` +
        `<td class="right num ${left <= 1 ? 'bad' : left <= 2 ? 'warn' : ''}">${left <= 0 ? 'heute!' : `${left} T`}</td>` +
        `<td class="right num ok">${moneyShort(c.perSpot)}</td>` +
        `<td class="right num bad">${moneyShort(c.penalty)}</td></tr>`;
    });
    h += '</table>';
  }
  h += '</div>';

  // Wer hat zugesehen
  const gsum = new Array(GROUPS.length).fill(0);
  let gday: number | null = null;
  let gtotal = 0;
  for (const d of [g.day, g.day - 1]) {
    if (gday !== null) break;
    const sl = p.sched[d];
    if (sl?.some((x) => x.aired && x.res)) {
      sl.forEach((x) => {
        if (x.aired && x.res) x.res.groups.forEach((v, i) => { gsum[i] += v; gtotal += v; });
      });
      gday = d;
    }
  }
  if (gtotal > 0) {
    const gmax = Math.max(...gsum);
    h += `<div class="card"><h3>Wer hat zugesehen · ${gday === g.day ? 'heute' : 'gestern'}</h3>`;
    GROUPS.forEach((grp, i) => {
      h += `<div class="grouprow"><div class="gn">${icon(grp.ico)} ${esc(grp.name)}</div>` +
        `<div class="gb">${bar(gsum[i], gmax)}</div>` +
        `<div class="gv">${viewers(gsum[i])}</div>` +
        `<div class="gv dim">${pct(gsum[i] / gtotal, 0)}</div></div>`;
    });
    h += '<div class="hint">Werbeverträge mit Zielgruppe zahlen nur, wenn genau diese Gruppe im Block ' +
      'erreicht wird. Die Verteilung hängt am Genre und an der Uhrzeit.</div></div>';
  }

  // Genre-Konjunktur
  const trends = (Object.keys(GENRES) as GenreId[])
    .map((k) => ({ g: k, v: trendOf(g, k) }))
    .sort((a, b) => b.v - a.v);
  h += '<div class="card"><h3>Genre-Konjunktur</h3><div class="btnrow">' +
    trends.slice(0, 4).map((t) =>
      `<span class="tag g">${icon(GENRES[t.g].ico)} ${GENRES[t.g].name} ` +
      `<span class="trend up">▲${Math.round((t.v - 1) * 100)}</span></span>`).join('') +
    trends.slice(-3).map((t) =>
      `<span class="tag b">${icon(GENRES[t.g].ico)} ${GENRES[t.g].name} ` +
      `<span class="trend dn">▼${Math.round((1 - t.v) * 100)}</span></span>`).join('') +
    '</div><div class="hint">Der Publikumsgeschmack verschiebt sich täglich. Ein Genre im Aufwind bringt ' +
    'bis zu einem Drittel mehr Zuschauer — günstig einkaufen, wenn es unten ist.</div></div>';

  // Quotenverlauf
  h += '<div class="card"><h3>Quotenverlauf gestern</h3><div class="chart">';
  const maxA = Math.max(1, ...g.ch.map((c) => Math.max(...c.lastAud)));
  const colors = ['var(--acc)', 'var(--warn)', 'var(--bad)'];
  for (let b = 0; b < SLOTS; b++) {
    h += '<div class="col">';
    g.ch.forEach((c, ci) => {
      const v = (c.lastAud[b]! / maxA) * 68;
      h += `<i style="height:${Math.max(1, v)}px;background:${colors[ci]}"></i>`;
    });
    h += `<div class="lab">${b % 2 === 0 ? slotLabel(b).slice(0, 2) : ''}</div></div>`;
  }
  h += '</div><div class="legend">' +
    g.ch.map((c, i) => `<span><i style="background:${colors[i]}"></i>${esc(c.name)}</span>`).join('') +
    '</div></div>';

  if (g.log.length) {
    h += '<div class="card"><h3>Sendeprotokoll</h3><table class="tbl">' +
      '<tr><th>Tag</th><th>Zeit</th><th>Sendung</th><th class="right">Zuschauer</th><th class="right">Anteil</th></tr>' +
      g.log.slice(0, 14).map((e) =>
        `<tr><td class="num dim">${e.day}</td>` +
        `<td class="num">${slotLabel(e.block)}</td>` +
        `<td>${esc(e.title)}</td><td class="right num">${viewers(e.aud)}</td>` +
        `<td class="right num ${e.share > 0.4 ? 'ok' : e.share < 0.2 ? 'bad' : ''}">${pct(e.share, 0)}</td></tr>`)
        .join('') + '</table></div>';
  }

  return h + '</div>';
}

/* ─────────── Filmagentur ─────────── */

/** Farbe je Genre, gleich wie auf der Sendetafel. */
const BOX_HUE: Record<string, number> = {
  action: 6, komoed: 42, drama: 265, horror: 300, scifi: 195, krimi: 220,
  liebe: 335, western: 28, doku: 150, trick: 55, erotik: 320, sport: 130,
  musik: 280, show: 48, quiz: 170, talk: 205, kultur: 240, serie: 185,
};

/**
 * Eine Schachtel im Regal. Ihre Breite entspricht der Sendelänge — ein
 * Dreistünder ist buchstäblich ein dicker Schuber, ein Magazin ein schmaler
 * Rücken. Damit sieht man die wichtigste Kennzahl, bevor man sie liest.
 */
function filmBox(g: ReturnType<typeof G>, m: Licence, owned: boolean): string {
  const gd = GENRES[m.genre];
  const w = 30 + m.lenSlots * 26;
  const wide = m.lenSlots >= 3;
  const afford = g.player.money >= m.price;
  const tv = trendOf(g, m.genre);
  const trend = tv > 1.06 ? '▲' : tv < 0.94 ? '▼' : '';

  const body = wide
    ? '<div class="box-wide">' +
      `<span class="box-title">${esc(m.title)}</span>` +
      `<span class="box-sub">${icon(gd.ico)} ${gd.name} · ${m.year}${trend}</span></div>`
    : `<div class="box-spine">${esc(m.title)}</div>`;

  return `<div class="boxcase${owned ? ' owned' : ''}${afford && !owned ? ' cheap' : ''}" ` +
    `style="--h:${BOX_HUE[m.genre] ?? 210};width:${w}px" ` +
    `${owned ? '' : `data-act="inspect" data-u="${m.uid}" role="button" tabindex="0"`} ` +
    `title="${esc(m.title)} — ${gd.name}, ${lengthLabel(m.lenSlots)}, ${money(m.price)}">` +
    body +
    '<div class="box-foot">' +
    `<span class="box-len">${lengthLabel(m.lenSlots)}</span>` +
    (wide ? `<span class="box-price${afford ? '' : ' bad'}">${moneyShort(m.price)}</span>` : '') +
    '</div></div>';
}

function film(): string {
  const g = G();
  const s = S();
  const p = g.player;
  const owned = new Set(p.licences.map((l) => l.title));
  let h = '<div class="room">' + head('flr-film', 'Filmagentur', 'Regalwand — die Breite einer Schachtel ist ihre Sendelänge');

  if (g.auction && !g.auction.closed) {
    const a = g.auction;
    h += `<div class="card" style="border-color:var(--gold)"><h3>${icon('ui-hammer')} Auktion läuft</h3>` +
      '<div class="item" style="background:transparent;border:none;padding:0">' +
      `<div style="flex:1"><div class="t" style="font-size:14px">${esc(a.title)}</div>` +
      `<div class="m">${licMeta(a)} · ${fskTag(a.fsk)}</div>` +
      `<div class="statline" style="margin-top:5px">Zuschauerwert ${bar(a.qual)} ${a.qual} &nbsp; ` +
      `Kritik ${bar(a.critic, 100, 'var(--acc2)')} ${a.critic}</div></div>` +
      `<div class="r"><div style="font-size:18px;font-weight:800">${money(a.bid)}</div>` +
      `<div class="m">${a.leader ? `Höchstbietend: ${esc(a.leader)}` : 'noch kein Gebot'}</div></div></div>` +
      '<div class="btnrow" style="margin-top:9px">' +
      `<button class="btn gold" data-act="bid">Bieten: ${money(Math.round((a.bid * 1.12) / 1000) * 1000)}</button>` +
      '<button class="btn ghost" data-act="passauction">Verzichten</button>' +
      `<span class="dim" style="font-size:11px">Richtpreis ${money(a.guide)} · Zuschlag zum Sendeschluss</span></div>` +
      '<div class="hint">Die Konkurrenz steigert stündlich mit — wer wartet, zahlt drauf oder geht leer aus.</div></div>';
  }

  if (!g.packageTaken) {
    h += `<div class="card" style="border-color:var(--acc2)"><h3>${icon('ui-karton')} Exklusivpaket</h3>` +
      '<p class="dim" style="font-size:12.5px;margin-bottom:9px">Fünf Spitzentitel aus dem Verleihkatalog, ' +
      'gebündelt und ohne Auktion. Der Preis ist unverschämt — aber die Konkurrenz kommt an keinen davon heran.</p>' +
      `<div class="btnrow"><button class="btn" data-act="package" ${p.money < PACKAGE_COST ? 'disabled' : ''}>` +
      `Paket kaufen · ${money(PACKAGE_COST)}</button>` +
      '<span class="dim" style="font-size:11px">5 Titel der Güteklassen 4–5</span></div></div>';
  }

  const present = ['alle', ...new Set(g.market.map((m) => m.genre))];
  h += '<div class="card"><div class="btnrow" style="margin-bottom:10px">' +
    present.map((gen) =>
      `<button class="btn sm ${s.filmFilter === gen ? '' : 'ghost'}" data-act="filmfilter" data-g="${gen}">` +
      `${gen === 'alle' ? 'Alle' : `${icon(GENRES[gen as GenreId].ico)} ${GENRES[gen as GenreId].name}`}</button>`).join('') +
    '</div>';

  const list = g.market.filter((m) => s.filmFilter === 'alle' || m.genre === s.filmFilter);
  // Nach Länge in Regalbretter sortieren: kurze Magazine oben, Abendfüller unten
  const regale: { label: string; test: (l: Licence) => boolean }[] = [
    { label: 'Magazine & Kurzes · bis 1 Stunde', test: (l) => l.lenSlots <= 2 },
    { label: 'Abendprogramm · 1½ bis 2 Stunden', test: (l) => l.lenSlots === 3 || l.lenSlots === 4 },
    { label: 'Überlänge · ab 2½ Stunden', test: (l) => l.lenSlots >= 5 },
  ];

  h += '<div class="wall">';
  regale.forEach((r) => {
    const items = list.filter(r.test);
    if (!items.length) return;
    h += '<div class="wall-shelf">' +
      `<div class="wall-label">${esc(r.label)} · ${items.length} Titel</div>` +
      '<div class="wall-row">' +
      items.map((m) => filmBox(g, m, owned.has(m.title))).join('') +
      '</div><div class="wall-board"></div></div>';
  });
  if (!list.length) h += '<div class="wall-empty">Das Regal ist leer.</div>';
  h += '</div></div>';

  h += '<div class="hint">Ein Klick auf eine Schachtel zeigt die Kennzahlen und kauft sie. Sendezeit ist die ' +
    'eigentliche Ware: Ein Dreistünder füllt einen halben Abend, ein Magazin nur eine halbe Stunde — ' +
    'entsprechend fällt der Preis aus.</div></div>';
  return h;
}

/* ─────────── Werbeagentur ─────────── */

function werbe(): string {
  const g = G();
  const p = g.player;
  const full = p.contracts.length >= MAX_CONTRACTS;
  let h = '<div class="room">' + head('flr-werbe', 'Werbeagentur', 'Verträge mit Mindestquote, Frist und Konventionalstrafe');

  h += `<div class="card"><h3>Dein Koffer (${p.contracts.length}/${MAX_CONTRACTS})</h3>`;
  if (!p.contracts.length) h += '<div class="empty-note">Leer.</div>';
  else h += '<div class="list">' + p.contracts.map((c) =>
    `<div class="item"><div style="flex:1"><div class="t">${esc(c.brand)}</div>` +
    `<div class="m">${esc(c.product)} · ${c.done}/${c.spots} Spots · noch ${c.deadline - g.day} Tage</div></div>` +
    `<div class="r"><div class="ok" style="font-weight:700">${moneyShort(c.perSpot)}</div>` +
    `<div class="m bad">Strafe ${moneyShort(c.penalty)}</div></div></div>`).join('') + '</div>';
  h += '</div>';

  const est = estimateBlock(g, g.day, 3).total;
  h += '<div class="card"><h3>Angebote <span class="dim" style="text-transform:none;letter-spacing:0">' +
    `· deine Primetime bringt derzeit rund ${viewers(est)}</span></h3><div class="list">`;
  g.adMarket.forEach((c) => {
    const reachable = c.group ? est * GROUPS[c.gi]!.share * 1.1 : est;
    const risky = reachable < c.minAud;
    h += '<div class="item"><div style="flex:1;min-width:0">' +
      `<div class="t">${esc(c.brand)} <span class="tag">${esc(c.product)}</span>` +
      (c.group ? ` <span class="tag p">${icon(GROUPS[c.gi]!.ico)} ${GROUPS[c.gi]!.name}</span>` : '') + '</div>' +
      `<div class="m">Mindestens <b class="${risky ? 'warn' : 'ok'}">${viewers(c.minAud)}</b> ` +
      `${c.group ? GROUPS[c.gi]!.name : 'Zuschauer'} · ${c.spots} Spots in ${c.days} Tagen</div></div>` +
      `<div class="r"><div class="ok" style="font-weight:800">${moneyShort(c.perSpot)}<span class="dim">/Spot</span></div>` +
      `<div class="m bad">Strafe ${moneyShort(c.penalty)}</div>` +
      `<button class="btn sm" style="margin-top:4px" data-act="takead" data-i="${c.id}" ${full ? 'disabled' : ''}>Annehmen</button>` +
      '</div></div>';
  });
  h += '</div></div>';
  h += '<div class="hint">Ein Spot zählt nur, wenn der Sendeblock die Mindestquote wirklich erreicht. ' +
    'Verfällt der Vertrag, wird die volle Strafe fällig.</div></div>';
  return h;
}

/* ─────────── Nachrichtenstudio ─────────── */

function news(): string {
  const g = G();
  const p = g.player;
  let h = '<div class="room">' + head('flr-news', 'Nachrichtenstudio', 'Redaktionstisch — Meldungen auf den Teleprompter ziehen');

  h += '<div class="desk">';

  // Teleprompter: die drei Meldungen der Sendung
  h += '<div class="prompter"><div class="prompter-head">' +
    '<span class="live">AUF SENDUNG</span> Teleprompter · 4 Minuten zu jeder vollen Stunde' +
    '</div><div class="prompter-slots">';
  for (let i = 0; i < 3; i++) {
    const n = p.newsShow[i];
    if (n) {
      const r = RESSORTS.find((x) => x.id === n.res)!;
      const age = g.day - n.day;
      h += `<div class="newsslot filled" data-drop="news" data-i="${i}">` +
        `<div class="no">${i + 1}</div>` +
        `<div class="txt">${icon(r.ico)} ${esc(n.text)}` +
        `<small>${esc(r.name)} · ${age === 0 ? 'heute' : `${age} Tage alt`} · ` +
        `Nachrichtenwert ${Math.round(n.weight * 100)}</small></div>` +
        `<button class="btn sm ghost" data-act="unnews" data-i="${n.id}" aria-label="Meldung entfernen">✕</button>` +
        '</div>';
    } else {
      h += `<div class="newsslot" data-drop="news" data-i="${i}"><div class="no">${i + 1}</div>` +
        '<div class="empty">Meldung aus einem Ressortkorb hierher ziehen</div></div>';
    }
  }
  const na = newsAttraction(g, p);
  const wirkung = (na.reduce((a, b) => a + b, 0) / GROUPS.length) * 100;
  h += '</div>' +
    `<div class="hint" style="margin-top:7px">Wirkung dieser Sendung: <b>${wirkung.toFixed(0)}</b>. ` +
    'Nur tagesaktuelle Meldungen aus einem hohen Abo ziehen Zuschauer von der Konkurrenz ab.</div></div>';

  // Ressortkörbe mit Abostufe und Ticker
  h += '<div class="trays">';
  RESSORTS.forEach((r) => {
    const lvl = p.newsSub[r.id] ?? 0;
    h += '<div class="tray"><div class="tray-head">' +
      `<span>${icon(r.ico)}</span><span>${esc(r.name)}</span>` +
      '<span class="lvl">' +
      [0, 1, 2, 3].map((l) =>
        `<button class="${lvl === l ? 'on' : ''}" data-act="sub" data-r="${r.id}" data-l="${l}" ` +
        `title="Abostufe ${l} · ${money(NEWS_COST[l] ?? 0)} pro Tag · Aktualität ${Math.round((NEWS_QUAL[l] ?? 0) * 100)}%">${l}</button>`).join('') +
      '</span></div><div class="ticker">';

    if (lvl === 0) {
      h += '<div class="ticker-none">Kein Abo — hier kommt nichts über den Ticker.</div>';
    } else {
      const items = g.newsPool[r.id].filter((n) => {
        if (p.newsShow.some((x) => x.id === n.id)) return false;
        const age = g.day - n.day;
        return age < (lvl >= 3 ? 1 : lvl >= 2 ? 2 : 3);
      });
      if (!items.length) {
        h += '<div class="ticker-none">Nichts Neues aus diesem Ressort.</div>';
      } else {
        items.slice(0, 4).forEach((n) => {
          const age = g.day - n.day;
          h += `<div class="ticker-item" data-news="${n.id}" data-res="${r.id}" tabindex="0" role="button">` +
            `${esc(n.text)}<small>${age === 0 ? 'heute' : `${age} Tage alt`} · Wert ${Math.round(n.weight * 100)}</small></div>`;
        });
      }
    }
    h += '</div>' +
      `<div class="hint" style="margin-top:5px">Stufe ${lvl} · ${money(NEWS_COST[lvl] ?? 0)}/Tag</div>` +
      '</div>';
  });
  h += '</div></div>';

  h += '<div class="hint">Abgerechnet wird die <b>höchste Stufe des Tages</b>; nach Sendeschluss ' +
    'herunterzustufen spart also nichts mehr. Ein Klick auf eine Meldung setzt sie auf den nächsten ' +
    'freien Prompterplatz.</div></div>';
  return h;
}

/* ─────────── Archiv ─────────── */

function archiv(): string {
  const p = G().player;
  let h = '<div class="room">' + head('flr-archiv', 'Archiv', 'Dein Programmordner — hier steht alles, was du senden darfst');
  h += `<div class="card"><h3>${p.licences.length} Lizenzen</h3><div class="list">`;
  if (!p.licences.length) h += '<div class="empty-note">Leer. Ohne Filme kein Programm.</div>';
  [...p.licences].sort((a, b) => b.qual - a.qual).forEach((l) => {
    h += '<div class="item"><div style="flex:1;min-width:0">' +
      `<div class="t">${esc(l.title)} ${fskTag(l.fsk)}` +
      (l.produced ? ' <span class="tag g">Eigenproduktion</span>' : '') + '</div>' +
      `<div class="m">${licMeta(l)} · ${l.aired}× gesendet</div>` +
      `<div class="statline" style="margin-top:4px">Frische ` +
      `${bar(l.fresh * 100, 100, l.fresh < 0.4 ? 'var(--bad)' : 'var(--ok)')}${Math.round(l.fresh * 100)}% · ` +
      `Zuschauerwert ${bar(l.qual)}${l.qual}</div></div>` +
      `<div class="r"><button class="btn sm ghost" data-act="sell" data-u="${l.uid}">` +
      `Verkaufen<br>${moneyShort(sellPrice(l))}</button></div></div>`;
  });
  h += '</div></div>';
  h += '<div class="hint">Frisch gekaufte Titel bringen die volle Quote. Nach jeder Ausstrahlung sinkt die ' +
    'Frische — lass einem Film ein paar Tage Pause, dann erholt er sich.</div></div>';
  return h;
}

/* ─────────── Produktionsstudio ─────────── */

function studio(): string {
  const g = G();
  const p = g.player;
  let h = '<div class="room">' + head('flr-studio', 'Produktionsstudio', 'Eigenproduktionen — teuer, aber ganz allein deins');

  if (!p.studio) {
    h += '<div class="card"><h3>Studio nicht angemietet</h3>' +
      `<p class="dim" style="font-size:12.5px;margin-bottom:9px">Für ${money(STUDIO_RENT)} Anzahlung und ` +
      '40.000 € Tagesmiete gehört das Studio dir. Nur damit lassen sich eigene Sendungen drehen — ' +
      'inklusive «Kultur heute», Bettys Lieblingssendung.</p>' +
      `<button class="btn" data-act="rentstudio" ${p.money < STUDIO_RENT ? 'disabled' : ''}>` +
      `Studio anmieten (${money(STUDIO_RENT)})</button></div>`;
  } else if (g.production) {
    const pr = g.production;
    h += '<div class="card"><h3>Dreharbeiten laufen</h3>' +
      `<div class="item"><div style="flex:1"><div class="t">${icon(pr.def.ico)} ${esc(pr.def.name)}</div>` +
      `<div class="m">Noch ${pr.left} Tag(e) bis zur Fertigstellung</div>` +
      `<div class="statline" style="margin-top:5px">${bar(((pr.def.days - pr.left) / pr.def.days) * 100)}</div>` +
      '</div></div></div>';
  } else {
    h += '<div class="card"><h3>Was soll gedreht werden?</h3><div class="list">';
    PRODUCTIONS.forEach((pr) => {
      h += '<div class="item"><div style="flex:1;min-width:0">' +
        `<div class="t">${icon(pr.ico)} ${esc(pr.name)} <span class="tag">${GENRES[pr.genre].name}</span>` +
        (pr.betty >= 6 ? ` <span class="tag p">${icon('ui-herz')} Betty</span>` : '') + '</div>' +
        `<div class="m">${esc(pr.desc)}</div>` +
        `<div class="statline" style="margin-top:4px">Qualität ~${pr.quality} · ${pr.days} Drehtag(e)` +
        (pr.episodes ? ` · ${pr.episodes} Folgen` : '') + '</div></div>' +
        `<div class="r"><div style="font-weight:700">${moneyShort(pr.cost)}</div>` +
        `<button class="btn sm" style="margin-top:4px" data-act="produce" data-p="${pr.id}" ` +
        `${p.money < pr.cost ? 'disabled' : ''}>Drehen</button></div></div>`;
    });
    h += '</div></div>';
  }

  h += '<div class="card"><h3>Starmoderatoren</h3>';
  if (p.star) {
    h += `<div class="item"><div class="avatar small">${icon(p.star.ico)}</div>` +
      `<div style="flex:1"><div class="t">${esc(p.star.name)} <span class="tag g">unter Vertrag</span></div>` +
      `<div class="m">${esc(p.star.desc)}</div>` +
      `<div class="statline" style="margin-top:4px">+${Math.round(p.star.boost * 100)}% Zuschauer auf ` +
      `${p.star.genres.map((x) => GENRES[x].name).join(', ')} · Gage ${moneyShort(p.star.salary)}/Tag</div></div>` +
      '<button class="btn sm ghost" data-act="firestar">Vertrag lösen</button></div>';
  } else {
    h += '<p class="dim" style="font-size:12.5px;margin-bottom:9px">Ein bekanntes Gesicht hebt ganze Genres — ' +
      'kostet aber eine Ablöse und jeden Tag eine Gage. Nur ein Star gleichzeitig.</p><div class="list">';
    STARS.forEach((st) => {
      h += `<div class="item"><div style="flex:1;min-width:0"><div class="t">${icon(st.ico)} ${esc(st.name)}</div>` +
        `<div class="m">${esc(st.desc)}</div>` +
        `<div class="statline" style="margin-top:4px">+${Math.round(st.boost * 100)}% auf ` +
        `${st.genres.map((x) => GENRES[x].name).join(', ')}</div></div>` +
        `<div class="r"><div style="font-weight:700">${moneyShort(st.fee)}</div>` +
        `<div class="m bad">${moneyShort(st.salary)}/Tag</div>` +
        `<button class="btn sm" style="margin-top:4px" data-act="hirestar" data-s="${st.id}" ` +
        `${p.money < st.fee ? 'disabled' : ''}>Verpflichten</button></div></div>`;
    });
    h += '</div>';
  }
  h += '</div>';
  h += '<div class="hint">Kultursendungen bringen wenig Quote, aber Kritikerlob, Sammy-Chancen — und Bettys Herz.</div></div>';
  return h;
}

/* ─────────── Technik ─────────── */

function technik(): string {
  const p = G().player;
  const r = reachOf(p);
  let h = '<div class="room">' + head('flr-technik', 'Technik', 'Sendemasten und Satellit — mehr Reichweite, mehr Zuschauer');
  h += '<div class="grid3" style="margin-bottom:10px">' +
    `<div class="kpi"><div class="k">Reichweite</div><div class="v acc">${Math.round(r * 100)}%</div>` +
    `<div class="d">von ${viewers(POP)} Haushalten</div></div>` +
    `<div class="kpi"><div class="k">Sendemasten</div><div class="v">${p.transmitters} / ${MAX_TRANSMITTERS}</div>` +
    '<div class="d">je 18.000 €/Tag</div></div>' +
    `<div class="kpi"><div class="k">Satellit</div><div class="v">${p.satellite ? 'aktiv' : '—'}</div>` +
    '<div class="d">55.000 €/Tag</div></div></div>';
  h += '<div class="card"><div class="list">' +
    `<div class="item"><div style="flex:1"><div class="t">${icon('ui-antenne')} Zusätzlicher Sendemast</div>` +
    '<div class="m">+11 Prozentpunkte Reichweite · 18.000 € Betriebskosten pro Tag</div></div>' +
    `<div class="r"><div style="font-weight:700">${money(PRICE_TRANSMITTER)}</div>` +
    `<button class="btn sm" style="margin-top:4px" data-act="mast" ` +
    `${p.transmitters >= MAX_TRANSMITTERS || p.money < PRICE_TRANSMITTER ? 'disabled' : ''}>Bauen</button></div></div>` +
    `<div class="item"><div style="flex:1"><div class="t">${icon('ui-satellit')} Satellitenaufschaltung</div>` +
    '<div class="m">+22 Prozentpunkte Reichweite · 55.000 € pro Tag</div></div>' +
    `<div class="r"><div style="font-weight:700">${money(PRICE_SATELLITE)}</div>` +
    `<button class="btn sm" style="margin-top:4px" data-act="sat" ` +
    `${p.satellite || p.money < PRICE_SATELLITE ? 'disabled' : ''}>Aufschalten</button></div></div>` +
    '</div></div>';
  h += '<div class="hint">Große Werbeverträge verlangen Millionenquoten. Ohne Reichweite bleiben sie ' +
    'unerreichbar — die laufenden Kosten fressen dich aber auf, wenn das Programm nicht mithält.</div></div>';
  return h;
}

/* ─────────── Bank ─────────── */

function bank(): string {
  const g = G();
  const p = g.player;
  let h = '<div class="room">' + head('flr-bank', 'Nordsee-Bank', 'Kredit, Zinsen und ernste Blicke');
  h += '<div class="grid3" style="margin-bottom:10px">' +
    `<div class="kpi"><div class="k">Konto</div><div class="v ${p.money < 0 ? 'bad' : 'ok'}">${moneyShort(p.money)}</div></div>` +
    `<div class="kpi"><div class="k">Kredit</div><div class="v">${moneyShort(p.credit)}</div><div class="d">0,6% Tageszins</div></div>` +
    `<div class="kpi"><div class="k">Tageszins</div><div class="v">${moneyShort(Math.round(p.credit * 0.006))}</div></div></div>`;
  h += '<div class="card"><h3>Kredit</h3><div class="btnrow">' +
    [100_000, 250_000, 500_000].map((v) =>
      `<button class="btn" data-act="loan" data-v="${v}" ${p.credit + v > MAX_CREDIT ? 'disabled' : ''}>` +
      `+${moneyShort(v)} aufnehmen</button>`).join('') +
    '</div><div class="btnrow" style="margin-top:8px">' +
    [100_000, 250_000, 500_000].map((v) =>
      `<button class="btn ghost" data-act="repay" data-v="${v}" ${p.credit < v || p.money < v ? 'disabled' : ''}>` +
      `−${moneyShort(v)} tilgen</button>`).join('') +
    `</div><div class="hint">Kreditrahmen ${moneyShort(MAX_CREDIT)}. Unter −1 Mio € auf dem Konto ist der Sender weg.</div></div>`;

  h += '<div class="card"><h3>Bilanz seit Sendestart</h3><table class="tbl">' +
    `<tr><td>Werbeeinnahmen</td><td class="right num ok">${money(g.stats.revenue)}</td></tr>` +
    `<tr><td>Ausgaben</td><td class="right num bad">${money(g.stats.costs)}</td></tr>` +
    `<tr><td>Verträge erfüllt</td><td class="right num">${g.stats.contractsDone}</td></tr>` +
    `<tr><td>Verträge geplatzt</td><td class="right num bad">${g.stats.contractsFailed}</td></tr>` +
    `<tr><td>Lizenzen gekauft</td><td class="right num">${g.stats.filmsBought}</td></tr>` +
    `<tr><td>Sammy Awards</td><td class="right num">${p.awards}</td></tr></table></div></div>`;
  return h;
}

/* ─────────── Chefbüro ─────────── */

function chef(): string {
  const g = G();
  const p = g.player;
  const rank = [...g.ch].sort((a, b) => b.image - a.image);
  let mood: string;
  if (p.image >= 50) mood = 'Nicht schlecht. Für Ihre Verhältnisse. Machen Sie weiter so, dann rede ich beim Aufsichtsrat ein gutes Wort.';
  else if (p.image >= 34) mood = 'Mittelmaß. Damit gewinnt man keine Sammy und schon gar nicht Frau Botterbloom.';
  else if (p.image >= g.D.fireImage) mood = 'Das ist kein Fernsehen, das ist eine Bildstörung mit Ton. Ich beobachte Sie.';
  else mood = 'Sie stehen mit einem Bein auf der Straße. Ich sage das nur einmal.';

  let h = '<div class="room">' + head('flr-chef', 'Chefbüro', 'Herr Raffer, Generalintendant');
  h += `<div class="card"><div class="pers"><div class="avatar boss">${icon('flr-chef', { cls: 'big' })}</div>` +
    '<div><div style="font-weight:800;font-size:15px">Herr Raffer</div>' +
    `<div class="dim" style="font-size:12.5px;margin-top:4px">«${esc(mood)}»</div></div></div></div>`;
  h += '<div class="card"><h3>Senderanking</h3><table class="tbl">' +
    `<tr><th>#</th><th>Sender</th><th class="right">Marktanteil</th><th class="right">Betty ${icon('ui-herz')}</th><th class="right">Sammys</th></tr>` +
    rank.map((c, i) =>
      `<tr><td>${i + 1}</td><td>${c === p ? '<b class="acc">' : ''}${esc(c.name)}${c === p ? '</b>' : ''}</td>` +
      `<td class="right num">${c.image.toFixed(1).replace('.', ',')}%</td>` +
      `<td class="right num">${Math.round(c.love)}</td>` +
      `<td class="right num">${c.awards}</td></tr>`).join('') +
    `</table><div class="hint">Sieg: mindestens <b>${g.D.winImage}%</b> Marktanteil <b>und</b> ${g.D.winImage} ` +
    `Zuneigungspunkte bei Betty. Unter ${g.D.fireImage}% wirst du nach drei Tagen entlassen.</div></div>`;
  const bisSammy = 7 - (g.day % 7 || 7) + (g.day % 7 === 0 ? 7 : 0);
  h += `<div class="card"><h3>Nächste Sammy-Verleihung</h3><p class="dim" style="font-size:12.5px">In ${bisSammy} ` +
    'Tag(en). Kategorien: beste Nachrichtensendung, beste Kultursendung, beste Primetime-Quote.</p></div></div>';
  return h;
}

/* ─────────── Bettys Büro ─────────── */

function betty(): string {
  const g = G();
  const p = g.player;
  let mood: string;
  if (p.love >= 78) mood = 'Sie sehen mich an, als hätte sie den Ring schon anprobiert.';
  else if (p.love >= 50) mood = '«Ihr Kulturprogramm gestern… das war wirklich schön.»';
  else if (p.love >= 25) mood = '«Ach, Sie sind das. Der mit den Filmen.»';
  else if (p.love >= 8) mood = '«Ja bitte? Ich habe gleich Redaktionsschluss.»';
  else mood = 'Sie blickt kaum auf.';

  let h = '<div class="room">' + head('flr-betty', 'Bettys Büro', 'Betty Botterbloom, Kulturredaktion');
  h += `<div class="card"><div class="pers"><div class="avatar betty">${icon('ui-tanz', { cls: 'big' })}</div>` +
    '<div style="flex:1"><div style="font-weight:800;font-size:15px">Betty Botterbloom</div>' +
    `<div class="dim" style="font-size:12.5px;margin:3px 0 7px">${esc(mood)}</div>` +
    `<div class="statline">Zuneigung ${bar(p.love, 100, 'var(--love)')} ` +
    `<b class="heart">${Math.round(p.love)} / 100</b></div>` +
    `<div class="hint">Ihre Zuneigung kann dein Image nie überflügeln — aktuell gedeckelt bei ` +
    `${Math.round(p.image)}. Kultursendungen und Geschenke helfen.</div></div></div>` +
    '<div class="btnrow" style="margin-top:10px">' +
    '<button class="btn love" data-act="visit">Auf einen Kaffee bleiben (15 Min)</button></div></div>';

  h += '<div class="card"><h3>Mitgebrachte Geschenke</h3>';
  if (!g.gifts.length) h += '<div class="empty-note">Nichts dabei. Der Kiosk im Foyer hat geöffnet.</div>';
  else h += '<div class="list">' + g.gifts.map((gift, i) =>
    `<div class="item"><div style="flex:1"><div class="t">${icon(gift.ico)} ${esc(gift.name)}</div>` +
    `<div class="m">+${gift.love} Zuneigung${p.love < gift.min ? ' · sie ist noch nicht so weit' : ''}</div></div>` +
    `<button class="btn sm love" data-act="gift" data-i="${i}" ${p.love < gift.min ? 'disabled' : ''}>Überreichen</button></div>`).join('') + '</div>';
  h += '</div>';

  const rivalLove = g.ch.slice(1).map((c) => `${esc(c.name)}: ${Math.round(c.love)}`).join(' · ');
  h += `<div class="hint">Die Konkurrenz schläft nicht — ${rivalLove}</div></div>`;
  return h;
}

/* ─────────── Foyer & Kiosk ─────────── */

function foyer(): string {
  const g = G();
  const p = g.player;
  let h = '<div class="room">' + head('flr-foyer', 'Foyer & Kiosk', 'Geschenke, Klatsch und das Türschild-Verzeichnis');

  if (g.pendingTerror) {
    const cur = g.terrorSign;
    h += `<div class="card" style="border-color:var(--bad)"><h3>${icon('ui-bombe')} Türschild-Verzeichnis</h3>` +
      '<p class="dim" style="font-size:12.5px;margin-bottom:9px">Für morgen ist ein Anschlag angekündigt. ' +
      'Wer im Verzeichnis die Etagenbeschriftung vertauscht, schickt die Herrschaften woandershin. ' +
      'Unsportlich? Aber sicher.</p><div class="btnrow">' +
      (['self', 'rival1', 'rival2'] as const).map((t) =>
        `<button class="btn sm ${cur === t ? '' : 'ghost'}" data-act="sign" data-t="${t}">` +
        `${t === 'self' ? 'Nichts tun' : `→ ${esc(t === 'rival1' ? g.ch[1]!.name : g.ch[2]!.name)}`}</button>`).join('') +
      '</div></div>';
  }

  h += '<div class="card"><h3>Kiosk — Geschenke für Betty</h3><div class="list">';
  GIFTS.forEach((gift) => {
    h += `<div class="item"><div style="flex:1"><div class="t">${icon(gift.ico)} ${esc(gift.name)}</div>` +
      `<div class="m">+${gift.love} Zuneigung${gift.min ? ` · erst ab ${gift.min} ${icon('ui-herz')} sinnvoll` : ''}</div></div>` +
      `<div class="r"><div style="font-weight:700">${moneyShort(gift.cost)}</div>` +
      `<button class="btn sm" style="margin-top:4px" data-act="buygift" data-g="${gift.id}" ` +
      `${p.money < gift.cost ? 'disabled' : ''}>Kaufen</button></div></div>`;
  });
  h += '</div><div class="hint">Gekaufte Geschenke landen in deiner Tasche — überreichen musst du sie oben bei Betty.</div></div></div>';
  return h;
}

/* ─────────── Konkurrenzbüros ─────────── */

function rivalRoom(c: Channel): string {
  const g = G();
  const slots = getDay(c, g.day);
  let h = '<div class="room">' + head('flr-rival', `Büro ${c.name}`, 'Ein kurzer Blick auf den Sendeplan der Konkurrenz');
  h += '<div class="grid3" style="margin-bottom:10px">' +
    `<div class="kpi"><div class="k">Marktanteil</div><div class="v">${c.image.toFixed(1).replace('.', ',')}%</div></div>` +
    `<div class="kpi"><div class="k">Reichweite</div><div class="v">${Math.round(reachOf(c) * 100)}%</div>` +
    `<div class="d">${c.transmitters} Masten${c.satellite ? ' + Satellit' : ''}</div></div>` +
    `<div class="kpi"><div class="k">Betty ${icon('ui-herz')}</div><div class="v" style="color:var(--love)">${Math.round(c.love)}</div></div></div>`;
  h += '<div class="card"><h3>Heutiges Programm</h3><table class="tbl">' +
    '<tr><th>Zeit</th><th>Sendung</th><th class="right">Länge</th><th class="right">Zuschauer</th></tr>' +
    slots.map((s, b) => {
      if (s.prog && !s.start) return '';       // Fortsetzung, steht schon oben
      return `<tr><td class="num">${slotLabel(b)}</td>` +
        `<td>${s.prog ? `${esc(s.prog.title)} <span class="dim">${GENRES[s.prog.genre].name}</span>` : '<span class="dim">—</span>'}</td>` +
        `<td class="right num dim">${s.prog ? lengthLabel(s.len) : ''}</td>` +
        `<td class="right num">${s.aired && s.res ? viewers(s.res.total) : '<span class="dim">…</span>'}</td></tr>`;
    }).join('') +
    '</table></div>';
  h += '<div class="hint">Wer weiß, was drüben läuft, kann sein eigenes Programm daneben legen — ' +
    'gleiches Genre zur gleichen Zeit teilt die Zuschauer.</div></div>';
  return h;
}

/* ─────────── Verzeichnis ─────────── */

export const ROOMS: Record<RoomId, () => string> = {
  office, film, werbe, news, archiv, studio, technik, bank, chef, betty, foyer,
  rival1: () => rivalRoom(G().ch[1]!),
  rival2: () => rivalRoom(G().ch[2]!),
};

export function floorIndex(id: RoomId): number {
  return FLOORS.findIndex((f) => f.id === id);
}

export { DIFFS };
