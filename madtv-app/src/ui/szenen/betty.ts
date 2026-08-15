/**
 * Bettys Büro — als Bild.
 *
 * Der erste Raum, in dem ein Mensch sitzt. Das ändert weniger als gedacht: Die
 * Klickpunkte liegen wie überall im Raster über dem Bild. Es ändert aber, wo
 * man hinfasst — man klickt hier auf *sie*, nicht auf ein Gerät.
 *
 * Zwei Punkte teilen sich ein Fenster, so wie Karteikasten und Koffer in der
 * Werbeagentur: Ein Geschenk wandert per Zug aus der Tasche auf ihren
 * Schreibtisch, und die Figurenbox ist zugleich das Ablageziel. Betty und die
 * Schreibunterlage öffnen deshalb dasselbe Fenster.
 *
 * Die Kaffeekanne ist kein Fenster, sondern ein Griff: Sie löst unmittelbar
 * «Auf einen Kaffee bleiben» aus. Ein Fenster mit einem einzigen Knopf darin
 * wäre eine Tür vor einer Tür.
 */
import bild from '../../assets/szenen/betty.webp';
import type { Klickpunkt, Raumszene } from '../szene';

/** Maße des Bildzuschnitts in seinen eigenen Bildpunkten. */
const BILD_W = 1040;
const BILD_H = 1387;
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

export const BETTY: Raumszene = {
  viewBox: `0 0 ${W} ${H}`,
  beschreibung: 'Bettys Büro: Betty Botterbloom sitzt hinter ihrem Schreibtisch und blickt auf, '
    + 'links eine Vase mit Blumen und eine freie Schreibunterlage, davor ein Kaffeegedeck, '
    + 'rechts Theaterprogramme; hinter ihr Kunstbände und Ballettplakate, links die Tür',
  bild,
  punkte: [
    ausBild({
      x: 330, y: 400, w: 480, h: 470,
      titel: 'Betty', hinweis: 'Reden und Geschenke übergeben', ico: 'flr-betty',
      act: 'fenster', daten: { f: 'betty' },
    }),
    ausBild({
      // Der freie Fleck auf der Lederunterlage — im Spiel das Ablageziel.
      x: 215, y: 890, w: 295, h: 265,
      titel: 'Schreibunterlage', hinweis: 'Geschenk hierher legen', ico: 'ui-karton',
      act: 'fenster', daten: { f: 'betty' },
    }),
    ausBild({
      x: 518, y: 918, w: 310, h: 265,
      titel: 'Kaffeegedeck', hinweis: 'Auf einen Kaffee bleiben', ico: 'ui-uhr',
      act: 'visit',
    }),
    ausBild({
      x: 0, y: 645, w: 200, h: 490,
      titel: 'Blumenvase', hinweis: 'Wie es um euch steht', ico: 'gsh-blume',
      act: 'fenster', daten: { f: 'zuneigung' },
    }),
    ausBild({
      x: 848, y: 1005, w: 190, h: 320,
      titel: 'Programmhefte', hinweis: 'Was die Konkurrenz treibt', ico: 'ui-buch',
      act: 'fenster', daten: { f: 'konkurrenz' },
    }),
    ausBild({
      x: 6, y: 60, w: 184, h: 480,
      titel: 'Tür', hinweis: 'Zurück in den Flur', ico: 'ui-hochhaus',
      act: 'back',
    }),
  ],
};
