/**
 * Vollbildschirme und Menüs: Start, Ende, Pause, Regeln, Einstellungen,
 * Speichern und Laden.
 */
import { icon } from './icons';
import { resetBrett, resetScene, resetTop } from './views';
import { buildInfo } from './install';
import { DIFFS, createGame, esc, hhmm, moneyShort, WEEKDAYS } from '../core';
import type { DifficultyId, Options } from '../core';
import { el } from './dom';
import { G, S, hasSession, startSession, markDirty } from './session';
import { chooser, customDialog, dialog } from './overlay';
import { setSoundEnabled, playSfx } from './sfx';
import { setWorldVisible } from '../world/world';
import {
  SLOT_COUNT, anySave, listSlots, loadOptions, loadSlot, saveOptions, writeSlot,
} from './persist';
import { startLoop, stopLoop, togglePause } from './loop';

let onGameStarted: () => void = () => {};

export function wireScreens(fns: { gameStarted: () => void }): void {
  onGameStarted = fns.gameStarted;
}

let startDiff: DifficultyId = 'normal';
let startOpt: Options = { timePressure: true, sound: true, world: true, godMode: false, ...loadOptions() };

/* ─────────── Startbildschirm ─────────── */

export function showStart(): void {
  stopLoop();
  const start = el('start');
  start.style.display = 'flex';
  start.innerHTML =
    '<div class="sbox">' +
    '<h1>MAD<span>TV</span></h1>' +
    '<div class="sub">Der Sendermanager · eine Hommage an den Klassiker von 1991</div>' +
    '<div class="lbl">Name deines Senders</div>' +
    '<input type="text" id="chname" maxlength="18" value="Mad TV" aria-label="Name deines Senders">' +
    '<div class="lbl" style="margin-top:18px">Schwierigkeit</div>' +
    '<div class="optrow" id="diffrow">' +
    (Object.keys(DIFFS) as DifficultyId[]).map((k) =>
      `<button class="opt ${startDiff === k ? 'on' : ''}" data-d="${k}" aria-pressed="${startDiff === k}">` +
      `${icon(DIFFS[k].ico)} ${DIFFS[k].name}<small>${DIFFS[k].desc} Sieg ab ${DIFFS[k].winImage}%</small></button>`).join('') +
    '</div>' +
    '<div class="lbl" style="margin-top:14px">Einstellungen</div>' +
    '<div class="optrow" id="optrow">' +
    `<button class="opt ${startOpt.timePressure ? 'on' : ''}" data-o="timePressure" aria-pressed="${startOpt.timePressure}">` +
    `${icon('ui-uhr')} Echtzeitdruck<small>${startOpt.timePressure ? 'Uhr läuft auch im Menü weiter' : 'Auswahl hält die Uhr an'}</small></button>` +
    `<button class="opt ${startOpt.sound ? 'on' : ''}" data-o="sound" aria-pressed="${startOpt.sound}">` +
    `${icon(startOpt.sound ? 'ui-ton' : 'ui-tonaus')} Ton<small>${startOpt.sound ? 'an' : 'aus'}</small></button>` +
    `<button class="opt ${startOpt.world ? 'on' : ''}" data-o="world" aria-pressed="${startOpt.world}">` +
    `${icon('ui-hochhaus')} Flurgrafik<small>${startOpt.world ? 'an' : 'aus'}</small></button>` +
    `<button class="opt ${startOpt.godMode ? 'on' : ''}" data-o="godMode" aria-pressed="${startOpt.godMode}">` +
    `${icon('ui-zeitfrei')} Freier Aufbau<small>${startOpt.godMode ? 'Uhr hält dich nie auf' : 'Zeit kostet, wie sie soll'}</small></button>` +
    '</div>' +
    '<button class="go" id="gobtn">Sendebetrieb aufnehmen</button>' +
    (anySave() ? `<div style="margin-top:12px"><button class="opt" id="loadbtn">${icon('ui-diskette')} Spielstand laden</button></div>` : '') +
    '<div class="foot">Du bist neuer Programmdirektor. Fülle den Sendeplan, verkaufe Werbung, halte die Quote oben —<br>' +
    'und gewinne das Herz von Betty Botterbloom, ehe die Konkurrenz es tut.<br><br>' +
    'Eigenständige Nachbildung. Alle Titel, Marken und Personen sind frei erfunden.</div>' +
    '</div>';

  el('diffrow').querySelectorAll<HTMLButtonElement>('.opt').forEach((b) => {
    b.onclick = () => { startDiff = b.dataset.d as DifficultyId; showStart(); };
  });
  el('optrow').querySelectorAll<HTMLButtonElement>('.opt').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.o as keyof Options;
      startOpt = { ...startOpt, [k]: !startOpt[k] };
      showStart();
    };
  });

  el('gobtn').onclick = () => {
    const name = (el<HTMLInputElement>('chname').value || 'Mad TV').trim().slice(0, 18);
    const g = createGame({ name, diff: startDiff, opt: startOpt });
    startSession(g);
    setSoundEnabled(g.opt.sound);
    saveOptions(startOpt);
    start.style.display = 'none';
    startLoop();
    onGameStarted();
    intro();
  };

  const lb = document.getElementById('loadbtn');
  if (lb) {
    lb.onclick = () => {
      // Der Ladedialog braucht eine Sitzung. Bei Abbruch bleibt der
      // Startbildschirm sichtbar — geladen wird erst in applyLoad().
      if (!hasSession()) {
        const g = createGame({ diff: startDiff, opt: startOpt });
        startSession(g);
      }
      loadMenu();
    };
  }
}

