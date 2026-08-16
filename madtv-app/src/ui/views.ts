/**
 * Rahmen: Kopfzeile, Schnellwahl, Hochhausansicht, Fahrstuhl.
 *
 * In Etappe 2 wird die Hochhausansicht durch eine gezeichnete SVG-Szene mit
 * laufender Figur ersetzt. Die Etagenliste bleibt als Sprungmarke bestehen.
 */
import {
  BLOCKS, FLOORS, esc, getDay, reachOf,
} from '../core';
import type { RoomId } from '../core';
import { activate, el } from './dom';
import { icon } from './icons';
import { G, S } from './session';
import { ROOMS } from './rooms';
import { runAction } from './actions';
import { bindBoard } from './board';
import { scrollMerken, scrollZurueck } from './rail';
import { renderSzene } from './szene';
import { SZENEN, fensterInhalt } from './szenen';
import { renderBrett, renderUebersicht, updateBrett } from './konsole';
import { setWorldVisible } from '../world/world';
import { goFloor, leaveRoom, setSpeed, togglePause } from './loop';
import { openMenu } from './screens';

let brettGebaut = false;

/**
 * Das Armaturenbrett entsteht einmal und wird danach nur fortgeschrieben —
 * aus demselben Grund wie die Kopfzeile: Ein neues `innerHTML` je Spielminute
 * risse den Tastaturfokus heraus.
 */
function renderBrettGeruest(): void {
  if (brettGebaut) return;
  el('brett').innerHTML = renderBrett();
  // Das Brett liegt außerhalb von #view, wo `bindView()` die Aktionen
  // verdrahtet — seine Knöpfe müssen deshalb hier angeschlossen werden. Weil
  // das Gerüst nur einmal entsteht, reicht das einmal.
  el('brett').querySelectorAll<HTMLElement>('[data-act]').forEach((n) => {
    activate(n, () => runAction(n.dataset.act!, { ...n.dataset }));
  });
  brettGebaut = true;
}

/** Nach dem Laden eines Spielstands muss auch das Brett neu entstehen. */
export function resetBrett(): void {
  brettGebaut = false;
}

export function renderAll(): void {
  renderTop();
  renderBrettGeruest();
  renderBottom();
  renderView();
}

/**
 * Die Kopfzeile wird einmal gebaut und danach nur noch fortgeschrieben.
 *
 * Vorher setzte jede Spielminute ein neues `innerHTML` — und riss damit den
 * Tastaturfokus aus den Geschwindigkeitsknöpfen. Wer mit der Tastatur spielt,
 * verlor sechzig Mal je Sendetag seine Stelle. Jetzt ändern sich nur noch die
 * Zahlen.
 */
let topBuilt = false;

export function renderTop(): void {
  if (!topBuilt) buildTop();
  updateTop();
}

function buildTop(): void {
  el('topbar').innerHTML =
    // Die Kopfzeile trägt keine Zahlen mehr — die stehen alle im Brett unter
    // dem Bild. Hier bleibt nur, was keine Anzeige ist: Tempo und Menü.
    '<div class="brand">MAD<span>TV</span></div>' +
    // Ein Schalter, der die Regeln lockert, darf nicht still wirken.
    `<div class="freibau" id="t-freibau" hidden>${icon('ui-zeitfrei')} Freier Aufbau</div>` +
    '<div class="spacer"></div>' +
    '<div class="speedbtns" role="group" aria-label="Geschwindigkeit">' +
    `<button data-sp="0" aria-label="Pause">${icon('ui-pause')}</button>` +
    `<button data-sp="1" aria-label="Langsam">${icon('ui-play')}</button>` +
    `<button data-sp="2" aria-label="Normal">${icon('ui-play2')}</button>` +
    `<button data-sp="3" aria-label="Schnell">${icon('ui-play3')}</button>` +
    '</div>' +
    `<button class="iconbtn" id="menubtn" aria-label="Menü">${icon('ui-menu')}</button>`;

  el('topbar').querySelectorAll<HTMLButtonElement>('[data-sp]').forEach((b) => {
    b.onclick = () => {
      const v = Number(b.dataset.sp);
      if (v === 0) togglePause(true);
      else setSpeed(v);
      renderTop();
    };
  });
  el('menubtn').onclick = openMenu;
  topBuilt = true;
}

