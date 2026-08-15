/**
 * Das Armaturenbrett unter dem Bild.
 *
 * Die App besteht aus zwei Teilen: oben der Raum, unten das Brett. Alles, was
 * man beim Spielen wissen muss, steht unten und bleibt stehen — der Raum
 * darüber wechselt, das Brett nicht.
 *
 * Vorher war das eine schmale Konsole mit fünf Anzeigen, und die Kopfzeile
 * zeigte dieselben Zahlen noch einmal. Zwei Orte für dieselbe Zahl sind einer
 * zu viel; die Kopfzeile ist deshalb auf das zusammengeschrumpft, was keine
 * Anzeige ist — Tempo und Menü.
 *
 * Gebaut wird das Gerüst einmal beim Zeichnen der Ansicht, die Zahlen schreibt
 * `updateBrett()` im Minutentakt hinein. Hinge es am Neuzeichnen der Panels,
 * ginge die Uhr bis zu zwölf Spielminuten nach.
 */
import {
  GENRES, WEEKDAYS, currentSlot, dailyCosts, esc, getDay, hhmm, moneyShort, slotLabel, viewers,
} from '../core';
import { icon } from './icons';
import { meldungen } from './overlay';
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
    feld('b-tag', 'ui-uhr', 'Sendetag') +
    feld('b-uhr', 'ui-uhr', 'Sendezeit', 'uhr') +
    feld('b-geld', 'ui-waage', 'Konto', 'geld') +
    feld('b-quote', 'ui-diagramm', 'Marktanteil', 'quote') +
    feld('b-couch', 'ui-couch', 'Zuschauer', 'couch') +
    feld('b-betty', 'ui-herz', 'Betty', 'betty') +
    '</div>' +

    // Die Handgriffe des Raums stehen direkt unter den Zahlen — sie sind das,
    // wofür man herkommt. Weiter unten wären sie auf einem Telefon
    // weggescrollt, während die Anzeigen davor stehen blieben.
    '<div class="br-knoepfe" id="b-knoepfe"></div>' +

    '<div class="br-zeile br-tafeln">' +

    // Der Vorschaumonitor: was in diesem Augenblick über den Sender geht
    '<div class="br-tv" id="b-tv">' +
    '<div class="br-titel">Auf Sendung</div>' +
    '<div class="br-tv-schirm"><div class="br-tv-genre" id="b-tv-genre"></div>' +
    '<div class="br-tv-titel" id="b-tv-titel">Sendeschluss</div></div>' +
    '<div class="br-tv-fuss"><span class="br-lampe" id="b-tv-lampe"></span>' +
    '<span id="b-tv-zeit">vor Sendebeginn</span></div></div>' +

    // Der Abend im Überblick — was als nächstes läuft
    '<div class="br-plan"><div class="br-titel">Heute Abend</div>' +
    '<div class="br-plan-liste" id="b-plan"></div></div>' +

    // Was zuletzt passiert ist
    '<div class="br-meld"><div class="br-titel">Meldungen</div>' +
    '<div class="br-meld-liste" id="b-meld"></div></div>' +

    '</div></div>';
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

  setz('b-tag', `${g.day} · ${WEEKDAYS[g.weekday]!.slice(0, 2)}`);
  const uhr = setz('b-uhr', hhmm(g.time));
  uhr?.classList.toggle('onair', g.time >= 18 * 60 && g.time < 24 * 60);

  const geld = setz('b-geld', moneyShort(p.money));
  geld?.classList.toggle('bad', p.money < 0);
  // Was der Tag kostet, gehört neben den Kontostand — sonst merkt man das
  // Auslaufen erst, wenn es passiert ist.
  setz('b-geld-k', `Konto · ${moneyShort(-dailyCosts(p))}/Tag`);

  setz('b-quote', `${p.image.toFixed(1).replace('.', ',')}%`);
  setz('b-betty', String(Math.round(p.love)));

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

  // Der Abend: das laufende Feld und was danach kommt. Fortsetzungsfelder
  // einer langen Sendung stehen nicht noch einmal darin.
  const plan = document.getElementById('b-plan');
  if (plan) {
    const ab = jetzt ?? 0;
    const zeilen: string[] = [];
    for (let i = ab; i < heute.length && zeilen.length < 5; i++) {
      const f = heute[i]!;
      if (f.prog && !f.start) continue;
      const laeuft = i === jetzt;
      const gd = f.prog ? GENRES[f.prog.genre] : null;
      zeilen.push(`<div class="br-zeile-plan${laeuft ? ' jetzt' : ''}${f.aired ? ' gelaufen' : ''}">` +
        `<span class="br-zeit">${slotLabel(i)}</span>` +
        `<span class="br-was">${gd ? icon(gd.ico) : ''} ${esc(f.prog?.title ?? 'Testbild')}</span>` +
        `<span class="br-wert">${f.aired && f.res ? viewers(f.res.total) : ''}</span></div>`);
    }
    plan.innerHTML = zeilen.length ? zeilen.join('')
      : '<div class="br-leer">Der Abend beginnt um 18:00.</div>';
  }

  const meld = document.getElementById('b-meld');
  if (meld) {
    const liste = meldungen();
    meld.innerHTML = liste.length
      ? liste.map((m) => `<div class="br-meldung ${m.level}">` +
        `<b>${esc(m.titel)}</b><span>${esc(m.text)}</span></div>`).join('')
      : '<div class="br-leer">Noch nichts passiert.</div>';
  }
}
