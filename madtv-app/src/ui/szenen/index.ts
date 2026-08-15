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
  filmAuktion, filmKatalog, filmPaket, genreKonjunktur,
  werbeArbeitsplatz, zielgruppen,
  bettyGespraech, bettyKonkurrenz, bettyMitbringsel, bettyZuneigung,
} from '../rooms';
import { BUERO } from './buero';
import { CHEF } from './chef';
import { FILM } from './film';
import { WERBE } from './werbe';
import { BETTY } from './betty';

const ALLE: Partial<Record<RoomId, Raumszene>> = {
  office: BUERO,
  chef: CHEF,
  film: FILM,
  werbe: WERBE,
  betty: BETTY,
};

/**
 * Ein Raum ohne Hintergrund ist keine Szene.
 *
 * In der Einzeldatei fehlen die Bilder (siehe `ohneRaumbilder()` in
 * `vite.config.ts`), und `bild` ist dann eine leere Zeichenkette. Ein Raum
 * bliebe damit als Fläche mit Klickpunkten über nichts übrig — schlechter als
 * das Panel, das es weiterhin gibt. Die Prüfung hier sortiert solche Räume aus,
 * und `renderView()` greift von selbst zum Panel zurück.
 *
 * Dieselbe Regel trägt später gezeichnete Szenen mit: Wer `malen` hat, bleibt
 * drin, auch ohne Bilddatei.
 */
export const SZENEN: Partial<Record<RoomId, Raumszene>> = Object.fromEntries(
  Object.entries(ALLE).filter(([, sz]) => sz.bild || sz.malen),
) as Partial<Record<RoomId, Raumszene>>;

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

  if (room === 'film') {
    switch (welches) {
      case 'katalog':
        return bau('Filmkatalog', 'flr-film', filmKatalog(), 'Das Regal ist leer.');
      case 'auktion':
        return bau('Auktion', 'ui-hammer', filmAuktion(),
          'Zurzeit wird nichts versteigert. Der Verleih kündigt eine Auktion an, wenn ein '
          + 'Titel dabei ist, um den sich mehrere Sender reißen.');
      case 'paket':
        return bau('Exklusivpaket', 'ui-karton', filmPaket(),
          'Das Paket ist verkauft — die fünf Titel stehen in deinem Archiv.');
      case 'trend':
        return bau('Genre-Konjunktur', 'ui-diagramm', genreKonjunktur(), 'Noch keine Bewegung.');
      default:
        return null;
    }
  }

  if (room === 'werbe') {
    switch (welches) {
      // Kartei und Koffer in *einem* Fenster: Zwischen ihnen läuft die
      // Ziehgeste, und aus einem geschlossenen Fenster zieht man in kein
      // offenes. Deshalb führen beide Klickpunkte hierher.
      case 'kartei':
        return bau('Kundenkartei', 'flr-werbe', werbeArbeitsplatz(),
          'Die Kartei ist leer. Morgen liegen neue Karten da.');
      case 'zielgruppen':
        return bau('Zielgruppen', 'ui-diagramm', zielgruppen(), 'Noch keine Zahlen.');
      case 'vertraege':
        return bau('Laufende Verträge', 'ui-buch', bueroKoffer(), 'Kein Vertrag im Koffer.');
      default:
        return null;
    }
  }

  if (room === 'betty') {
    switch (welches) {
      // Betty und die Tasche in *einem* Fenster: Die Figurenbox ist das
      // Ablageziel für Geschenke, und aus einem geschlossenen Fenster zieht
      // man in kein offenes. Deshalb führen beide Klickpunkte hierher.
      case 'betty':
        return bau('Betty Botterbloom', 'flr-betty',
          bettyGespraech() + bettyMitbringsel(), 'Sie ist gerade nicht da.');
      case 'zuneigung':
        return bau('Wie es um euch steht', 'ui-herz', bettyZuneigung(), 'Noch nichts passiert.');
      case 'konkurrenz':
        return bau('Was die Konkurrenz treibt', 'ui-buch', bettyKonkurrenz(),
          'Von der Konkurrenz war hier noch niemand.');
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
