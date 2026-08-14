/**
 * Rahmen: Kopfzeile, Schnellwahl, Hochhausansicht, Fahrstuhl.
 *
 * In Etappe 2 wird die Hochhausansicht durch eine gezeichnete SVG-Szene mit
 * laufender Figur ersetzt. Die Etagenliste bleibt als Sprungmarke bestehen.
 */
import { BLOCKS, FLOORS, esc, getDay, hhmm, moneyShort, reachOf, WEEKDAYS } from '../core';
import type { RoomId } from '../core';
import { activate, el } from './dom';
import { G, S } from './session';
import { ROOMS } from './rooms';
import { runAction } from './actions';
import { goFloor, leaveRoom, setSpeed, togglePause } from './loop';
import { openMenu } from './screens';

export function renderAll(): void {
  renderTop();
  renderBottom();
  renderView();
}

export function renderTop(): void {
  const g = G();
  const s = S();
  const p = g.player;
  const onair = g.time >= 18 * 60;
  const cls = g.time >= 24 * 60 ? 'late' : onair ? 'onair' : '';

  el('topbar').innerHTML =
    '<div class="brand">MAD<span>TV</span></div>' +
    `<div class="clock ${cls}" aria-label="Uhrzeit">${hhmm(g.time)}</div>` +
    `<div class="stat"><div class="k">Tag</div><div class="v">${g.day} · ${WEEKDAYS[g.weekday]!.slice(0, 2)}</div></div>` +
    `<div class="stat money${p.money < 0 ? ' neg' : ''}"><div class="k">Konto</div>` +
    `<div class="v">${moneyShort(p.money)}</div></div>` +
    `<div class="stat img"><div class="k">Image</div><div class="v">${p.image.toFixed(1).replace('.', ',')}%</div></div>` +
    `<div class="stat love"><div class="k">Betty</div><div class="v">${Math.round(p.love)} ♥</div></div>` +
    '<div class="spacer"></div>' +
    '<div class="speedbtns" role="group" aria-label="Geschwindigkeit">' +
    `<button data-sp="0" class="${s.paused ? 'on' : ''}" aria-label="Pause">❚❚</button>` +
    `<button data-sp="1" class="${!s.paused && s.speed === 1 ? 'on' : ''}" aria-label="Langsam">▶</button>` +
    `<button data-sp="2" class="${!s.paused && s.speed === 2 ? 'on' : ''}" aria-label="Normal">▶▶</button>` +
    `<button data-sp="3" class="${!s.paused && s.speed === 3 ? 'on' : ''}" aria-label="Schnell">▶▶▶</button>` +
    '</div>' +
    '<button class="iconbtn" id="menubtn" aria-label="Menü">☰</button>';

  el('topbar').querySelectorAll<HTMLButtonElement>('[data-sp]').forEach((b) => {
    b.onclick = () => {
      const v = Number(b.dataset.sp);
      if (v === 0) togglePause(true);
      else setSpeed(v);
      renderTop();
    };
  });
  el('menubtn').onclick = openMenu;
}

const QUICK: RoomId[] = ['office', 'film', 'werbe', 'news', 'archiv', 'studio', 'betty', 'chef'];

export function renderBottom(): void {
  const s = S();
  el('bottom').innerHTML =
    QUICK.map((id) => {
      const i = FLOORS.findIndex((f) => f.id === id);
      return `<button data-f="${i}" class="${s.floor === i && s.room ? 'on' : ''}">` +
        `${FLOORS[i]!.ico} ${esc(FLOORS[i]!.name)}</button>`;
    }).join('') +
    '<button data-f="-1">🏢 Hochhaus</button>';

  el('bottom').querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => {
    b.onclick = () => {
      const f = Number(b.dataset.f);
      if (f < 0) leaveRoom();
      else goFloor(f);
    };
  });
}

export function renderView(): void {
  const s = S();
  const view = el('view');
  if (s.elevBusy > 0) view.innerHTML = viewElevator();
  else if (!s.room) view.innerHTML = viewTower();
  else view.innerHTML = ROOMS[s.room]();
  bindView();
}

