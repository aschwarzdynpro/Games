/**
 * Einstiegspunkt.
 *
 * Verdrahtet die Module miteinander und startet den Startbildschirm.
 * Der Spielkern unter src/core kennt keines dieser Module — er läuft auch
 * ohne Browser, siehe tests/.
 */
import './style.css';

import { FLOORS } from './core';
import type { RoomId } from './core';
import { hasSession, S } from './ui/session';
import { renderAll, renderTop, renderView } from './ui/views';
import { goFloor, leaveRoom, togglePause, wireLoop } from './ui/loop';
import { closeDialog, modalOpen } from './ui/overlay';
import { showEnd, showStart, wireScreens } from './ui/screens';

wireLoop({
  render: () => { renderView(); renderTop(); },
  renderTop,
  gameOver: () => { renderAll(); showEnd(); },
});

wireScreens({
  gameStarted: () => renderAll(),
});

/* ─────────── Tastatur ─────────── */

const SHORTCUTS: Record<string, RoomId> = {
  '1': 'office', '2': 'film', '3': 'werbe', '4': 'news',
  '5': 'archiv', '6': 'studio', '7': 'betty', '8': 'chef',
};

document.addEventListener('keydown', (e) => {
  if (!hasSession()) return;
  const start = document.getElementById('start');
  if (start && start.style.display !== 'none') return;
  if (e.target instanceof HTMLInputElement) return;

  if (e.key === 'Escape') {
    if (modalOpen()) closeDialog();
    else if (S().room) leaveRoom();
    return;
  }
  if (e.key === ' ') {
    e.preventDefault();
    togglePause();
    return;
  }
  const room = SHORTCUTS[e.key];
  if (room) goFloor(FLOORS.findIndex((f) => f.id === room));
});

/**
 * Prüfhandle für automatisierte Tests im Browser. Nur lesender Zugriff auf
 * Zustand und Kernfunktionen — das Spiel selbst nutzt es nicht.
 */
declare global {
  interface Window { madtv?: { session: typeof S; core: typeof core } }
}
import * as core from './core';
window.madtv = { session: S, core };

showStart();