function updateTop(): void {
  const g = G();
  const s = S();

  el('t-freibau').hidden = !g.opt.godMode;

  el('topbar').querySelectorAll<HTMLButtonElement>('[data-sp]').forEach((b) => {
    const v = Number(b.dataset.sp);
    b.classList.toggle('on', v === 0 ? s.paused : !s.paused && s.speed === v);
  });

  // Die Konsole unter einem begehbaren Raum hängt am selben Takt.
  updateBrett();
}

/** Nach dem Laden eines Spielstands muss die Kopfzeile neu entstehen. */
export function resetTop(): void {
  topBuilt = false;
}

const QUICK: RoomId[] = ['office', 'film', 'werbe', 'news', 'archiv', 'studio', 'betty', 'chef'];

export function renderBottom(): void {
  const s = S();
  el('bottom').innerHTML =
    QUICK.map((id) => {
      const i = FLOORS.findIndex((f) => f.id === id);
      // Beschriftung als eigenes Element: Auf schmalen Geräten wird sie
      // ausgeblendet, damit alle neun Räume ohne Wischen erreichbar bleiben.
      return `<button data-f="${i}" class="${s.floor === i && s.room ? 'on' : ''}" ` +
        `aria-label="${esc(FLOORS[i]!.name)}" title="${esc(FLOORS[i]!.name)}">` +
        `${icon(FLOORS[i]!.ico)}<span class="lbl">${esc(FLOORS[i]!.name)}</span></button>`;
    }).join('') +
    '<button data-f="-1" aria-label="Hochhaus" title="Hochhaus">' +
    `${icon('ui-hochhaus')}<span class="lbl">Hochhaus</span></button>`;

  el('bottom').querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => {
    b.onclick = () => {
      const f = Number(b.dataset.f);
      if (f < 0) leaveRoom();
      else goFloor(f);
    };
  });
}

/**
 * Übergänge zwischen den Ansichten.
 *
 * Die Panels werden bei jeder Änderung neu aus HTML gebaut — auch alle zwölf
 * Spielminuten zur Auffrischung der Zahlen. Eine Einblendung am Element selbst
 * lief deshalb ständig wieder an und ließ den Raum flackern. Die Bewegung hängt
 * jetzt nicht mehr am Neubau, sondern am *Szenenwechsel*: Ein Raum blendet nur
 * dann ein, wenn man ihn wirklich gerade betreten hat.
 *
 * Die Richtung erzählt dabei mit, was passiert ist — hinein in einen Raum
 * kommt von unten wie durch die Tür, zurück in den Flur sinkt ab, die Fahrt
 * blendet weich.
 */
let lastScene = '';

function sceneKey(): string {
  const s = S();
  if (s.elevBusy > 0) return 'lift';
  return s.room ? `room:${s.room}` : 'tower';
}

function transitionFor(from: string, to: string): string {
  if (!from || from === to) return '';
  if (to === 'lift') return 'v-ride';
  if (from === 'lift') return 'v-arrive';
  return to.startsWith('room:') ? 'v-in' : 'v-out';
}

