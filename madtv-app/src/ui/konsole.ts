/**
 * Das Armaturenbrett unter dem Bild.
 *
 * Die App besteht aus zwei Teilen: oben der Raum, unten das Brett. Alles, was
 * man beim Spielen wissen muss, steht unten und bleibt stehen — der Raum
 * darüber wechselt, das Brett nicht.
 *
 * Es scrollt nicht. Ein Instrumentenbrett, in dem man erst blättern muss, ist
 * keines; was nicht hineinpasst, gehört woandershin. Sichtbar bleibt deshalb
 * nur, was man *im Spielen* dauernd braucht:
 *
 *   Sendezeit  — die Ressource, um die gespielt wird
 *   Konto      — die zweite Ressource, und die, die einen umbringt
 *   Marktanteil— die Siegbedingung
 *   Zuschauer  — die Rückmeldung darauf, was gerade läuft
 *   Auf Sendung— was in diesem Augenblick über den Sender geht
 *
 * Alles Übrige — Sendetag, Betty, der ganze Abend, die Meldungen — steht in
 * der Übersicht, die auf Klick groß aufgeht. Es sind Dinge, die man *nachsieht*
 * und nicht dauernd im Auge behält.
 *
 * Vorher zeigte auch die Kopfzeile dieselben Zahlen. Zwei Orte für dieselbe
 * Zahl sind einer zu viel; sie trägt nur noch Tempo und Menü.
 *
 * Gebaut wird das Gerüst einmal beim Zeichnen der Ansicht, die Zahlen schreibt
 * `updateBrett()` im Minutentakt hinein. Hinge es am Neuzeichnen der Panels,
 * ginge die Uhr bis zu zwölf Spielminuten nach.
 */
import {
  GENRES, WEEKDAYS, currentSlot, dailyCosts, esc, getDay, hhmm, moneyShort, slotLabel, viewers,
} from '../core';
import { icon } from './icons';
import { meldungen, neueMeldungen } from './overlay';
import { G } from './session';

/** Eine Anzeige im Brett. Kennung, damit `updateBrett()` sie wiederfindet. */
function feld(id: string, ico: string, kopf: string, cls = ''): string {
  return `<div class="br-feld ${cls}"><div class="br-ico">${icon(ico)}</div>` +
    `<div class="br-werte"><div class="br-k" id="${id}-k">${esc(kopf)}</div>` +
    `<div class="br-v" id="${id}">—</div></div></div>`;
}

/** Das Gerüst. Alle veränderlichen Stellen tragen eine Kennung. */
export function renderBrett(): string {
  return '<div class="brett" role="group" aria-label="Sendezentrale">' +

    '<div class="br-zeile br-zahlen">' +
    feld('b-uhr', 'ui-uhr', 'Sendezeit', 'uhr') +
    feld('b-geld', 'ui-waage', 'Konto', 'geld') +
    feld('b-quote', 'ui-diagramm', 'Marktanteil', 'quote') +
    feld('b-couch', 'ui-couch', 'Zuschauer', 'couch') +
    '</div>' +

    '<div class="br-zeile br-unten">' +

    // Der Vorschaumonitor: was in diesem Augenblick über den Sender geht
    '<div class="br-tv" id="b-tv">' +
    '<div class="br-tv-schirm"><div class="br-tv-genre" id="b-tv-genre"></div>' +
    '<div class="br-tv-titel" id="b-tv-titel">Sendeschluss</div></div>' +
    '<div class="br-tv-fuss"><span class="br-lampe" id="b-tv-lampe"></span>' +
    '<span id="b-tv-zeit">vor Sendebeginn</span></div></div>' +

    // Der Weg zu allem Übrigen. Die Zahl daran sagt, dass etwas passiert ist —
    // sonst übersähe man eine Meldung dauerhaft statt nur für vier Sekunden.
    '<button class="br-mehr" data-act="uebersicht" aria-label="Übersicht öffnen">' +
    `${icon('ui-menu')}<span>Übersicht</span>` +
    '<span class="br-badge" id="b-badge" hidden>0</span></button>' +

    '</div></div>';
}

/**
 * Die Übersicht, die groß aufgeht: der ganze Abend, die Meldungen, und die
 * Zahlen, die man nur gelegentlich braucht.
 */
