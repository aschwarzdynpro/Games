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
import type { Channel, Contract, GenreId, Licence, RoomId } from '../core';
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

/**
 * Eine Karteikarte im Schrank. Der Reiter oben trägt die Zielgruppe — danach
 * sucht man hier, denn ein Vertrag ist genau dann gut, wenn man die geforderte
 * Gruppe ohnehin schon erreicht.
 */
function kundenkarte(g: ReturnType<typeof G>, c: Contract, est: number): string {
  const grp = c.group ? GROUPS[c.gi]! : null;
  const erreichbar = grp ? est * grp.share * 1.1 : est;
  // Erst deutlich unter der Forderung wird die ganze Karte rot — knapp
  // daneben ist eine Wette, kein Fehler.
  const knapp = erreichbar < c.minAud * 0.85;
  const voll = g.player.contracts.length >= MAX_CONTRACTS;

  return `<div class="kkarte${knapp ? ' knapp' : ''}" data-drag="kunde" data-ad="${c.id}" ` +
    `role="button" tabindex="0" data-act="takead" data-i="${c.id}" ${voll ? 'aria-disabled="true"' : ''} ` +
    `title="${esc(c.brand)} — ${esc(c.product)}">` +
    `<div class="kk-reiter">${grp ? `${icon(grp.ico)} ${esc(grp.name)}` : 'alle Zuschauer'}</div>` +
    `<div class="kk-marke">${esc(c.brand)}</div>` +
    `<div class="kk-produkt">${esc(c.product)}</div>` +
    '<div class="kk-zeile"><span>Mindestens</span>' +
    `<b class="${knapp ? 'warn' : 'ok'}">${viewers(c.minAud)}</b></div>` +
    `<div class="kk-zeile"><span>Umfang</span><b>${c.spots} Spots · ${c.days} Tage</b></div>` +
    `<div class="kk-zeile"><span>Je Spot</span><b class="ok">${moneyShort(c.perSpot)}</b></div>` +
    `<div class="kk-zeile"><span>Strafe</span><b class="bad">${moneyShort(c.penalty)}</b></div>` +
    '</div>';
}

/** Ein Fach im Koffer — belegt mit Vertrag oder offen als Ablageziel. */
function kofferfach(g: ReturnType<typeof G>, c: Contract | undefined): string {
  if (!c) {
    return '<div class="fach leer" data-drop="koffer">' +
      `${icon('ui-plus')}<span>Karte hierher ziehen</span></div>`;
  }
  const rest = c.deadline - g.day;
  const anteil = Math.min(100, (c.done / Math.max(1, c.spots)) * 100);
  const eilig = rest <= 1 && c.done < c.spots;
  return `<div class="fach${eilig ? ' eilig' : ''}" data-drop="koffer">` +
    `<div class="f-marke">${esc(c.brand)}</div>` +
    `<div class="f-produkt">${esc(c.product)}</div>` +
    `<div class="f-fort">${bar(anteil, 100, anteil >= 100 ? 'var(--ok)' : 'var(--acc)')}` +
    `<span>${c.done}/${c.spots}</span></div>` +
    `<div class="f-frist${eilig ? ' bad' : ''}">` +
    (rest <= 0 ? 'läuft heute ab' : `noch ${rest} Tag${rest === 1 ? '' : 'e'}`) +
    `<span class="ok">${moneyShort(c.perSpot)}/Spot</span></div></div>`;
}