function intro(): void {
  const g = G();
  dialog('flr-chef', 'Willkommen im Haus', 'Herr Raffer',
    'Sie sind der neue Programmdirektor. Ich sage es nur einmal: Ich will Quote. ' +
    `Unten steht Ihr Startkapital von ${moneyShort(g.D.money)} — davon kaufen Sie Filme, davon bezahlen ` +
    'Sie Nachrichten, und davon leben Sie, bis die Werbung Geld bringt.<br><br>' +
    'Um 18 Uhr geht der Sender auf Sendung. Was bis dahin nicht im Plan steht, ist Testbild. ' +
    'Und lassen Sie die Finger von Frau Botterbloom — die ist zu schade für Sie.',
    [{
      t: 'Ans Werk', cls: 'btn',
      fn: () => dialog('ui-buch', 'Der erste Abend', 'Kurzanleitung',
        '1. <b>Filmagentur</b> (Etage 5): Lizenzen kaufen.<br>' +
        '2. <b>Werbeagentur</b> (Etage 6): Verträge holen — nur so kommt Geld herein.<br>' +
        '3. <b>Nachrichtenstudio</b> (Etage 8): Abos abschließen, Meldungen wählen.<br>' +
        '4. <b>Dein Büro</b> (Etage 7): Sendeplan füllen, Werbespots setzen.<br><br>' +
        'Der Fahrstuhl kostet Zeit. Plane deine Wege.',
        [{ t: 'Los geht\'s', cls: 'btn' }]),
    }]);
}

/* ─────────── Endbildschirm ─────────── */

export function showEnd(): void {
  const g = G();
  const e = g.end;
  if (!e) return;
  const p = g.player;
  const start = el('start');
  start.style.display = 'flex';
  start.innerHTML =
    '<div class="sbox">' +
    `<div class="bigico endico">${icon(e.ico)}</div>` +
    `<h1 style="font-size:32px;margin-top:6px">${esc(e.title)}</h1>` +
    `<p class="sub" style="max-width:440px;margin:10px auto 20px">${e.text}</p>` +
    '<div class="grid3" style="max-width:460px;margin:0 auto 18px">' +
    `<div class="kpi"><div class="k">Marktanteil</div><div class="v">${p.image.toFixed(1).replace('.', ',')}%</div></div>` +
    `<div class="kpi"><div class="k">Betty</div><div class="v" style="color:var(--love)">${Math.round(p.love)}</div></div>` +
    `<div class="kpi"><div class="k">Konto</div><div class="v">${moneyShort(p.money)}</div></div>` +
    '</div><button class="go" id="againbtn">Neues Spiel</button></div>';
  el('againbtn').onclick = showStart;
  playSfx(e.win ? 'award' : 'bad');
}

