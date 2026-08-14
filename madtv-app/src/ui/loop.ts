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
  BLOCKS, BLOCK_H, DAY_END, FLOORS, SPEEDS,
  airBlock, auctionTick, endOfDay,
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
  G().time += minutes;
}

/* ─────────── Fahrstuhl ─────────── */

export function goFloor(f: number): void {
  const g = G();
  const s = S();
  if (g.over || s.elevBusy > 0) return;

  if (f === s.floor) {
    s.room = FLOORS[f]!.id;
    markDirty();
    return;
  }
  const dist = Math.abs(f - s.floor);
  // Bei aktivem Zeitdruck kostet jede Fahrt spürbar Sendetag — ohne ihn bleibt
  // es beim symbolischen Aufenthalt im Fahrstuhl.
  s.elevBusy = g.opt.timePressure ? dist * 3 + 3 : dist + 2;
  s.elevTotal = s.elevBusy;
  s.elevTarget = f;
  s.room = null;
  beginTravel(s.floor, f, s.elevTotal);
  markDirty();
}

export function leaveRoom(): void {
  S().room = null;
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

  g.time++;
  s.tickCount++;
  needTop = true;
  if (s.tickCount % 12 === 0) needView = true;

  if (s.elevBusy > 0) {
    s.elevBusy--;
    if (s.elevBusy === 0 && s.elevTarget !== null) {
      s.floor = s.elevTarget;
      s.room = FLOORS[s.floor]!.id;
      s.elevTarget = null;
      clearTravel();
      markDirty();
    }
  }

  for (let b = 0; b < BLOCKS; b++) {
    const t = (BLOCK_H[b]! < 6 ? BLOCK_H[b]! + 24 : BLOCK_H[b]!) * 60;
    if (g.time === t) {
      airBlock(g, g.day, b);
      auctionTick(g);
      if (b === 0) playSfx('onair');
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

  // Die Weltschicht ändert nur Attribute — das darf jedes Bild passieren.
  if (isMounted()) {
    const alpha = halted ? 0 : Math.min(0.999, accumulator / msPerMinute());
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