export function renderView(): void {
  const s = S();
  const view = el('view');
  const key = sceneKey();
  const move = transitionFor(lastScene, key);
  lastScene = key;

  // Wo der Spieler in den Regalwänden gerade steht, überlebt das Neuschreiben.
  const gescrollt = scrollMerken(view);

  // Ein begehbarer Raum braucht die Höhe: Der Flur darüber verschwindet, solange
  // man drin ist — man steht ja im Zimmer und nicht davor.
  const imRaum = !!s.room && !!SZENEN[s.room] && s.elevBusy === 0;
  setWorldVisible(S().g.opt.world && !imRaum);
  document.body.classList.toggle('im-raum', imRaum);
  document.body.classList.toggle('fenster-offen', (imRaum && !!s.fenster) || s.uebersicht);
  // Freie Plätze zeigen an, dass sie nehmen würden, was in der Hand liegt.
  document.body.classList.toggle('hat-hand', !!s.hand);

  if (s.elevBusy > 0) view.innerHTML = viewElevator();
  else if (!s.room) view.innerHTML = viewTower();
  else if (SZENEN[s.room]) view.innerHTML = viewRaumszene(s.room);
  else view.innerHTML = ROOMS[s.room]();

  // Die Übersicht liegt über allem, auch über dem Brett — sie benutzt
  // dieselbe Fensterschicht wie die Räume und sieht deshalb gleich aus.
  if (s.uebersicht) {
    view.insertAdjacentHTML('beforeend',
      '<div class="fenster-grund" data-act="uebersicht"></div>' +
      '<div class="fenster" role="dialog" aria-modal="false" aria-label="Übersicht">' +
      `<div class="fenster-kopf">${icon('ui-menu')}<h2>Übersicht</h2>` +
      '<button class="fenster-zu" data-act="uebersicht" aria-label="Übersicht schließen">' +
      `${icon('ui-schliessen')}</button></div>` +
      `<div class="fenster-inhalt">${renderUebersicht()}</div></div>`);
  }

  scrollZurueck(view, gescrollt);

  view.classList.remove('v-in', 'v-out', 'v-ride', 'v-arrive');
  if (move) {
    // Ein Lesezugriff auf das Layout erzwingt den Neustart der Bewegung —
    // sonst bliebe die Klasse aus Sicht des Browsers unverändert.
    void view.offsetWidth;
    view.classList.add(move);
  }
  bindView();
}

/** Beim Laden eines Spielstands gibt es keine Vorgeschichte zu bewegen. */
export function resetScene(): void {
  lastScene = '';
}

function bindView(): void {
  const view = el('view');
  view.querySelectorAll<HTMLElement>('[data-act]').forEach((n) => {
    activate(n, () => runAction(n.dataset.act!, { ...n.dataset }));
  });
  view.querySelectorAll<HTMLElement>('[data-go]').forEach((n) => {
    activate(n, () => goFloor(Number(n.dataset.go)));
  });
  bindBoard(view);
}

/**
 * Ein Raum, den es als Szene gibt: das Bild füllt die Ansicht, darunter die
 * Leiste mit denselben Punkten, und darüber — falls eines offen ist — das
 * Fenster mit dem eigentlichen Inhalt.
 */
function viewRaumszene(room: RoomId): string {
  const s = S();
  const sz = SZENEN[room]!;
  // Ein hochformatiger Raum bekommt Konsole und Leiste daneben statt darunter.
  // Bei stehendem Bild bindet die Höhe: Was unter dem Bild liegt, nimmt ihm
  // direkt Größe weg — neben ihm liegt es auf sonst ungenutzter Breite.
  const [, , vbW, vbH] = sz.viewBox.split(/\s+/).map(Number);
  const hoch = (vbH ?? 0) / (vbW || 1) > 0.8;
  // Das Seitenverhältnis der Grafik geht ins Stilblatt: Die Fläche richtet sich
  // danach, statt die Grafik zu beschneiden. Beschneiden hatte Klickbereiche
  // gekostet — im liegenden Telefon war der Ausgang der Filmagentur zu null
  // Prozent sichtbar.
  const seite = `${vbW ?? 3} / ${vbH ?? 4}`;
  let h = `<div class="raum-szene${hoch ? ' hoch' : ''}" style="--seite:${seite}">`
    + renderSzene(sz);

  if (s.fenster) {
    const inhalt = fensterInhalt(room, s.fenster);
    if (inhalt) {
      h += '<div class="fenster-grund" data-act="fensterzu"></div>' +
        '<div class="fenster" role="dialog" aria-modal="false" ' +
        `aria-label="${esc(inhalt.titel)}">` +
        `<div class="fenster-kopf">${icon(inhalt.ico)}<h2>${esc(inhalt.titel)}</h2>` +
        `<button class="fenster-zu" data-act="fensterzu" aria-label="Fenster schließen">${icon('ui-schliessen')}</button></div>` +
        `<div class="fenster-inhalt">${inhalt.html}</div></div>`;
    }
  }
  return `${h}</div>`;
}