function werbe(): string {
  const g = G();
  const p = g.player;
  const voll = p.contracts.length >= MAX_CONTRACTS;
  // Nicht «was bringt mein Plan gerade», sondern «was ginge, wenn ich gut plane».
  // Sonst ist an Tag 1 vor leerem Sendeplan jeder Vertrag rot, und die Warnung
  // sagt nichts mehr aus.
  const beste = [...p.licences].sort((a, b) => b.qual - a.qual)[0];
  let est = 0;
  for (let i = 4; i <= 7; i++) est = Math.max(est, estimateBlock(g, g.day, i, beste).total);

  let h = '<div class="room">' + head('flr-werbe', 'Werbeagentur',
    'Kundenkartei — Karte in den Koffer ziehen, dann steht der Vertrag');

  // Der Koffer liegt oben und bleibt sichtbar: Man muss beim Blättern wissen,
  // wie viel Platz noch da ist.
  h += `<div class="koffer${voll ? ' voll' : ''}">` +
    `<div class="koffer-kopf">Dein Koffer <span>${p.contracts.length}/${MAX_CONTRACTS} Verträge` +
    (voll ? ' · voll' : '') + '</span></div><div class="faecher">' +
    Array.from({ length: MAX_CONTRACTS }, (_, i) => kofferfach(g, p.contracts[i])).join('') +
    '</div></div>';

  h += '<div class="schrank"><div class="schrank-kopf">Kundenkartei' +
    `<span>gut geplant bringt deine Primetime derzeit rund ${viewers(est)}</span></div>`;
  if (!g.adMarket.length) {
    h += '<div class="empty-note">Die Kartei ist leer. Morgen liegen neue Karten da.</div>';
  } else {
    h += '<div class="kartei" data-scroll>' +
      g.adMarket.map((c) => kundenkarte(g, c, est)).join('') + '</div>';
  }
  h += '</div>';

  h += '<div class="hint">Ein Spot zählt nur, wenn der Sendeblock die Mindestquote wirklich erreicht. ' +
    'Verfällt der Vertrag, wird die volle Strafe fällig. Rot hinterlegte Karten fordern mehr, ' +
    'als deine Primetime derzeit hergibt.</div></div>';
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
          h += `<div class="ticker-item" data-drag="news" data-news="${n.id}" data-res="${r.id}" tabindex="0" role="button">` +
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

/**
 * Ein Band im Regal. Breite = Sendelänge wie in der Filmagentur, damit beide
 * Räume dieselbe Sprache sprechen. Der Streifen unten ist die Frische — man
 * sieht dem Regal an, was heute Abend noch trägt.
 */
function bandRuecken(l: Licence): string {
  const gd = GENRES[l.genre];
  const w = 34 + l.lenSlots * 24;
  const breit = l.lenSlots >= 3;
  const f = Math.round(l.fresh * 100);
  const zustand = l.fresh >= 0.7 ? 'frisch' : l.fresh >= 0.4 ? 'mittel' : 'muede';

  return `<div class="band ${zustand}" data-drag="band" data-lic="${l.uid}" ` +
    `style="--h:${BOX_HUE[l.genre] ?? 210};width:${w}px" role="button" tabindex="0" ` +
    `data-act="bandinfo" data-u="${l.uid}" ` +
    `title="${esc(l.title)} — ${gd.name}, ${lengthLabel(l.lenSlots)}, Frische ${f}%">` +
    (breit
      ? `<div class="band-breit"><span class="band-titel">${esc(l.title)}</span>` +
        `<span class="band-sub">${icon(gd.ico)} ${gd.name} · ${l.aired}× gesendet</span></div>`
      : `<div class="band-spine">${esc(l.title)}</div>`) +
    (l.produced ? '<div class="band-eigen" title="Eigenproduktion"></div>' : '') +
    `<div class="band-frische"><i style="width:${f}%"></i></div></div>`;
}

function archiv(): string {
  const p = G().player;
  let h = '<div class="room">' + head('flr-archiv', 'Archiv',
    'Regalwand — Bänder auf den Rollwagen ziehen, was raus soll');

  if (!p.licences.length) {
    h += '<div class="empty-note">Das Regal ist leer. Ohne Filme kein Programm.</div>';
    return h + '</div>';
  }

  // Sortiert wird nach Frische, nicht nach Güte: Das ist die Frage, die man
  // sich im Archiv stellt — was kann ich heute Abend noch senden?
  const bretter: { titel: string; note: string; test: (l: Licence) => boolean }[] = [
    { titel: 'Einsatzbereit', note: 'volle Quote', test: (l) => l.fresh >= 0.7 },
    { titel: 'Angespielt', note: 'zieht spürbar weniger', test: (l) => l.fresh >= 0.4 && l.fresh < 0.7 },
    { titel: 'Ausgelaugt', note: 'braucht Pause oder muss weg', test: (l) => l.fresh < 0.4 },
  ];
  const sortiert = [...p.licences].sort((a, b) => b.fresh - a.fresh || b.qual - a.qual);

  h += '<div class="wall">';
  for (const br of bretter) {
    const teil = sortiert.filter(br.test);
    if (!teil.length) continue;
    h += `<div class="wall-shelf"><div class="wall-label">${br.titel} · ${br.note} · ` +
      `${teil.length} ${teil.length === 1 ? 'Band' : 'Bänder'}</div>` +
      `<div class="wall-row">${teil.map(bandRuecken).join('')}</div>` +
      '<div class="wall-board"></div></div>';
  }
  h += '</div>';

  // Der Rollwagen ist zugleich Ablage und Erklärung: Was hier landet, geht raus.
  h += '<div class="rollwagen" data-drop="wagen">' +
    `<div class="rw-kopf">${icon('ui-karton')} Rollwagen zum Verleih</div>` +
    '<div class="rw-text">Band hierher ziehen, um es zu verkaufen. Der Verleih zahlt nach ' +
    'Güte und Restfrische — ein ausgelaugter Titel bringt wenig.</div>' +
    '<div class="rw-raeder"><i></i><i></i></div></div>';

  h += '<div class="hint">Frisch gekaufte Titel bringen die volle Quote. Nach jeder Ausstrahlung sinkt die ' +
    'Frische — lass einem Film ein paar Tage Pause, dann erholt er sich. Ein Klick auf ein Band ' +
    'zeigt seine Kennzahlen.</div></div>';
  return h;
}

/* ─────────── Produktionsstudio ─────────── */

/**
 * Ein Drehbuch im Regal. Die Dicke steht für die Drehdauer — drei Drehtage
 * sind sichtbar mehr Papier als einer.
 */
function drehbuch(g: ReturnType<typeof G>, pr: typeof PRODUCTIONS[number]): string {
  const bezahlbar = g.player.money >= pr.cost;
  const gd = GENRES[pr.genre];
  return `<div class="skript${bezahlbar ? '' : ' teuer'}" data-drag="skript" data-p="${pr.id}" ` +
    `data-act="produce" role="button" tabindex="0" style="--tage:${pr.days}" ` +
    `title="${esc(pr.name)} — ${esc(pr.desc)}">` +
    `<div class="sk-kopf">${icon(pr.ico)} ${gd.name}</div>` +
    `<div class="sk-titel">${esc(pr.name)}</div>` +
    `<div class="sk-text">${esc(pr.desc)}</div>` +
    '<div class="sk-fuss">' +
    `<span>${lengthLabel(pr.lenSlots)}${pr.episodes ? ` · ${pr.episodes} Folgen` : ''}</span>` +
    `<span class="sk-preis${bezahlbar ? '' : ' bad'}">${moneyShort(pr.cost)}</span></div>` +
    `<div class="sk-tage">${pr.days} Drehtag${pr.days === 1 ? '' : 'e'}</div>` +
    (pr.betty >= 6 ? `<div class="sk-herz">${icon('ui-herz')}</div>` : '') +
    '</div>';
}

/** Die Garderobentür eines Moderators. Offen und beleuchtet heißt: unter Vertrag. */
function garderobe(g: ReturnType<typeof G>, st: typeof STARS[number], hier: boolean): string {
  const bezahlbar = g.player.money >= st.fee;
  return `<div class="tuer${hier ? ' offen' : ''}${bezahlbar || hier ? '' : ' teuer'}" ` +
    (hier ? '' : `data-act="hirestar" data-s="${st.id}" role="button" tabindex="0" `) +
    `title="${esc(st.name)} — ${esc(st.desc)}">` +
    `<div class="t-lampe"></div>` +
    `<div class="t-schild"><span class="t-ico">${icon(st.ico)}</span>${esc(st.name)}</div>` +
    `<div class="t-boost">+${Math.round(st.boost * 100)}% · ` +
    `${st.genres.map((x) => GENRES[x].name).join(', ')}</div>` +
    (hier
      ? `<div class="t-gage">Gage ${moneyShort(st.salary)}/Tag</div>` +
        '<button class="btn sm ghost" data-act="firestar">Vertrag lösen</button>'
      : `<div class="t-gage">${moneyShort(st.fee)} Ablöse · ${moneyShort(st.salary)}/Tag</div>`) +
    '</div>';
}

function studio(): string {
  const g = G();
  const p = g.player;
  let h = '<div class="room">' + head('flr-studio', 'Produktionsstudio',
    'Drehbühne — Drehbuch auf die Bühne ziehen, dann wird gedreht');

  /* Die Bühne. Sie ist immer da: dunkel, wenn nichts läuft. */
  const laeuft = g.production;
  const gemietet = !!p.studio;
  h += `<div class="buehne${gemietet ? '' : ' dunkel'}${laeuft ? ' aufnahme' : ''}" ` +
    (gemietet && !laeuft ? 'data-drop="buehne"' : '') + '>' +
    '<div class="traverse">' + '<i></i>'.repeat(5) + '</div>' +
    '<div class="kegel"></div>';

  if (!gemietet) {
    h += '<div class="b-inhalt"><div class="b-titel">Studio nicht angemietet</div>' +
      `<div class="b-text">${money(STUDIO_RENT)} Anzahlung, danach 40.000 € Tagesmiete. ` +
      'Nur damit lassen sich eigene Sendungen drehen — auch «Kultur heute», Bettys Lieblingssendung.</div>' +
      `<button class="btn" data-act="rentstudio" ${p.money < STUDIO_RENT ? 'disabled' : ''}>` +
      `Licht an · ${money(STUDIO_RENT)}</button></div>`;
  } else if (laeuft) {
    const anteil = ((laeuft.def.days - laeuft.left) / laeuft.def.days) * 100;
    h += '<div class="b-inhalt"><div class="klappe"><span>AUFNAHME</span>' +
      `<b>${esc(laeuft.def.name)}</b></div>` +
      `<div class="b-text">Noch ${laeuft.left} Drehtag${laeuft.left === 1 ? '' : 'e'} bis zur ` +
      'Fertigstellung. Solange bleibt die Bühne belegt.</div>' +
      `<div class="b-fort">${bar(anteil, 100, 'var(--gold)')}</div></div>`;
  } else {
    h += '<div class="b-inhalt leer"><div class="b-titel">Bühne frei</div>' +
      '<div class="b-text">Zieh ein Drehbuch aus dem Regal hierher — oder klick es an.</div></div>';
  }
  h += '<div class="b-boden"></div></div>';

  /* Das Drehbuchregal */
  if (gemietet && !laeuft) {
    h += '<div class="regal"><div class="regal-kopf">Drehbücher' +
      '<span>die Dicke zeigt die Drehdauer</span></div>' +
      '<div class="regal-reihe" data-scroll>' +
      PRODUCTIONS.map((pr) => drehbuch(g, pr)).join('') + '</div></div>';
  }

  /* Die Garderoben */
  h += '<div class="gang"><div class="gang-kopf">Garderoben' +
    `<span>${p.star ? 'ein Star unter Vertrag' : 'nur einer gleichzeitig'}</span></div>` +
    '<div class="gang-reihe" data-scroll>' +
    STARS.map((st) => garderobe(g, st, p.star?.id === st.id)).join('') +
    '</div></div>';

  h += '<div class="hint">Kultursendungen bringen wenig Quote, aber Kritikerlob, Sammy-Chancen — ' +
    'und Bettys Herz. Ein Star hebt ganze Genres, kostet aber jeden Tag Gage, ob er sendet oder nicht.</div></div>';
  return h;
}

/* ─────────── Technik ─────────── */

/**
 * Rundinstrument für die Reichweite. Ein Zeiger sagt schneller als eine Zahl,
 * ob noch Luft nach oben ist — und genau darum geht es in diesem Raum.
 */
function zeigerwerk(anteil: number): string {
  // Halbkreis von -90° (0 %) bis +90° (100 %)
  const winkel = -90 + Math.max(0, Math.min(1, anteil)) * 180;
  const striche = Array.from({ length: 11 }, (_, i) =>
    `<line x1="50" y1="8" x2="50" y2="${i % 5 === 0 ? 15 : 12}" ` +
    `transform="rotate(${-90 + i * 18} 50 46)" stroke="#5d6b80" stroke-width="${i % 5 === 0 ? 2 : 1.2}"/>`).join('');
  return '<svg class="skala" viewBox="0 0 100 56" aria-hidden="true">' +
    '<path d="M8 46a42 42 0 0 1 84 0" fill="none" stroke="#232c3a" stroke-width="9"/>' +
    `<path d="M8 46a42 42 0 0 1 84 0" fill="none" stroke="url(#skalaFarbe)" stroke-width="9" ` +
    `stroke-dasharray="${(anteil * 132).toFixed(1)} 999" stroke-linecap="round"/>` +
    '<defs><linearGradient id="skalaFarbe" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#e0a34a"/><stop offset="1" stop-color="#4aa3ff"/>' +
    '</linearGradient></defs>' +
    striche +
    `<line x1="50" y1="46" x2="50" y2="14" stroke="#e8eef7" stroke-width="2.4" stroke-linecap="round" ` +
    `transform="rotate(${winkel.toFixed(1)} 50 46)"/>` +
    '<circle cx="50" cy="46" r="4" fill="#8b98a9"/></svg>';
}

function technik(): string {
  const p = G().player;
  const r = reachOf(p);
  const laufend = p.transmitters * 18_000 + (p.satellite ? 55_000 : 0);

  let h = '<div class="room">' + head('flr-technik', 'Technik',
    'Schaltraum — jeder Schalter kostet, jeder Schalter bringt Zuschauer');

  h += '<div class="schaltschrank">';

  /* Linke Seite: das Instrument */
  h += '<div class="messfeld">' + zeigerwerk(r) +
    `<div class="mess-wert">${Math.round(r * 100)}<span>%</span></div>` +
    `<div class="mess-text">Reichweite · ${viewers(POP * r)} von ${viewers(POP)} Haushalten</div>` +
    `<div class="zaehlwerk" title="laufende Betriebskosten je Sendetag">` +
    String(laufend).padStart(6, '0').split('').map((z) => `<i>${z}</i>`).join('') +
    '<span>€/Tag</span></div></div>';

  /* Rechte Seite: die Schalter */
  h += '<div class="schaltfeld">';
  h += `<div class="sf-titel">${icon('ui-antenne')} Sendemasten</div><div class="masten">`;
  for (let i = 0; i < MAX_TRANSMITTERS; i++) {
    const steht = i < p.transmitters;
    const dran = i === p.transmitters;
    const geht = dran && p.money >= PRICE_TRANSMITTER;
    h += `<div class="mast${steht ? ' an' : ''}${dran ? ' naechster' : ''}" ` +
      (dran ? `data-act="mast" role="button" tabindex="0" ${geht ? '' : 'aria-disabled="true"'} ` : '') +
      `title="${steht ? 'in Betrieb' : dran ? `bauen für ${money(PRICE_TRANSMITTER)}` : 'noch nicht freigeschaltet'}">` +
      `<div class="m-lampe"></div><div class="m-kipp"><i></i></div>` +
      `<div class="m-nr">${i + 1}</div></div>`;
  }
  h += '</div>';
  h += `<div class="sf-note">+11 Prozentpunkte je Mast · ${money(PRICE_TRANSMITTER)} Bau, 18.000 €/Tag Betrieb` +
    (p.transmitters >= MAX_TRANSMITTERS ? ' · alle gebaut' : '') + '</div>';

  const satGeht = !p.satellite && p.money >= PRICE_SATELLITE;
  h += `<div class="sf-titel" style="margin-top:14px">${icon('ui-satellit')} Satellitenaufschaltung</div>` +
    `<div class="hebel${p.satellite ? ' an' : ''}" ` +
    (p.satellite ? '' : `data-act="sat" role="button" tabindex="0" ${satGeht ? '' : 'aria-disabled="true"'}`) +
    '><div class="h-bahn"><div class="h-griff"></div></div>' +
    `<div class="h-text"><b>${p.satellite ? 'aufgeschaltet' : 'abgeschaltet'}</b>` +
    `<span>+22 Prozentpunkte · ${money(PRICE_SATELLITE)} einmalig, 55.000 €/Tag</span></div></div>`;
  h += '</div></div>';

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
