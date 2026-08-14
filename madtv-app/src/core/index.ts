/**
 * Fassade des Spielkerns.
 *
 * Der Kern ist frei von DOM, Timern und Rendering: er lässt sich in einem Test
 * über hundert Spieltage laufen lassen, ohne dass ein Browser beteiligt ist.
 * Alles, was der Spieler sehen soll, verlässt ihn als GameEvent.
 */
export * from './types';
export * from './constants';
export * from './format';
export { Rng, hash, clamp } from './rng';
export {
  GENRES, GROUPS, GIDX, RESSORTS, FLOORS, DIFFS, GIFTS, STARS, PRODUCTIONS,
  HEADLINES, BRANDS, FILM_DATA, SERIE_DATA,
} from './data';
export {
  newGame, makeChannel, makeLicence, copyLicence, buildCatalog, getDay, emptyDay,
  reachOf, buyLicence, removeFromSchedules, refreshMarket, refreshAdMarket,
  rollNews, makeContract, makeNews, initTrends, driftTrends, trendOf,
  nextUid, emit, toast, dialog, sfx,
} from './state';
export type { NewGameOpts } from './state';
export {
  newsAttraction, newsAge, blockAttraction, estimateBlock, airBlock, airRemainingBlocks,
} from './ratings';
export {
  endOfDay, dailyCosts, updateBetty, sammyAwards, bossCheck, randomEvent,
  maybeAuction, auctionTick, closeAuction, checkEnd,
} from './economy';
export { aiTurn, aiPlanDay, aiBootstrap, progScore, estimateAudience } from './ai';
export { serialize, deserialize, SAVE_VERSION } from './save';
export type { SavedGame } from './save';

import { newGame as createRaw, refreshMarket } from './state';
import { aiBootstrap } from './ai';
import type { NewGameOpts } from './state';
import type { Game } from './types';

/**
 * Startfertige Partie: Welt erzeugen und die Konkurrenz ihren ersten Sendetag
 * planen lassen. Ohne den zweiten Schritt liefe bei ihr an Tag 1 Testbild.
 *
 * Danach wird der Filmmarkt aufgefüllt — die KI hat sich beim Planen bedient,
 * und der Spieler soll an Tag 1 nicht vor leeren Regalen stehen.
 */
export function createGame(opts: NewGameOpts = {}): Game {
  const g = createRaw(opts);
  aiBootstrap(g);
  refreshMarket(g, false);
  return g;
}
