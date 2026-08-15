/**
 * Verzeichnis der begehbaren Räume.
 *
 * Ein Raum steht hier, sobald er eine Szene hat; alle übrigen zeigen weiterhin
 * ihr Panel. Der Umbau kann damit Raum für Raum passieren, ohne dass zwischen
 * zwei Ständen etwas kaputt ist.
 */
import type { RoomId } from '../../core';
import type { Raumszene } from '../szene';
import {
  bueroBilanz, bueroKoffer, bueroLage, bueroQuote, bueroSendeplan,
  chefAushang, chefKalender, chefRaffer,
} from '../rooms';
import { BUERO } from './buero';
import { CHEF } from './chef';

export const SZENEN: Partial<Record<RoomId, Raumszene>> = {
  office: BUERO,
  chef: CHEF,
};

export interface Fensterinhalt {
  titel: string;
  ico: string;
  html: string;
}

/**
 * Was hinter einem Klickpunkt steckt. Gebaut wird bei jedem Zeichnen neu —
 * im offenen Fenster stehen deshalb dieselben Zahlen wie in der Kopfzeile.
 */
export function fensterInhalt(room: RoomId, welches: string): Fensterinhalt | null {
  const bau = (titel: string, ico: string, html: string, leer: string): Fensterinhalt => ({
    // Im durchgehenden Panel darf ein Abschnitt einfach fehlen, solange es
    // nichts zu zeigen gibt. Ein leeres Fenster dagegen sähe kaputt aus — hier
    // steht dann, warum noch nichts da ist.
    titel, ico, html: html.trim() ? html : `<div class="empty-note">${leer}</div>`,
  });

  if (room === 'chef') {
    switch (welches) {
      case 'raffer':
        return bau('Herr Raffer', 'flr-chef', chefRaffer(), 'Er sagt gerade nichts.');
      case 'ranking':
        return bau('Senderanking', 'ui-diagramm', chefAushang(), 'Der Aushang ist leer.');
      case 'sammy':
        return bau('Sammy-Verleihung', 'ui-pokal', chefKalender(), 'Kein Termin angeschlagen.');
      default:
        return null;
    }
  }

  if (room !== 'office') return null;
  switch (welches) {
    case 'sendeplan':
      return bau('Sendeplan', 'flr-office', bueroSendeplan(), 'Für diesen Tag gibt es keinen Plan.');
    case 'koffer':
      return bau('Werbekoffer', 'flr-werbe', bueroKoffer(), 'Kein Vertrag im Koffer.');
    case 'quote':
      return bau('Wer hat zugesehen', 'ui-antenne', bueroQuote(),
        'Heute hat noch niemand zugesehen — der erste Block geht um 18:00 auf Sendung.');
    case 'bilanz':
      return bau('Bilanz des Tages', 'ui-buch', bueroBilanz(), 'Noch keine Zahlen.');
    case 'lage':
      return bau('Marktlage', 'flr-archiv', bueroLage(), 'Noch nichts gelaufen.');
    default:
      return null;
  }
}
