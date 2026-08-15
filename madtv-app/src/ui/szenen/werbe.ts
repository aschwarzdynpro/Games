/**
 * Die Werbeagentur — als Bild.
 *
 * Der erste Raum, der sich nicht beliebig zerlegen ließ. Zwischen Kundenkartei
 * und Koffer läuft eine Ziehgeste, und aus einem geschlossenen Fenster kann man
 * in kein offenes ziehen. Karteikasten und Koffer öffnen deshalb *dasselbe*
 * Fenster — zwei Griffe an dieselbe Arbeitsfläche, was sie im Bild ja auch
 * sind: Man nimmt eine Karte aus dem Kasten und legt sie in den Koffer daneben.
 *
 * Der Zuschnitt misst 1040×1387 Bildpunkte, 141 KB — halb so schwer wie die
 * Filmagentur, weil hier nur ein Bildschirm Text trägt statt zwei plus
 * dutzender beschrifteter Rollen.
 */
import bild from '../../assets/szenen/werbe.webp';
import type { Klickpunkt, Raumszene } from '../szene';

/** Maße des Bildzuschnitts in seinen eigenen Bildpunkten. */
const BILD_W = 1040;
const BILD_H = 1387;
const W = 1600;
const SKALA = W / BILD_W;
const H = Math.round(BILD_H * SKALA);

/**
 * Ein Klickpunkt, abgelesen in Bildpunkten des Zuschnitts.
 *
 * Abgelesen wurde am Originalbild mit 1086 Punkten Breite; die Zahlen hier sind
 * auf 1040 umgerechnet. Wer nachmessen will, legt ein Gitter über
 * `src/assets/szenen/werbe.webp` — nicht über die Vorlage.
 */
function ausBild(p: Klickpunkt): Klickpunkt {
  return {
    ...p,
    x: Math.round(p.x * SKALA),
    y: Math.round(p.y * SKALA),
    w: Math.round(p.w * SKALA),
    h: Math.round(p.h * SKALA),
  };
}

/**
 * Reihenfolge nach Wichtigkeit — sie bestimmt auch die Knopfleiste unter dem
 * Bild. Die Rechtecke überschneiden sich nicht; eine Prüfung im Browser hält
 * das fest.
 *
 * Die Tür sitzt auf der oberen Türfüllung, nicht auf dem Griff: Die
 * Schreibtischlampe steht davor und deckt die Mitte der Tür ab.
 */
export const WERBE: Raumszene = {
  viewBox: `0 0 ${W} ${H}`,
  beschreibung: 'Werbeagentur: ein Schreibtisch mit offenem Aktenkoffer, links ein Karteikasten '
    + 'voller Kundenkarten, rechts ein Monitor mit den Zielgruppen, davor ein unterschriebener '
    + 'Vertrag und ein Telefon; links die Tür',
  bild,
  punkte: [
    ausBild({
      x: 56, y: 632, w: 260, h: 278,
      titel: 'Karteikasten', hinweis: 'Kundenkarten und Koffer', ico: 'ui-ordner',
      act: 'fenster', daten: { f: 'kartei' },
    }),
    ausBild({
      x: 326, y: 563, w: 383, h: 402,
      titel: 'Koffer', hinweis: 'Kundenkarten und Koffer', ico: 'flr-werbe',
      act: 'fenster', daten: { f: 'kartei' },
    }),
    ausBild({
      x: 718, y: 515, w: 316, h: 335,
      titel: 'Zielgruppenmonitor', hinweis: 'Wer zur besten Zeit zusieht', ico: 'ui-diagramm',
      act: 'fenster', daten: { f: 'zielgruppen' },
    }),
    ausBild({
      x: 527, y: 972, w: 364, h: 225,
      titel: 'Vertragsstapel', hinweis: 'Laufende Verträge', ico: 'ui-buch',
      act: 'fenster', daten: { f: 'vertraege' },
    }),
    ausBild({
      x: 6, y: 38, w: 197, h: 292,
      titel: 'Tür', hinweis: 'Zurück in den Flur', ico: 'ui-hochhaus',
      act: 'back',
    }),
  ],
};