function viewElevator(): string {
  const s = S();
  const g = G();
  const t = s.elevTarget !== null ? FLOORS[s.elevTarget] : null;
  const done = Math.max(4, Math.min(100, (1 - s.elevBusy / (s.elevTotal || 8)) * 100));
  // Im Freien Aufbau zählt die Fahrt nicht in Spielminuten herunter — dann
  // stünde dort eine Einheit, die es gerade nicht gibt.
  const frei = g.opt.godMode;
  return '<div class="room" style="text-align:center;padding:60px 0">' +
    `<div class="bigico">${icon('ui-fahrstuhl')}</div>` +
    '<h2 style="margin:10px 0 4px">Der Fahrstuhl fährt…</h2>' +
    `<p class="dim" style="font-size:12.5px">Ziel: ${t ? esc(t.name) : '—'}` +
    `${frei ? '' : ` · noch ${s.elevBusy} Minuten`}</p>` +
    `<div class="bar" style="max-width:240px;margin:16px auto;height:7px"><i style="width:${done}%"></i></div>` +
    `<p class="hint" style="max-width:380px;margin:0 auto">${frei
      ? 'Freier Aufbau: Die Fahrt kostet keine Sendezeit und läuft auch bei angehaltener Uhr weiter.'
      : 'Zeit ist im Sendehochhaus die knappste Ressource. '
        + 'Wer unnötig Etagen wechselt, verpasst den Werbeblock.'}</p></div>`;
}

function viewTower(): string {
  const g = G();
  const s = S();

  let h = '<div class="room">';
  h += `<div class="roomhead"><div class="ico">${icon('ui-hochhaus', { cls: 'big' })}</div><div><h2>Sendehochhaus</h2>` +
    '<p>Etage wählen — der Fahrstuhl braucht seine Zeit</p></div>' +
    `<div class="backbtn" style="pointer-events:none">Etage ${s.floor + 1}</div></div>`;
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
      case 'betty': sub = `Zuneigung ${Math.round(g.player.love)} von 100`; break;
      case 'studio': sub = g.production ? `Dreht: ${g.production.def.name}` : 'frei'; break;
      case 'technik': sub = `Reichweite ${Math.round(reachOf(g.player) * 100)}%`; break;
      case 'archiv': sub = `${g.player.licences.length} Titel`; break;
      default: break;
    }
    h += `<div class="floor${i === s.floor ? ' here' : ''}" data-go="${i}" role="button" tabindex="0" ` +
      `aria-label="Etage ${i + 1}, ${esc(f.name)}">` +
      `<div class="num">${i + 1}</div><div class="ico" aria-hidden="true">${icon(f.ico)}</div>` +
      `<div class="nm">${esc(f.name)}${badge}</div>` +
      `<div class="sub">${esc(sub)}</div></div>`;
  }

  h += '</div>';
  h += '<div class="hint">Oben siehst du den Flur, in dem du gerade stehst. Ein Klick auf die Tür führt in ' +
    'den Raum, ein Klick auf den Fahrstuhl bringt dich hierher zurück.</div>';
  return h + '</div>';
}

export { BLOCKS };
