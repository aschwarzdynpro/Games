/**
 * Die Filmagentur — als Bild.
 *
 * Der dritte Raum mit fertigem Hintergrund. Wie bei den Büros steckt das Bild
 * als Daten-URI im Bündel (`?inline`), damit die Einzeldatei zum Doppelklicken
 * ohne Nebendateien auskommt.
 *
 * Dieses Bild ist teurer als die beiden Büros: 218 statt rund 120 KB. Es zeigt
 * dutzende beschriftete Filmrollen und zwei Bildschirme voller Text — genau
 * die feine Zeichnung, die ein Bildkomprimierer nicht wegwerfen kann, ohne dass
 * es matschig aussieht. Der Zuschnitt wurde deshalb von 1254 auf 1040 Punkte
 * verkleinert; darstellbar sind ohnehin höchstens rund 780.
 *
 * Das Bild ist quadratisch, anders als die hochformatigen Büros. Für die
 * Aufteilung zählt das als „stehend" (Höhe/Breite über 0,8) — im Querformat
 * wandern Konsole und Leiste also auch hier an die Seite, was richtig ist:
 * Ein quadratisches Bild bindet auf einem liegenden Bildschirm über die Höhe.
 */
import bild from '../../assets/szenen/film.webp?inline';
import type { Klickpunkt, Raumszene } from '../szene';

/** Maße des Bildzuschnitts in seinen eigenen Bildpunkten. */
const BILD_W = 1040;
const BILD_H = 1040;
const W = 1600;
const SKALA = W / BILD_W;
const H = Math.round(BILD_H * SKALA);

/**
 * Ein Klickpunkt, abgelesen in Bildpunkten des Zuschnitts.
 *
 * Abgelesen wurde am Originalbild mit 1254 Punkten Kantenlänge; die Zahlen hier
 * stehen im verkleinerten Raster von 1040. Wer nachmessen will, legt ein Gitter
 * über `src/assets/szenen/film.webp` — nicht über die Vorlage.
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
 * Die Reihenfolge ist die der Wichtigkeit, nicht die der Zeichnung: Sie
 * bestimmt auch die Knopfleiste unter dem Bild, und dort gehört der Laptop nach
 * vorn — er ist der Grund, warum man diesen Raum betritt.
 *
 * Damit das geht, überschneiden sich die Rechtecke nicht. Bei Überlappung
 * gewönne sonst der später stehende Punkt, und die Anordnung im Bild wäre
 * heimlich an die Anordnung in der Leiste gekoppelt. Die Rollenreihe beginnt
 * deshalb erst unterhalb des Laptops, das Regal endet an seiner linken Kante.
 */
export const FILM: Raumszene = {
  viewBox: `0 0 ${W} ${H}`,
  beschreibung: 'Filmagentur: ein Schreibtisch voller beschrifteter Filmrollen, davor ein Laptop '
    + 'mit dem Katalog und ein Monitor mit den Angaben zum ausgewählten Titel, dahinter das Regal '
    + 'mit weiteren Rollen und das Fenster zur Stadt',
  bild,
  punkte: [
    ausBild({
      x: 438, y: 396, w: 297, h: 249,
      titel: 'Laptop', hinweis: 'Filmkatalog durchsehen', ico: 'flr-film',
      act: 'fenster', daten: { f: 'katalog' },
    }),
    ausBild({
      x: 767, y: 348, w: 249, h: 297,
      titel: 'Angebotsmonitor', hinweis: 'Laufende Auktion', ico: 'ui-hammer',
      act: 'fenster', daten: { f: 'auktion' },
    }),
    ausBild({
      x: 51, y: 648, w: 580, h: 262,
      titel: 'Rollenbündel', hinweis: 'Das Exklusivpaket', ico: 'ui-karton',
      act: 'fenster', daten: { f: 'paket' },
    }),
    ausBild({
      x: 217, y: 15, w: 221, h: 470,
      titel: 'Regalwand', hinweis: 'Was gerade gefragt ist', ico: 'ui-diagramm',
      act: 'fenster', daten: { f: 'trend' },
    }),
    ausBild({
      // Es gibt keine Tür im Bild. Der Sessel ist der ehrlichere Ausgang:
      // Man steht auf und geht — das ist ohnehin, was man tut.
      x: 7, y: 912, w: 209, h: 122,
      titel: 'Sessel', hinweis: 'Aufstehen, zurück in den Flur', ico: 'ui-hochhaus',
      act: 'back',
    }),
  ],
};
