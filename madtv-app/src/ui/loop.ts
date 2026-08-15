/**
 * Spieluhr mit festem Zeitschritt.
 *
 * Vorher lief die Simulation direkt auf setInterval: ein Timer-Tick war eine
 * Spielminute. Für Animationen taugt das nicht — die Bildrate hing an der
 * Spielgeschwindigkeit, und bei Stufe 1 wären es 1,6 Bilder je Sekunde.
 *
 * Jetzt zeichnet requestAnimationFrame mit voller Bildrate, während ein
 * Sammler die vergangene Zeit in Spielminuten zerlegt. Die Simulation läuft
 * damit in gleichmäßigen Schritten, unabhängig davon, wie oft gezeichnet wird.
 * `alpha` — der angebrochene Rest der laufenden Minute — geht an die
 * Weltschicht, damit die Figur nicht im Minutentakt ruckt.
 */
import {
  DAY_END, FLOORS, SLOTS, SPEEDS,
  airBlock, auctionTick, currentSlot, endOfDay, isAdSlot, slotTime,
} from '../core';
import type { GameEvent } from '../core';
import { G, S, markDirty } from './session';
import { dialog, modalHoldsClock, toast } from './overlay';
import { playSfx } from './sfx';
import { autosave } from './persist';
import { isDragging } from './drag';
import { beginTravel, clearTravel, isMounted, updateWorld } from '../world/world';

/** Größter Zeitsprung, der auf einmal nachgeholt wird (Tab war im Hintergrund). */
const MAX_FRAME_MS = 250;

let raf = 0;
let lastTs = 0;
let accumulator = 0;
let running = false;

let onRender: () => void = () => {};
let onRenderTop: () => void = () => {};
let onGameOver: () => void = () => {};

export function wireLoop(fns: {
  render: () => void;
  renderTop: () => void;
  gameOver: () => void;
}): void {
  onRender = fns.render;
  onRenderTop = fns.renderTop;
  onGameOver = fns.gameOver;
}

export function startLoop(): void {
  stopLoop();
  running = true;
  lastTs = 0;
  accumulator = 0;
  raf = requestAnimationFrame(frame);
}

export function stopLoop(): void {
  running = false;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
}

function msPerMinute(): number {
  return SPEEDS[S().speed] ?? SPEEDS[2]!;
}

export function setSpeed(v: number): void {
  const s = S();
  s.speed = v;
  s.paused = false;
  accumulator = 0;
  markDirty();
  needTop = true;
}

export function togglePause(force?: boolean): void {
  const s = S();
  s.paused = force ?? !s.paused;
  accumulator = 0;
  markDirty();
  needTop = true;
}

export function addTime(minutes: number): void {
  // Im Freien Aufbau ist Zeit keine Ressource — dann kostet nichts Minuten.
  if (G().opt.godMode) return;
  G().time += minutes;
}

/* ─────────── Fahrstuhl ─────────── */

export function goFloor(f: number): void {
  const g = G();
  const s = S();
  if (g.over || s.elevBusy > 0) return;

  // Ein Raumwechsel schließt das Fenster: Es gehört zu dem Raum, in dem es
  // aufging, und nicht zum nächsten.
  s.fenster = null;
  if (f === s.floor) {
    s.room = FLOORS[f]!.id;
    markDirty();
    return;
  }
  const dist = Math.abs(f - s.floor);
  // Bei aktivem Zeitdruck kostet jede Fahrt spürbar Sendetag — ohne ihn bleibt
  // es beim symbolischen Aufenthalt im Fahrstuhl. Im Freien Aufbau zählt die
  // Fahrt nicht in Spielminuten, sondern in Echtzeit herunter (siehe
  // `fahrstuhlEchtzeit`); die Länge ist dann nur noch die der Animation.
  s.elevBusy = g.opt.godMode ? dist + 2 : g.opt.timePressure ? dist * 3 + 3 : dist + 2;
  s.elevTotal = s.elevBusy;
  s.elevTarget = f;
  s.room = null;
  elevMs = 0;
  beginTravel(s.floor, f, s.elevTotal);
  markDirty();
}

/**
 * Ankommen, ohne dass die Uhr läuft.
 *
 * Der Fahrstuhl zählt sonst in `stepMinute` herunter — steht die Uhr, kommt man
 * nie an und sitzt bis zum Fortsetzen im Schacht fest. Genau das nimmt der
 * Freie Aufbau weg: Die Fahrt läuft an der Bildschleife statt an der Spieluhr,
 * unabhängig von Pause und Geschwindigkeit.
 */
const ELEV_MS = 80;
let elevMs = 0;

function fahrstuhlEchtzeit(dt: number): boolean {
  const s = S();
  if (s.elevBusy <= 0) return false;
  elevMs += dt;
  while (elevMs >= ELEV_MS && s.elevBusy > 0) {
    elevMs -= ELEV_MS;
    s.elevBusy--;
    // Die Figur im Flur bewegt die Weltschicht Bild für Bild; das Panel
    // darunter zeigt nur einen Balken und braucht nicht jeden Schritt einen
    // neuen Aufbau aus HTML.
    if (s.elevBusy % 3 === 0) { needView = true; markDirty(); }
  }
  if (s.elevBusy === 0 && s.elevTarget !== null) angekommen();
  return true;
}

