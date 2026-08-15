/**
 * Das Chefbüro — als Bild.
 *
 * Der erste Raum, dessen Hintergrund kein gezeichnetes SVG ist, sondern ein
 * fertiges Bild. Für die Szenenschicht ändert das nichts: Sie legt beides unter
 * dieselbe Karte aus Klickpunkten. Genau dafür stehen die Punkte in einem
 * eigenen Raster und nicht in Bildpunkten.
 *
 * Das Bild ist ein gewöhnlicher Baustein, keine eingebettete Daten-URI mehr.
 * Im Ordner-Build wird daraus eine eigene Datei; in der Einzeldatei ersetzt
 * `ohneRaumbilder()` aus der Vite-Konfiguration diesen Import durch eine leere
 * Zeichenkette, und der Raum fällt dort auf sein Panel zurück. Warum das so
 * ist, steht in der Konfiguration und im README.
 *
 * Das Raster ist wie überall auf 1600 Punkte Breite normiert, damit Schildchen
 * und Fokusrahmen in jedem Raum gleich groß aussehen. Der Zuschnitt misst
 * 930×787 Bildpunkte; dazwischen liegt SKALA.
 */
import bild from '../../assets/szenen/chef.webp';
import type { Klickpunkt, Raumszene } from '../szene';

/** Maße des Bildzuschnitts in seinen eigenen Bildpunkten. */
const BILD_W = 930;
const BILD_H = 787;
const W = 1600;
const SKALA = W / BILD_W;
const H = Math.round(BILD_H * SKALA);

/**
 * Ein Klickpunkt, abgelesen in Bildpunkten des Zuschnitts.
 *
 * So bleiben die Zahlen prüfbar: Gitter über das Bild legen, ablesen, was man
 * sieht, hier hinschreiben. Das Umrechnen ins Raster ist Sache dieser Funktion
 * und nicht des Auges.
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

export const CHEF: Raumszene = {
  viewBox: `0 0 ${W} ${H}`,
  beschreibung: 'Chefbüro: Herr Raffer hinter seinem Schreibtisch, dahinter das Regal mit '
    + 'Auszeichnungen und das Fenster zur Stadt, links die Tür',
  bild,
  punkte: [
    ausBild({
      x: 250, y: 150, w: 330, h: 470,
      titel: 'Herr Raffer', hinweis: 'Was er dir zu sagen hat', ico: 'flr-chef',
      act: 'fenster', daten: { f: 'raffer' },
    }),
    ausBild({
      x: 585, y: 296, w: 164, h: 112,
      titel: 'Auszeichnungen', hinweis: 'Senderanking der Intendanz', ico: 'ui-diagramm',
      act: 'fenster', daten: { f: 'ranking' },
    }),
    ausBild({
      x: 460, y: 78, w: 88, h: 116,
      titel: 'Preisfigur', hinweis: 'Wann die Sammys verliehen werden', ico: 'ui-pokal',
      act: 'fenster', daten: { f: 'sammy' },
    }),
    ausBild({
      x: 8, y: 0, w: 196, h: 556,
      titel: 'Tür', hinweis: 'Zurück in den Flur', ico: 'ui-hochhaus',
      act: 'back',
    }),
  ],
};
