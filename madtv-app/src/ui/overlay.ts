/**
 * Dialoge und Einblendungen.
 *
 * Zwei Sorten Dialog: Erzähldialoge halten die Spieluhr an, Auswahldialoge
 * nicht. Sonst ließe sich der ganze Sendetag im geöffneten Menü in Ruhe
 * durchplanen — und der Zeitdruck des Vorbilds wäre dahin.
 */
import { esc } from '../core';
import type { ToastLevel } from '../core';
import { el } from './dom';

export interface DialogButton {
  t: string;
  cls?: string;
  fn?: () => void;
}

interface Entry {
  ico: string;
  title: string;
  who: string;
  html: string;
  buttons: DialogButton[];
  /** true = Spieluhr anhalten. */
  pause: boolean;
  onShow?: (box: HTMLElement) => void;
}

const queue: Entry[] = [];
let open = false;
let pauses = true;

/** Ist gerade ein Dialog offen, der die Uhr anhalten soll? */
export function modalHoldsClock(): boolean {
  return open && pauses;
}
export function modalOpen(): boolean {
  return open;
}

function push(e: Entry): void {
  queue.push(e);
  if (!open) showNext();
}

function showNext(): void {
  const next = queue.shift();
  if (!next) {
    open = false;
    pauses = true;
    el('modal').classList.remove('on');
    afterClose?.();
    return;
  }
  open = true;
  pauses = next.pause;

  const btns = next.buttons.length ? next.buttons : [{ t: 'OK', cls: 'btn' }];
  el('mbox').innerHTML =
    `<div class="mh"><div class="ico" aria-hidden="true">${next.ico}</div>` +
    `<div><div class="who">${esc(next.who)}</div><h3>${esc(next.title)}</h3></div></div>` +
    `<p>${next.html}</p>` +
    `<div class="mf">${btns
      .map((b, i) => `<button class="${b.cls ?? 'btn'}" data-i="${i}">${esc(b.t)}</button>`)
      .join('')}</div>`;

  el('mbox').querySelectorAll<HTMLButtonElement>('.mf button').forEach((b) => {
    b.onclick = () => {
      const fn = btns[Number(b.dataset.i)]?.fn;
      el('modal').classList.remove('on');
      open = false;
      pauses = true;
      fn?.();
      // Öffnet die Aktion selbst einen Dialog (Untermenü), darf der Stapel
      // nicht zusätzlich weiterschalten — sonst schließt er sofort wieder.
      setTimeout(() => { if (!open) showNext(); }, 30);
    };
  });

  el('modal').classList.add('on');
  next.onShow?.(el('mbox'));
}

let afterClose: (() => void) | null = null;

/** Wird aufgerufen, sobald der Dialogstapel leer ist. */
export function onAllClosed(fn: () => void): void {
  afterClose = fn;
}

/** Erzähldialog — hält die Uhr an. */
export function dialog(
  ico: string, title: string, who: string, html: string, buttons: DialogButton[] = [],
): void {
  push({ ico, title, who, html, buttons, pause: true });
}

export function closeDialog(): void {
  el('modal').classList.remove('on');
  open = false;
  pauses = true;
  setTimeout(() => { if (!open) showNext(); }, 20);
}

export interface ChoiceItem<T> {
  label: string;
  sub: string;
  right?: string;
  value: T;
}

/**
 * Auswahlliste. Hält die Uhr nur an, wenn der Zeitdruck abgeschaltet ist.
 */
export function chooser<T>(
  title: string, who: string, ico: string,
  items: ChoiceItem<T>[], onPick: (v: T) => void,
  opts: { emptyText?: string; pause?: boolean; afterPick?: () => void } = {},
): void {
  if (!items.length) {
    push({
      ico, title, who,
      html: `<span class="dim">${esc(opts.emptyText ?? 'Hier ist nichts verfügbar.')}</span>`,
      buttons: [{ t: 'Schließen', cls: 'btn ghost' }],
      pause: opts.pause ?? true,
    });
    return;
  }

  const html =
    '<div class="list">' +
    items
      .map((it, i) =>
        `<div class="item pickitem" data-i="${i}" style="cursor:pointer" role="button" tabindex="0">` +
        `<div style="min-width:0;flex:1"><div class="t">${it.label}</div>` +
        `<div class="m">${it.sub}</div></div>` +
        (it.right ? `<div class="r">${it.right}</div>` : '') +
        '</div>')
      .join('') +
    '</div>';

  push({
    ico, title, who, html,
    buttons: [{ t: 'Abbrechen', cls: 'btn ghost' }],
    pause: opts.pause ?? false,
    onShow: (box) => {
      box.querySelectorAll<HTMLElement>('.pickitem').forEach((n) => {
        const go = () => {
          const v = items[Number(n.dataset.i)]!.value;
          el('modal').classList.remove('on');
          open = false;
          pauses = true;
          onPick(v);
          opts.afterPick?.();
          setTimeout(() => { if (!open) showNext(); }, 30);
        };
        n.onclick = go;
        n.onkeydown = (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); }
        };
      });
    },
  });
}

/** Freie Dialogform mit eigenem Inhalt — für Einstellungen und Ähnliches. */
export function customDialog(e: Omit<Entry, 'pause'> & { pause?: boolean }): void {
  push({ ...e, pause: e.pause ?? true });
}

/* ─────────── Einblendungen ─────────── */

export function toast(level: ToastLevel, title: string, text: string): void {
  const box = el('toasts');
  const d = document.createElement('div');
  d.className = `toast ${level === 'info' ? '' : level}`;
  d.innerHTML = `<div class="tt">${esc(title)}</div><div class="td">${esc(text)}</div>`;
  box.appendChild(d);
  setTimeout(() => {
    d.style.transition = 'opacity .3s';
    d.style.opacity = '0';
    setTimeout(() => d.remove(), 320);
  }, 4200);
  while (box.children.length > 5) box.firstChild?.remove();
}