/** Der letzte Schritt jeder Fahrt — aus dem Schacht in den Raum. */
function angekommen(): void {
  const s = S();
  if (s.elevTarget === null) return;
  s.fenster = null;
  s.floor = s.elevTarget;
  s.room = FLOORS[s.floor]!.id;
  s.elevTarget = null;
  clearTravel();
  markDirty();
}

export function leaveRoom(): void {
  const s = S();
  s.room = null;
  s.fenster = null;
  markDirty();
}

/* ─────────── Meldungen des Kerns ─────────── */

export function drainEvents(): void {
  const g = G();
  if (!g.events.length) return;
  const events: GameEvent[] = g.events.splice(0, g.events.length);
  for (const e of events) {
    switch (e.kind) {
      case 'toast': toast(e.level, e.title, e.text); break;
      case 'sfx': playSfx(e.name); break;
      case 'dialog': dialog(e.ico, e.title, e.who, e.html, e.buttons ?? []); break;
      case 'blockAired': markDirty(); break;
    }
  }
}

/* ─────────── Ein Simulationsschritt = eine Spielminute ─────────── */

/** Panels und Kopfzeile werden nur neu gebaut, wenn sich etwas geändert hat. */
let needTop = true;
let needView = true;

function stepMinute(): boolean {
  const s = S();
  const g = s.g;

  const vorher = currentSlot(g.time);
  g.time++;
  s.tickCount++;
  needTop = true;
  if (s.tickCount % 12 === 0) needView = true;
  // Wechselt das laufende Feld, muss die Tafel sofort nachziehen — sonst
  // stünde der Sendemarker bis zu zwölf Minuten auf dem falschen Platz.
  if (currentSlot(g.time) !== vorher) needView = true;

  // Im Freien Aufbau fährt der Fahrstuhl an der Bildschleife, nicht an der Uhr.
  if (s.elevBusy > 0 && !g.opt.godMode) {
    s.elevBusy--;
    if (s.elevBusy === 0) angekommen();
  }

  // Jedes Halbstundenfeld geht zu seiner eigenen Zeit auf Sendung.
  //
  // Bis hierher lief diese Schleife noch über die sieben Werbeblöcke und
  // benutzte deren Nummer als Feldnummer — ein Überbleibsel aus der Zeit vor
  // dem Halbstundenraster. Um 21:00 ging dadurch das 19:30-Feld auf Sendung,
  // und die Felder 7 bis 13 liefen live überhaupt nie, sondern wurden erst
  // beim Tagesabschluss in einem Rutsch abgerechnet.
  for (let i = 0; i < SLOTS; i++) {
    if (g.time === slotTime(i)) {
      airBlock(g, g.day, i);
      if (isAdSlot(i)) auctionTick(g);
      if (i === 0) playSfx('onair');
      markDirty();
    }
  }

  if (g.time >= DAY_END) {
    endOfDay(g);
    markDirty();
    drainEvents();
    if (g.over) { stopLoop(); onGameOver(); return false; }
    autosave(g);
  }

  drainEvents();
  return true;
}

/* ─────────── Bildschleife ─────────── */

function frame(ts: number): void {
  if (!running) return;
  raf = requestAnimationFrame(frame);

  const s = S();
  const dt = lastTs ? Math.min(ts - lastTs, MAX_FRAME_MS) : 0;
  lastTs = ts;

  // Erzähldialoge halten die Uhr an, Auswahldialoge nicht.
  const halted = s.g.over || s.paused || modalHoldsClock();
  if (!halted) {
    accumulator += dt;
    const step = msPerMinute();
    let guard = 0;
    while (accumulator >= step && guard++ < 240) {
      accumulator -= step;
      if (!stepMinute()) return;
    }
  }

  // Der Fahrstuhl im Freien Aufbau — er fährt auch dann, wenn oben nichts lief.
  const eigeneFahrt = s.g.opt.godMode && !s.g.over && fahrstuhlEchtzeit(dt);

  // Die Weltschicht ändert nur Attribute — das darf jedes Bild passieren.
  if (isMounted()) {
    const alpha = eigeneFahrt
      ? Math.min(0.999, elevMs / ELEV_MS)
      : halted ? 0 : Math.min(0.999, accumulator / msPerMinute());
    updateWorld(alpha);
  }

  // Die Panels dagegen werden aus HTML neu gebaut; das nur bei Bedarf — und
  // niemals mitten in einem Zug, sonst löst sich die Karte unter dem Zeiger auf.
  if (needTop) { onRenderTop(); needTop = false; }
  if ((s.dirty || needView) && !isDragging()) {
    onRender();
    s.dirty = false;
    needView = false;
  }
}
