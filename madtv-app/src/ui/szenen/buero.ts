/**
 * Dein Büro — als Bild.
 *
 * Wie das Chefbüro: fertiges Bild statt gezeichnetem SVG, dieselbe Karte aus
 * Klickpunkten darüber. Der Zuschnitt misst 926×1010 Bildpunkte und ist damit
 * hochformatig — die Szenenschicht stellt die Konsole deshalb daneben statt
 * darunter, sonst bliebe vom Raum ein Briefmarkenbild übrig.
 *
 * Die Klickpunkte stehen in Bildpunkten des Zuschnitts, abgelesen an einem
 * Gitter über dem Bild; `ausBild()` rechnet sie ins Raster von 1600 Punkten
 * Breite, damit Schildchen und Fokusrahmen in jedem Raum gleich groß sind.
 */
import bild from '../../assets/szenen/buero.webp?inline';
import type { Klickpunkt, Raumszene } from '../szene';

const BILD_W = 926;
const BILD_H = 1010;
const W = 1600;
const SKALA = W / BILD_W;
const H = Math.round(BILD_H * SKALA);

function ausBild(p: Klickpunkt): Klickpunkt {
  return {
    ...p,
    x: Math.round(p.x * SKALA),
    y: Math.round(p.y * SKALA),
    w: Math.round(p.w * SKALA),
    h: Math.round(p.h * SKALA),
  };
}

export const BUERO: Raumszene = {
  viewBox: `0 0 ${W} ${H}`,
  beschreibung: 'Dein Büro: Schreibtisch mit Laptop, Kontrollmonitor und Notizblock, '
    + 'dahinter die Regalwand und das Fenster zur Stadt, links die Tür',
  bild,
  punkte: [
    ausBild({
      x: 555, y: 375, w: 210, h: 185,
      titel: 'Laptop', hinweis: 'Sendeplan füllen', ico: 'flr-office',
      act: 'fenster', daten: { f: 'sendeplan' },
    }),
    ausBild({
      x: 785, y: 318, w: 146, h: 228,
      titel: 'Kontrollmonitor', hinweis: 'Wer heute zugesehen hat', ico: 'ui-antenne',
      act: 'fenster', daten: { f: 'quote' },
    }),
    ausBild({
      x: 258, y: 538, w: 266, h: 152,
      titel: 'Notizblock', hinweis: 'Bilanz des Tages', ico: 'ui-buch',
      act: 'fenster', daten: { f: 'bilanz' },
    }),
    ausBild({
      x: 318, y: 22, w: 262, h: 392,
      titel: 'Regalwand', hinweis: 'Konjunktur, Verlauf, Protokoll', ico: 'flr-archiv',
      act: 'fenster', daten: { f: 'lage' },
    }),
    // Für den Werbekoffer gibt das Bild keinen Koffer her. Das Telefon ist der
    // Gegenstand, an dem im Haus Verträge hängen — der Hinweis sagt, was
    // dahintersteckt, damit niemand ein Telefonat erwartet.
    ausBild({
      x: 195, y: 403, w: 162, h: 120,
      titel: 'Telefon', hinweis: 'Laufende Werbeverträge', ico: 'flr-werbe',
      act: 'fenster', daten: { f: 'koffer' },
    }),
    ausBild({
      x: 24, y: 42, w: 182, h: 456,
      titel: 'Tür', hinweis: 'Zurück in den Flur', ico: 'ui-hochhaus',
      act: 'back',
    }),
  ],
};
