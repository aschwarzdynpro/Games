/**
 * Räume als begehbare Szene.
 *
 * Bisher *war* ein Raum sein Panel, mit einer schmalen Kulisse darüber. Hier
 * dreht sich das um: Der Raum füllt die Ansicht, und was man wissen will, holt
 * man sich, indem man einen Gegenstand anfasst — den Laptop für den Sendeplan,
 * den Koffer für die Verträge, die Tür für den Flur.
 *
 * Die Schicht kennt zwei Sorten Hintergrund und behandelt sie gleich: eine
 * gezeichnete Vektorszene oder ein fertiges Bild. Beides liegt hinter derselben
 * Karte aus Klickpunkten, deren Koordinaten im viewBox-Raster stehen — wer
 * später ein gerendertes Bild einhängt, tauscht den Hintergrund und lässt die
 * Karte, wie sie ist.
 *
 * Die Punkte sind echte fokussierbare Elemente mit Beschriftung, kein
 * Trefferflächen-Raten auf einer Leinwand. Damit bleibt der Raum mit Tabulator
 * und Vorleseprogramm bedienbar, so wie die Panels es waren.
 */
import { esc } from '../core';
import { icon } from './icons';

export interface Klickpunkt {
  /** Im Raster des viewBox, nicht in Bildschirmpunkten. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Was der Punkt ist — steht im Schildchen und im Vorleseprogramm. */
  titel: string;
  /** Ein Wort dazu, was passiert. */
  hinweis: string;
  /** Symbol fürs Schildchen. */
  ico: string;
  /** Aktion aus actions.ts, plus optionale Daten. */
  act: string;
  daten?: Record<string, string>;
}

export interface Raumszene {
  /** Zeichenraster. Bild und Klickpunkte teilen es sich. */
  viewBox: string;
  /** Kurzbeschreibung fürs Vorleseprogramm. */
  beschreibung: string;
  /** Gezeichneter Hintergrund als SVG-Inhalt. */
  malen?: () => string;
  /**
   * Fertiges Bild statt Zeichnung. Wird über die ganze Fläche gelegt; die
   * Klickpunkte liegen unverändert darüber.
   */
  bild?: string;
  punkte: Klickpunkt[];
}

/**
 * Wo das Schildchen sitzt: über dem Gegenstand, außer er klebt schon oben.
 * Ohne diese Rücksicht liefe die Beschriftung am oberen Rand aus dem Bild.
 */
function schildY(p: Klickpunkt): number {
  return p.y < 120 ? p.y + p.h + 14 : p.y - 46;
}

function klickpunkt(p: Klickpunkt, i: number): string {
  const daten = Object.entries(p.daten ?? {})
    .map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  const sy = schildY(p);
  const sx = Math.round(p.x + p.w / 2);
  return `<g class="hs" role="button" tabindex="0" data-act="${esc(p.act)}"${daten} ` +
    `aria-label="${esc(p.titel)} — ${esc(p.hinweis)}" data-hs="${i}">` +
    `<rect class="hs-feld" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10"/>` +
    `<g class="hs-schild" transform="translate(${sx} ${sy})">` +
    `<rect class="hs-schild-grund" x="-104" y="0" width="208" height="34" rx="8"/>` +
    `<text class="hs-titel" x="0" y="15">${esc(p.titel)}</text>` +
    `<text class="hs-hinweis" x="0" y="27">${esc(p.hinweis)}</text>` +
    '</g></g>';
}

/** Die ganze Szene als Auszeichnung — Hintergrund, dann Klickpunkte darüber. */
export function renderSzene(sz: Raumszene): string {
  const grund = sz.bild
    ? `<image href="${esc(sz.bild)}" x="0" y="0" width="100%" height="100%" ` +
      'preserveAspectRatio="xMidYMid slice"/>'
    : (sz.malen?.() ?? '');

  return '<div class="szene">' +
    `<svg class="szene-svg" viewBox="${esc(sz.viewBox)}" preserveAspectRatio="xMidYMid meet" ` +
    `role="group" aria-label="${esc(sz.beschreibung)}">` +
    `<g class="szene-grund" aria-hidden="true">${grund}</g>` +
    sz.punkte.map(klickpunkt).join('') +
    '</svg></div>';
}

/**
 * Die Leiste unter der Szene.
 *
 * Ein gezeichneter Raum sagt einem nicht von selbst, was anklickbar ist. Die
 * Leiste zählt dieselben Punkte noch einmal als Knöpfe auf — sie ist der
 * verlässliche Weg, wenn das Suchen im Bild zu mühsam wird, und auf schmalen
 * Geräten ist sie ohnehin der bequemere.
 */
export function renderSzeneLeiste(sz: Raumszene): string {
  return '<div class="szene-leiste">' +
    sz.punkte.map((p) =>
      `<button class="szene-knopf" data-act="${esc(p.act)}"` +
      Object.entries(p.daten ?? {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('') +
      ` title="${esc(p.hinweis)}">${icon(p.ico)}<span>${esc(p.titel)}</span></button>`).join('') +
    '</div>';
}
