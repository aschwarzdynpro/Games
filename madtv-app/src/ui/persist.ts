/**
 * Speicherstände im Browser.
 *
 * Der Kern liefert seinen Zustand als Zeichenkette; die Oberfläche legt ihre
 * eigenen Angaben (Etage, Raum, Tempo) daneben. So bleibt der Kern frei von
 * Wissen über Fahrstühle und Bildschirme.
 */
import { deserialize, serialize } from '../core';
import type { Game, Options, RoomId } from '../core';
import type { Session } from './session';

const SLOT_PREFIX = 'madtv_slot_v3_';
const AUTO_KEY = 'madtv_auto_v3';
const OPT_KEY = 'madtv_opt_v3';

interface SavedUi {
  floor: number;
  room: RoomId | null;
  speed: number;
}

interface Envelope {
  core: string;
  ui: SavedUi;
  savedAt: number;
}

export interface SlotInfo {
  slot: number;
  name: string;
  day: number;
  image: number;
  diff: string;
  envelope: Envelope;
}

function key(slot: number): string {
  return slot === 0 ? AUTO_KEY : SLOT_PREFIX + slot;
}

export const SLOT_COUNT = 3;

export function writeSlot(slot: number, g: Game, s: Session): boolean {
  try {
    const env: Envelope = {
      core: serialize(g),
      ui: { floor: s.floor, room: s.room, speed: s.speed },
      savedAt: Date.now(),
    };
    localStorage.setItem(key(slot), JSON.stringify(env));
    return true;
  } catch {
    return false;
  }
}

export function autosave(g: Game): void {
  try {
    const env: Envelope = {
      core: serialize(g),
      ui: { floor: 6, room: 'office', speed: 2 },
      savedAt: Date.now(),
    };
    localStorage.setItem(AUTO_KEY, JSON.stringify(env));
  } catch {
    // Speicher voll oder gesperrt — kein Grund, das Spiel anzuhalten.
  }
}

export function readSlot(slot: number): SlotInfo | null {
  try {
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope;
    const core = JSON.parse(env.core) as {
      day: number;
      diff: string;
      ch: { name: string; image: number }[];
    };
    return {
      slot,
      name: core.ch?.[0]?.name ?? '—',
      day: core.day,
      image: core.ch?.[0]?.image ?? 0,
      diff: core.diff,
      envelope: env,
    };
  } catch {
    return null;
  }
}

export function anySave(): boolean {
  for (let i = 0; i <= SLOT_COUNT; i++) if (readSlot(i)) return true;
  return false;
}

export function listSlots(): SlotInfo[] {
  const out: SlotInfo[] = [];
  for (let i = 0; i <= SLOT_COUNT; i++) {
    const info = readSlot(i);
    if (info) out.push(info);
  }
  return out;
}

/** Liefert Spielzustand und die gespeicherte Oberflächenlage. */
export function loadSlot(slot: number): { g: Game; ui: SavedUi } | null {
  const info = readSlot(slot);
  if (!info) return null;
  return { g: deserialize(info.envelope.core), ui: info.envelope.ui };
}

/* ─────────── Einstellungen ─────────── */

export function saveOptions(opt: Options): void {
  try {
    localStorage.setItem(OPT_KEY, JSON.stringify(opt));
  } catch {
    // ignorieren
  }
}

export function loadOptions(): Partial<Options> {
  try {
    const raw = localStorage.getItem(OPT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Options>) : {};
  } catch {
    return {};
  }
}