export function renderUebersicht(): string {
  const g = G();
  const p = g.player;
  const heute = getDay(p, g.day);
  const jetzt = currentSlot(g.time);

  let h = '<div class="ue-zahlen">' +
    `<div class="ue-wert"><span>Sendetag</span><b>${g.day} · ${
      esc(WEEKDAYS[g.weekday]!)}</b></div>` +
    `<div class="ue-wert"><span>Betty</span><b>${Math.round(p.love)} von 100</b></div>` +
    `<div class="ue-wert"><span>Tageskosten</span><b>${moneyShort(-dailyCosts(p))}</b></div>` +
    `<div class="ue-wert"><span>Lizenzen</span><b>${p.licences.length}</b></div>` +
    `<div class="ue-wert"><span>Verträge</span><b>${p.contracts.length}</b></div>` +
    '</div>';

  // Der ganze Abend, nicht nur die nächsten fünf Felder.
  h += '<div class="card"><h3>Heute Abend</h3><div class="br-plan-liste">';
  const zeilen: string[] = [];
  for (let i = 0; i < heute.length; i++) {
    const f = heute[i]!;
    if (f.prog && !f.start) continue;
    const gd = f.prog ? GENRES[f.prog.genre] : null;
    zeilen.push(`<div class="br-zeile-plan${i === jetzt ? ' jetzt' : ''}${
      f.aired ? ' gelaufen' : ''}">` +
      `<span class="br-zeit">${slotLabel(i)}</span>` +
      `<span class="br-was">${gd ? icon(gd.ico) : ''} ${esc(f.prog?.title ?? 'Testbild')}</span>` +
      `<span class="br-wert">${f.aired && f.res ? viewers(f.res.total) : ''}</span></div>`);
  }
  h += (zeilen.length ? zeilen.join('') : '<div class="br-leer">Nichts geplant.</div>') +
    '</div></div>';

  const liste = meldungen();
  h += '<div class="card"><h3>Meldungen</h3><div class="br-meld-liste">' +
    (liste.length
      ? liste.map((m) => `<div class="br-meldung ${m.level}">` +
        `<b>${esc(m.titel)}</b><span>${esc(m.text)}</span></div>`).join('')
      : '<div class="br-leer">Noch nichts passiert.</div>') +
    '</div></div>';
  return h;
}

/** Nur setzen, wenn das Feld auch existiert — das Brett gibt es nicht überall. */
function setz(id: string, text: string): HTMLElement | null {
  const n = document.getElementById(id);
  if (n) n.textContent = text;
  return n;
}

/**
 * Die Zahlen nachtragen. Wird aus `updateTop()` mitgerufen und tut nichts,
 * solange kein Brett auf dem Bildschirm ist.
 */
export function updateBrett(): void {
  if (!document.getElementById('b-uhr')) return;
  const g = G();
  const p = g.player;

  const uhr = setz('b-uhr', hhmm(g.time));
  uhr?.classList.toggle('onair', g.time >= 18 * 60 && g.time < 24 * 60);

  const geld = setz('b-geld', moneyShort(p.money));
  geld?.classList.toggle('bad', p.money < 0);
  // Was der Tag kostet, gehört neben den Kontostand — sonst merkt man das
  // Auslaufen erst, wenn es passiert ist.
  setz('b-geld-k', `Konto · ${moneyShort(-dailyCosts(p))}/Tag`);

  setz('b-quote', `${p.image.toFixed(1).replace('.', ',')}%`);

  const badge = document.getElementById('b-badge');
  if (badge) {
    const n = neueMeldungen();
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }

  const jetzt = currentSlot(g.time);
  const heute = getDay(p, g.day);
  const feldJetzt = jetzt !== null ? heute[jetzt] : null;

  // Auf der Couch sitzt, wer gerade zusieht — sonst die Summe des Abends.
  const aired = feldJetzt?.aired ? feldJetzt.res : null;
  if (aired) {
    setz('b-couch-k', 'sehen gerade zu');
    setz('b-couch', viewers(aired.total));
  } else {
    const summe = heute.reduce((a, x) => a + (x.aired && x.res ? x.res.total : 0), 0);
    setz('b-couch-k', summe > 0 ? 'Zuschauer heute' : 'Zuschauer');
    setz('b-couch', summe > 0 ? viewers(summe) : '—');
  }

  // Vorschaumonitor — dieselbe Quelle wie der Sendeplan, damit beide nie
  // verschiedene Sendungen behaupten.
  const tv = document.getElementById('b-tv');
  const genre = document.getElementById('b-tv-genre');
  if (feldJetzt?.prog) {
    setz('b-tv-titel', feldJetzt.prog.title);
    const gd = GENRES[feldJetzt.prog.genre];
    if (genre) genre.innerHTML = `${icon(gd.ico)} ${esc(gd.name)}`;
    tv?.classList.add('laeuft');
  } else if (jetzt !== null) {
    setz('b-tv-titel', 'Testbild');
    if (genre) genre.textContent = 'nichts geplant';
    tv?.classList.add('laeuft');
  } else {
    setz('b-tv-titel', g.time < 18 * 60 ? 'Sendebeginn 18:00' : 'Sendeschluss');
    if (genre) genre.textContent = '';
    tv?.classList.remove('laeuft');
  }
  setz('b-tv-zeit', jetzt === null ? 'kein Sendebetrieb'
    : aired ? 'auf Sendung' : 'gleich auf Sendung');

}