/* ─────────── Menü ─────────── */

export function openMenu(): void {
  const g = G();
  const s = S();
  s.paused = true;
  dialog('☰', 'Pause', 'Menü',
    `<span class="dim">Tag ${g.day} · ${WEEKDAYS[g.weekday]} · ${hhmm(g.time)} · ` +
    `${esc(g.player.name)} · ${g.player.image.toFixed(1).replace('.', ',')}%</span>`,
    [
      { t: 'Weiter', cls: 'btn', fn: () => togglePause(false) },
      { t: 'Speichern', cls: 'btn ghost', fn: saveMenu },
      { t: 'Laden', cls: 'btn ghost', fn: loadMenu },
      { t: 'Einstellungen', cls: 'btn ghost', fn: optionsMenu },
      { t: 'Regeln', cls: 'btn ghost', fn: showRules },
      { t: 'Neues Spiel', cls: 'btn danger', fn: showStart },
    ]);
}

function slotLabel(slot: number): string {
  const info = listSlots().find((x) => x.slot === slot);
  const name = slot === 0 ? 'Automatisch' : `Slot ${slot}`;
  if (!info) return `${name} · <span class="dim">leer</span>`;
  const diff = DIFFS[info.diff as DifficultyId]?.name ?? '—';
  return `${name} · ${esc(info.name)} · Tag ${info.day} · ${Math.round(info.image)}% · ${diff}`;
}

function saveMenu(): void {
  const items = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map((i) => ({
    label: `${icon('ui-diskette')} ${slotLabel(i)}`,
    sub: listSlots().some((x) => x.slot === i) ? 'wird überschrieben' : 'freier Platz',
    value: i,
  }));
  chooser('Spielstand speichern', 'Menü', 'ui-diskette', items, (i) => {
    const ok = writeSlot(i, G(), S());
    dialog(ok ? 'ui-diskette' : 'ui-warnung', ok ? 'Gespeichert' : 'Nicht gespeichert', 'Menü',
      ok ? `Spielstand ${i} geschrieben.` : 'Der Browser lässt keinen Speicherplatz zu.',
      [{ t: 'Weiter', cls: 'btn', fn: () => togglePause(false) }]);
  }, { pause: true });
}

function loadMenu(): void {
  const items = listSlots().map((info) => ({
      label: `${icon(info.slot === 0 ? 'ui-uhr' : 'ui-diskette')} ${slotLabel(info.slot)}`,
    sub: 'laden',
    value: info.slot,
  }));
  chooser('Spielstand laden', 'Menü', 'ui-ordner', items, applyLoad, {
    emptyText: 'Es ist noch kein Spielstand vorhanden.',
    pause: true,
  });
}

function applyLoad(slot: number): void {
  const loaded = loadSlot(slot);
  if (!loaded) {
    dialog('ui-warnung', 'Spielstand beschädigt', 'Menü', 'Dieser Slot lässt sich nicht laden.');
    return;
  }
  const s = startSession(loaded.g);
  s.floor = loaded.ui.floor;
  s.room = loaded.ui.room;
  s.speed = loaded.ui.speed;
  setSoundEnabled(loaded.g.opt.sound);
  // Ein geladener Stand hat keine Vorgeschichte: Kopfzeile neu bauen, und der
  // Raum soll nicht so tun, als sei man gerade hineingegangen.
  resetTop();
  resetBrett();
  resetScene();
  el('start').style.display = 'none';
  startLoop();
  onGameStarted();
}

