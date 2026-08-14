/**
 * Wegplanung im Hochhaus.
 *
 * Der Weg zu einem anderen Raum zerfällt in drei Abschnitte: zum Fahrstuhl
 * laufen, fahren, zur Zimmertür laufen. Die *Kosten* stehen in Spielminuten
 * fest (das ist die Ressource, um die es im Spiel geht); die *Darstellung*
 * leitet sich daraus ab.
 *
 * Der Knackpunkt: Bei dreifachem Tempo dauert eine Spielminute 130 ms, bei
 * einfachem 620 ms. Liefe die Animation stur mit, wäre das Laufen einmal
 * hektisch und einmal zäh. Deshalb bekommen die beiden Laufabschnitte einen
 * gedeckelten Anteil, und die Fahrt schluckt den Rest — sie darf ruhig dauern,
 * man sieht ja die Etagen vorbeiziehen.
 *
 * Reine Rechnung, kein DOM: siehe tests/travel.test.ts.
 */

export type TravelPhase = 'toLift' | 'ride' | 'toDoor' | 'done';

export interface TravelPlan {
  from: number;
  to: number;
  /** Gesamtkosten in Spielminuten — die Zahl, die der Spieler bezahlt. */
  total: number;
  toLift: number;
  ride: number;
  toDoor: number;
}

/** Höchstanteil, den ein einzelner Laufabschnitt am Gesamtweg bekommt. */
const WALK_SHARE = 0.22;
/** Und höchstens so viele Spielminuten, damit Laufen nie zäh wird. */
const WALK_CAP = 4;
/** Der Fahrtabschnitt behält immer einen Rest, sonst springt die Etage. */
const MIN_RIDE = 0.5;

export function planTravel(from: number, to: number, total: number): TravelPlan {
  const t = Math.max(1, total);
  if (from === to) {
    return { from, to, total: t, toLift: 0, ride: 0, toDoor: t };
  }
  // Die Summe muss exakt den Kosten entsprechen: Laufen und Fahren teilen sich
  // dieselben Spielminuten auf, sie kommen nicht obendrauf.
  let walk = Math.min(WALK_CAP, t * WALK_SHARE);
  if (t - 2 * walk < MIN_RIDE) walk = Math.max(0, (t - MIN_RIDE) / 2);
  const ride = t - 2 * walk;
  return { from, to, total: t, toLift: walk, ride, toDoor: walk };
}

export interface TravelState {
  phase: TravelPhase;
  /** Fortschritt innerhalb des Abschnitts, 0…1. */
  t: number;
  /** Etage, in der die Kabine gerade ist — für den Etagenzähler. */
  floor: number;
  /** Bruchteil einer Etage, für den weichen Durchlauf. */
  floorOffset: number;
}

/**
 * Zustand nach `elapsed` Spielminuten. `elapsed` darf gebrochen sein — die
 * Bildschleife interpoliert zwischen zwei Minutentakten, damit es bei jeder
 * Bildrate flüssig aussieht.
 */
export function travelAt(plan: TravelPlan, elapsed: number): TravelState {
  const e = Math.max(0, elapsed);

  if (e < plan.toLift) {
    return { phase: 'toLift', t: plan.toLift ? e / plan.toLift : 1, floor: plan.from, floorOffset: 0 };
  }
  const afterWalk = e - plan.toLift;

  if (afterWalk < plan.ride) {
    const t = plan.ride ? afterWalk / plan.ride : 1;
    const span = plan.to - plan.from;
    const exact = plan.from + span * t;
    return {
      phase: 'ride',
      t,
      floor: Math.round(exact),
      floorOffset: exact - Math.round(exact),
    };
  }
  const afterRide = afterWalk - plan.ride;

  if (afterRide < plan.toDoor) {
    return { phase: 'toDoor', t: plan.toDoor ? afterRide / plan.toDoor : 1, floor: plan.to, floorOffset: 0 };
  }
  return { phase: 'done', t: 1, floor: plan.to, floorOffset: 0 };
}

/** Weiche Beschleunigung für Lauf- und Fahrbewegung. */
export function easeInOut(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