function bindView(): void {
  const view = el('view');
  view.querySelectorAll<HTMLElement>('[data-act]').forEach((n) => {
    activate(n, () => runAction(n.dataset.act!, { ...n.dataset }));
  });
  view.querySelectorAll<HTMLElement>('[data-go]').forEach((n) => {
    activate(n, () => goFloor(Number(n.dataset.go)));
  });
}

function viewElevator(): string {
  const s = S();
  const t = s.elevTarget !== null ? FLOORS[s.elevTarget] : null;
  const done = Math.max(4, Math.min(100, (1 - s.elevBusy / (s.elevTotal || 8)) * 100));
  return '<div class="room" style="text-align:center;padding:60px 0">' +
    '<div style="font-size:48px" aria-hidden="true">🛗</div>' +
    '<h2 style="margin:10px 0 4px">Der Fahrstuhl fährt…</h2>' +
    `<p class="dim" style="font-size:12.5px">Ziel: ${t ? esc(t.name) : '—'} · noch ${s.elevBusy} Minuten</p>` +
    `<div class="bar" style="max-width:240px;margin:16px auto;height:7px"><i style="width:${done}%"></i></div>` +
    '<p class="hint" style="max-width:380px;margin:0 auto">Zeit ist im Sendehochhaus die knappste Ressource. ' +
    'Wer unnötig Etagen wechselt, verpasst den Werbeblock.</p></div>';
}

function viewTower(): string {
  const g = G();
  const s = S();
  const cabTop = (FLOORS.length - 1 - s.floor) * 46;

  let h = '<div class="room">';
  h += '<div class="roomhead"><div class="ico" aria-hidden="true">🏢</div><div><h2>Sendehochhaus</h2>' +
    '<p>Etage wählen — der Fahrstuhl braucht seine Zeit</p></div>' +
    `<div class="backbtn" style="pointer-events:none">Etage ${s.floor + 1}</div></div>`;
  h += '<div class="tower"><div class="shaft" aria-hidden="true"><div class="rail"></div>' +
    `<div class="cab${s.elevBusy > 0 ? ' moving' : ''}" style="top:${cabTop + 4}px"><div class="dot"></div></div></div>`;
  h += '<div class="floors">';

  for (let i = FLOORS.length - 1; i >= 0; i--) {
    const f = FLOORS[i]!;
    let sub = f.sub;
    let badge = '';
    switch (f.id) {
      case 'office': {
        const empty = getDay(g.player, g.day).filter((x) => !x.prog && !x.aired).length;
        if (empty) badge = `<span class="badge">${empty} leer</span>`;
        sub = `Sendeplan · ${g.player.licences.length} Lizenzen`;
        break;
      }
      case 'werbe': sub = `${g.player.contracts.length}/4 Verträge im Koffer`; break;
      case 'film': sub = `${g.market.length} Angebote${g.auction && !g.auction.closed ? ' · Auktion!' : ''}`; break;
      case 'news': sub = `${g.player.newsShow.length} Meldungen gewählt`; break;
      case 'betty': sub = `Zuneigung ${Math.round(g.player.love)} ♥`; break;
      case 'studio': sub = g.production ? `Dreht: ${g.production.def.name}` : 'frei'; break;
      case 'technik': sub = `Reichweite ${Math.round(reachOf(g.player) * 100)}%`; break;
      case 'archiv': sub = `${g.player.licences.length} Titel`; break;
      default: break;
    }
    h += `<div class="floor${i === s.floor ? ' here' : ''}" data-go="${i}" role="button" tabindex="0" ` +
      `aria-label="Etage ${i + 1}, ${esc(f.name)}">` +
      `<div class="num">${i + 1}</div><div class="ico" aria-hidden="true">${f.ico}</div>` +
      `<div class="nm">${esc(f.name)}${badge}</div>` +
      `<div class="sub">${esc(sub)}</div></div>`;
  }

  h += '</div></div>';
  h += '<div class="hint">Tipp: Über die Leiste unten springst du direkt in einen Raum — der Fahrstuhl fährt trotzdem mit.</div>';
  return h + '</div>';
}

export { BLOCKS };