function optionsMenu(): void {
  const g = G();
  const row = (k: keyof Options, title: string, desc: string): string =>
    `<div class="optline"><div><div class="ot">${title}</div><div class="od">${desc}</div></div>` +
    `<button class="toggle${g.opt[k] ? ' on' : ''}" data-opt="${k}" role="switch" ` +
    `aria-checked="${g.opt[k]}" aria-label="${esc(title)}"><i></i></button></div>`;

  customDialog({
    ico: 'ui-zahnrad', title: 'Einstellungen', who: 'Menü',
    html:
      row('timePressure', 'Echtzeitdruck',
        'Auswahldialoge halten die Uhr nicht an, der Fahrstuhl kostet volle Fahrzeit.') +
      row('sound', 'Ton', 'Kurze Signale bei Sendestart, Werbeerlös und Quotenalarm.') +
      row('world', 'Flurgrafik',
        'Der gezeichnete Flur über den Panels — Fahrstuhl, Türschild und laufende Figur.') +
      row('godMode', 'Freier Aufbau',
        'Der Fahrstuhl fährt auch bei angehaltener Uhr, und nichts kostet mehr Sendezeit. '
        + 'Zum Ausprobieren und Einrichten — die Quote zählt weiter.') +
      `<div class="buildinfo">${esc(buildInfo())}</div>`,
    buttons: [{ t: 'Fertig', cls: 'btn', fn: () => { saveOptions(g.opt); togglePause(false); } }],
    onShow: (box) => {
      box.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((n) => {
        n.onclick = () => {
          const k = n.dataset.opt as keyof Options;
          g.opt[k] = !g.opt[k];
          n.classList.toggle('on', g.opt[k]);
          n.setAttribute('aria-checked', String(g.opt[k]));
          if (k === 'sound') { setSoundEnabled(g.opt.sound); if (g.opt.sound) playSfx('buy'); }
          if (k === 'world') setWorldVisible(g.opt.world);
          saveOptions(g.opt);
          markDirty();
        };
      });
    },
  });
}

function showRules(): void {
  const g = G();
  dialog('ui-buch', 'Spielregeln', 'Handbuch',
    `<b>Ziel:</b> ${g.D.winImage}% Marktanteil <i>und</i> ${g.D.winImage} Zuneigungspunkte bei Betty Botterbloom.<br><br>` +
    '<b>Der Tag:</b> 17:00 bis 01:00. Ab 18:00 laufen sieben Sendeblöcke — je 4 Minuten Nachrichten, dann die ' +
    'Sendung, dann 5 Minuten Werbung. Was zur vollen Stunde nicht im Plan steht, wird zum Testbild.<br><br>' +
    '<b>Geld:</b> kommt ausschließlich aus Werbeverträgen. Ein Spot zahlt nur, wenn der Block die Mindestquote ' +
    'erreicht. Verfällt ein Vertrag, wird die Strafe fällig.<br><br>' +
    '<b>Quote:</b> hängt an Genre, Zielgruppe zur Sendezeit, Frische des Titels, deinen Nachrichten, Trailern, ' +
    'dem Zuschauerfluss, der Genre-Konjunktur und dem, was die Konkurrenz gerade sendet. Klick nach der Sendung ' +
    'auf einen gelaufenen Sendeplatz — dort steht, welche Zielgruppe eingeschaltet hat.<br><br>' +
    '<b>Serien</b> binden ihr Publikum an einen festen Sendeplatz: gleiche Uhrzeit wie zuletzt bringt Zuschauer, ' +
    'Herumspringen kostet sie.<br><br>' +
    '<b>Betty:</b> Ihre Zuneigung kann dein Image nie überflügeln. Kultursendungen und Geschenke bringen Punkte — ' +
    'aber ohne Quote bleibt sie kühl.<br><br>' +
    `<b>Gefahr:</b> Drei Tage unter ${g.D.fireImage}% Marktanteil und Herr Raffer wirft dich raus. ` +
    'Filme ab 18 vor 22 Uhr rufen den Gerichtsvollzieher.<br><br>' +
    '<b>Zeit:</b> Bei aktivem Echtzeitdruck läuft die Uhr auch während der Programmauswahl weiter, und jede ' +
    'Fahrstuhlfahrt kostet Sendetag. Im Menü unter Einstellungen lässt sich das abschalten.<br><br>' +
    '<b>Freier Aufbau:</b> Hält die Uhr einen ganz aus dem Weg — der Fahrstuhl fährt auch angehalten, und ' +
    'keine Handlung kostet noch Minuten. Damit lässt sich ein Abend in Ruhe einrichten. Gesendet wird trotzdem ' +
    'nach denselben Regeln: Quote, Verträge und Betty merken nichts davon.',
    [{ t: 'Alles klar', cls: 'btn', fn: () => togglePause(false) }]);
}
