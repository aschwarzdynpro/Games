/**
 * Die Sendekonsole unter dem Raum.
 *
 * Sie zeigt beim Spielen dasselbe wie die Kopfzeile — aber dort, wo man
 * hinsieht: unter dem Bild, in Griffweite der Gegenstände, auf die man klickt.
 * Fünf Anzeigen, sonst nichts: Marktanteil, Konto, Uhr, was gerade läuft, und
 * wie viele davor sitzen.
 *
 * Drei davon stehen auch in der Kopfzeile. Das ist auf einem großen Bildschirm
 * gewollt — kurze Wege schlagen Sparsamkeit. Auf einem quer gehaltenen Telefon
 * ist Höhe aber das knappe Gut, und dieselbe Zahl zweimal zu zeigen kostet dort
 * genau den Platz, an dem die Knöpfe fehlen. Die drei tragen deshalb
 * `ko-doppel`, damit das Stilblatt sie dort weglassen kann.
 *
 * Gebaut wird das Gerüst beim Zeichnen der Ansicht, die Zahlen schreibt
 * `updateKonsole()` im Minutentakt hinein — genau wie bei der Kopfzeile. Würde
 * die Konsole am Neuzeichnen der Panels hängen, ginge die Uhr bis zu zwölf
 * Spielminuten nach.
 */
import { GENRES, currentSlot, esc, getDay, hhmm, moneyShort, viewers } from '../core';
import { icon } from './icons';
import { G } from './session';

/** Das Gerüst. Alle veränderlichen Stellen tragen eine Kennung. */
export function renderKonsole(): string {
  return '<div class="konsole" role="group" aria-label="Sendekonsole">' +

    `<div class="ko-feld ko-doppel"><div class="ko-ico">${icon('ui-diagramm')}</div>` +
    '<div class="ko-werte"><div class="ko-k">Marktanteil</div>' +
    '<div class="ko-v acc" id="k-quote">—</div></div></div>' +

    `<div class="ko-feld ko-doppel"><div class="ko-ico gold">${icon('ui-waage')}</div>` +
    '<div class="ko-werte"><div class="ko-k">Konto</div>' +
    '<div class="ko-v" id="k-geld">—</div></div></div>' +

    `<div class="ko-feld ko-doppel"><div class="ko-ico">${icon('ui-uhr')}</div>` +
    '<div class="ko-werte"><div class="ko-k">Sendezeit</div>' +
    '<div class="ko-v num" id="k-uhr">--:--</div></div></div>' +

    // Der Vorschaumonitor: was in diesem Augenblick über den Sender geht
    '<div class="ko-tv" id="k-tv">' +
    '<div class="ko-tv-schirm"><div class="ko-tv-genre" id="k-tv-genre"></div>' +
    '<div class="ko-tv-titel" id="k-tv-titel">Sendeschluss</div></div>' +
    '<div class="ko-tv-fuss"><span class="ko-lampe" id="k-tv-lampe"></span>' +
    '<span id="k-tv-zeit">vor Sendebeginn</span></div></div>' +

    `<div class="ko-feld couch"><div class="ko-ico">${icon('ui-couch')}</div>` +
    '<div class="ko-werte"><div class="ko-k" id="k-couch-k">Zuschauer</div>' +
    '<div class="ko-v ok" id="k-couch">—</div></div></div>' +

    '</div>';
}

/** Nur setzen, wenn das Feld auch existiert — die Konsole gibt es nicht überall. */
function setz(id: string, text: string): HTMLElement | null {
  const n = document.getElementById(id);
  if (n) n.textContent = text;
  return n;
}

/**
 * Die Zahlen nachtragen. Wird aus `updateTop()` mitgerufen und tut nichts,
 * solange keine Konsole auf dem Bildschirm ist.
 */
export function updateKonsole(): void {
  if (!document.getElementById('k-uhr')) return;
  const g = G();
  const p = g.player;

  setz('k-quote', `${p.image.toFixed(1).replace('.', ',')}%`);
  const geld = setz('k-geld', moneyShort(p.money));
  geld?.classList.toggle('bad', p.money < 0);
  geld?.classList.toggle('ok', p.money >= 0);
  setz('k-uhr', hhmm(g.time));

  // Was gerade läuft — dieselbe Quelle wie die Kopfzeile, damit beide Anzeigen
  // nie verschiedene Sendungen behaupten.
  const jetzt = currentSlot(g.time);
  const heute = getDay(p, g.day);
  const feld = jetzt !== null ? heute[jetzt] : null;
  const tv = document.getElementById('k-tv');
  const genre = document.getElementById('k-tv-genre');

  if (feld?.prog) {
    setz('k-tv-titel', feld.prog.title);
    const gd = GENRES[feld.prog.genre];
    if (genre) genre.innerHTML = `${icon(gd.ico)} ${esc(gd.name)}`;
    tv?.classList.add('laeuft');
  } else if (jetzt !== null) {
    setz('k-tv-titel', 'Testbild');
    if (genre) genre.textContent = 'nichts geplant';
    tv?.classList.add('laeuft');
  } else {
    setz('k-tv-titel', g.time < 18 * 60 ? 'Sendebeginn 18:00' : 'Sendeschluss');
    if (genre) genre.textContent = '';
    tv?.classList.remove('laeuft');
  }

  const aired = feld?.aired ? feld.res : null;
  setz('k-tv-zeit', jetzt === null ? 'kein Sendebetrieb'
    : aired ? 'auf Sendung' : 'gleich auf Sendung');

  // Auf der Couch sitzt, wer gerade zusieht — sonst die Summe des Abends.
  if (aired) {
    setz('k-couch-k', 'sehen gerade zu');
    setz('k-couch', viewers(aired.total));
  } else {
    const summe = heute.reduce((a, x) => a + (x.aired && x.res ? x.res.total : 0), 0);
    setz('k-couch-k', summe > 0 ? 'Zuschauer heute' : 'Zuschauer');
    setz('k-couch', summe > 0 ? viewers(summe) : '—');
  }
}
