/**
 * Spieluhr, Fahrstuhl und die Übergabe der Kern-Meldungen an die Oberfläche.
 *
 * Noch als setInterval wie in der Einzeldatei-Fassung. In Etappe 2 wird daraus
 * eine requestAnimationFrame-Schleife mit festem Zeitschritt, damit Animationen
 * flüssig laufen, ohne die Simulation an die Bildrate zu koppeln.
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

let timer: number | null = null;

/** Vom Hauptmodul gesetzt, um Ringabhängigkeiten zu vermeiden. */
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
  scheduleTicks();
}

export function stopLoop(): void {
  if (timer !== null) { clearInterval(timer); timer = null; }
}

function scheduleTicks(): void {
  stopLoop();
  timer = window.setInterval(tick, SPEEDS[S().speed] ?? 330);
}

export function setSpeed(v: number): void {
  const s = S();
  s.speed = v;
  s.paused = false;
  scheduleTicks();
  markDirty();
  onRender();
}

export function togglePause(force?: boolean): void {
  const s = S();
  s.paused = force ?? !s.paused;
  markDirty();
  onRenderTop();
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
    onRender();
    return;
  }
  const dist = Math.abs(f - s.floor);
  // Bei aktivem Zeitdruck kostet jede Fahrt spürbar Sendetag — ohne ihn bleibt
  // es beim symbolischen Aufenthalt im Fahrstuhl.
  s.elevBusy = g.opt.timePressure ? dist * 3 + 3 : dist + 2;
  s.elevTotal = s.elevBusy;
  s.elevTarget = f;
  s.room = null;
  markDirty();
  onRender();
}

export function leaveRoom(): void {
  S().room = null;
  markDirty();
  onRender();
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

/* ─────────── Takt ─────────── */

function tick(): void {
  const s = S();
  const g = s.g;

  // Erzähldialoge halten die Uhr an, Auswahldialoge nicht.
  if (g.over || s.paused || modalHoldsClock()) { onRenderTop(); return; }

  g.time++;
  s.tickCount++;

  if (s.elevBusy > 0) {
    s.elevBusy--;
    if (s.elevBusy === 0 && s.elevTarget !== null) {
      s.floor = s.elevTarget;
      s.room = FLOORS[s.floor]!.id;
      s.elevTarget = null;
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
    if (g.over) { stopLoop(); onGameOver(); return; }
    autosave(g);
  }

  drainEvents();
  onRenderTop();
  if (s.dirty || s.tickCount % 12 === 0) {
    onRender();
    s.dirty = false;
  }
}
