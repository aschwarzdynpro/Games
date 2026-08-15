/**
 * Sitzungszustand der Oberfläche.
 *
 * Bewusst getrennt vom Spielkern: in welcher Etage man steht, welcher Raum
 * offen ist und wie schnell die Uhr läuft, geht die Simulation nichts an.
 * Der Kern muss ohne Browser lauffähig bleiben.
 */
import type { Game, RoomId } from '../core';
import { FLOORS } from '../core';

export interface Session {
  g: Game;
  /** Etage 0 = unten. */
  floor: number;
  /** Offener Raum; null zeigt die Hochhausansicht. */
  room: RoomId | null;
  /** Verbleibende Fahrzeit in Spielminuten. */
  elevBusy: number;
  elevTotal: number;
  elevTarget: number | null;
  speed: number;
  paused: boolean;
  /** 0 = heute, 1 = morgen … im Sendeplan. */
  viewDay: number;
  filmFilter: string;
  /**
   * Welches Fenster gerade über der Raumszene liegt — null, wenn man den Raum
   * einfach nur ansieht. Der Inhalt wird bei jedem Neuzeichnen frisch gebaut,
   * damit im offenen Fenster dieselben Zahlen stehen wie überall sonst.
   */
  fenster: string | null;
  dirty: boolean;
  tickCount: number;
}

let session: Session | null = null;

export function startSession(g: Game): Session {
  session = {
    g,
    floor: FLOORS.findIndex((f) => f.id === 'office'),
    room: 'office',
    elevBusy: 0, elevTotal: 0, elevTarget: null,
    speed: 2, paused: false,
    viewDay: 0,
    filmFilter: 'alle',
    fenster: null,
    dirty: true,
    tickCount: 0,
  };
  return session;
}

/** Aktive Sitzung. Wirft, wenn noch kein Spiel läuft — das wäre ein Fehler. */
export function S(): Session {
  if (!session) throw new Error('Keine laufende Sitzung');
  return session;
}

export function hasSession(): boolean {
  return session !== null;
}

/** Kurzform für den Spielzustand. */
export function G(): Game {
  return S().g;
}

export function markDirty(): void {
  if (session) session.dirty = true;
}
