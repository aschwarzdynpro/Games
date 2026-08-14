/**
 * Die Sendetafel — das Herzstück des Büros.
 *
 * Statt einer Liste liegt der Sendeplan jetzt als Steckwand vor: sieben
 * Sendeplätze, daneben zwei Ablagen mit Programmkassetten und Werbeaufträgen.
 * Karten werden mit dem Zeiger auf die Plätze gezogen.
 *
 * Gezeichnet wird mit HTML und CSS, nicht in SVG oder Canvas: Die Karten
 * tragen Filmtitel, und Text ist das eine, was SVG schlechter kann als DOM —
 * kein Umbruch, kein Auslassungszeichen, keine Vorlesbarkeit. Die Kulisse
 * drumherum (Rahmen, Schienen, Kassettenkörper) entsteht aus Verläufen.
 *
 * Ziehen ist eine Zugabe, kein Ersatz: Ein Klick auf einen Sendeplatz öffnet
 * weiterhin die Auswahlliste, damit die Tafel auch mit der Tastatur bedienbar
 * bleibt.
 */
import {
  BLOCKS, BLOCK_H, GENRES, GROUPS, esc, estimateBlock, getDay, moneyShort, viewers,
} from '../core';
import type { Contract, Licence } from '../core';
import { G, S, markDirty } from './session';
import { toast } from './overlay';
import { playSfx } from './sfx';

/* ─────────── Karten ─────────── */

/** Farbe je Genre — dieselbe Karte ist überall wiedererkennbar. */
const GENRE_HUE: Record<string, number> = {
  action: 6, komoed: 42, drama: 265, horror: 300, scifi: 195, krimi: 220,
  liebe: 335, western: 28, doku: 150, trick: 55, erotik: 320, sport: 130,
  musik: 280, show: 48, quiz: 170, talk: 205, kultur: 240, serie: 185,
};

function hue(g: string): number {
  return GENRE_HUE[g] ?? 210;
}

function progCard(l: Licence, opts: { small?: boolean; grabbable?: boolean } = {}): string {
  const gd = GENRES[l.genre];
  const h = hue(l.genre);
  const wear = Math.round(l.fresh * 100);
  return (
    `<div class="cass${opts.small ? ' sm' : ''}" style="--h:${h}"` +
    `${opts.grabbable ? ` data-lic="${l.uid}" tabindex="0" role="button"` : ''}` +
    ` title="${esc(l.title)} — ${gd.name}, Frische ${wear}%">` +
    '<div class="cass-reels"><i></i><i></i></div>' +
    `<div class="cass-label"><span class="cass-title">${esc(l.title)}</span>` +
    `<span class="cass-meta">${gd.ico} ${gd.name}${l.isSerie ? ` · F${l.ep}` : ''}</span></div>` +
    `<div class="cass-foot"><span class="cass-fsk${l.fsk >= 18 ? ' hot' : ''}">${l.fsk === 0 ? 'o.A.' : l.fsk}</span>` +
    `<span class="cass-wear"><i style="width:${wear}%"></i></span></div>` +
    '</div>'
  );
}

function adCard(c: Contract, opts: { grabbable?: boolean } = {}): string {
  const left = c.spots - c.done;
  return (
    `<div class="spot"${opts.grabbable ? ` data-ad="${c.id}" tabindex="0" role="button"` : ''}` +
    ` title="${esc(c.brand)} — mindestens ${viewers(c.minAud)}">` +
    `<div class="spot-brand">${esc(c.brand)}</div>` +
    `<div class="spot-need">${viewers(c.minAud)}${c.group ? ` · ${GROUPS[c.gi]!.ico}` : ''}</div>` +
    `<div class="spot-foot"><span>${left}× offen</span><b>${moneyShort(c.perSpot)}</b></div>` +
    '</div>'
  );
}

/* ─────────── Tafel ─────────── */

export function renderBoard(day: number): string {
  const g = G();
  const p = g.player;
  const slots = getDay(p, day);

  let rows = '';
  for (let b = 0; b < BLOCKS; b++) {
    const s = slots[b]!;
    const prime = b === 2 || b === 3;
    const aired = s.aired;

    // Sendeplatz
    let progInner: string;
    let progCls = 'pocket prog';
    if (s.prog) {
      const est = aired && s.res ? s.res.total : estimateBlock(g, day, b).total;
      const tooEarly = s.prog.fsk >= 18 && BLOCK_H[b]! < 22 && BLOCK_H[b]! >= 6;
      progInner = progCard(s.prog, { grabbable: !aired }) +
        `<div class="pocket-note${tooEarly ? ' bad' : ''}">` +
        (tooEarly ? '⚠ zu früh für FSK 18 · ' : '') +
        `<b>${viewers(est)}</b> ${aired ? 'gesehen' : 'erwartet'}</div>`;
      progCls += aired ? ' aired' : ' filled';
    } else {
      progInner = '<div class="pocket-empty">＋ Sendung</div>';
    }

    // Werbeplatz
    let adInner: string;
    let adCls = 'pocket ad';
    if (s.ad) {
      const ct = p.contracts.find((c) => c.id === s.ad!.id);
      adInner = ct
        ? adCard(ct, { grabbable: !aired })
        : `<div class="spot ghost"><div class="spot-brand">${esc(s.ad.brand)}</div>` +
          '<div class="spot-need">Vertrag beendet</div></div>';
      adCls += aired ? ' aired' : ' filled';
    } else if (s.trailer) {
      adInner = `<div class="trailer">🎞️ Trailer<span>${esc(s.trailer.title)}</span></div>`;
      adCls += aired ? ' aired' : ' filled';
    } else {
      adInner = '<div class="pocket-empty">＋ Werbung</div>';
    }

    const progAct = aired
      ? (s.res ? `data-act="showres" data-b="${b}" data-day="${day}"` : '')
      : `data-act="pickprog" data-b="${b}" data-day="${day}" data-drop="prog"`;
    const adAct = aired ? '' : `data-act="pickad" data-b="${b}" data-day="${day}" data-drop="ad"`;

    rows +=
      `<div class="brow${prime ? ' prime' : ''}">` +
      `<div class="bhour">${String(BLOCK_H[b]).padStart(2, '0')}<small>Uhr</small></div>` +
      `<div class="${progCls}" ${progAct} ${aired ? '' : 'role="button" tabindex="0"'} ` +
      `aria-label="${String(BLOCK_H[b]).padStart(2, '0')} Uhr, Sendung">${progInner}</div>` +
      `<div class="${adCls}" ${adAct} ${aired ? '' : 'role="button" tabindex="0"'} ` +
      `aria-label="${String(BLOCK_H[b]).padStart(2, '0')} Uhr, Werbung">${adInner}</div>` +
      '</div>';
  }

  // Ablagen
  const used = new Set(slots.filter((s) => s.prog).map((s) => s.prog!.uid));
  const shelf = [...p.licences]
    .sort((a, b) => Number(used.has(a.uid)) - Number(used.has(b.uid)) || b.qual - a.qual)
    .map((l) => `<div class="shelf-item${used.has(l.uid) ? ' used' : ''}">${progCard(l, { grabbable: true })}</div>`)
    .join('');

  const openContracts = p.contracts.filter((c) => c.done < c.spots);
  const koffer = openContracts.length
    ? openContracts.map((c) => `<div class="shelf-item">${adCard(c, { grabbable: true })}</div>`).join('')
    : '<div class="shelf-none">Kein offener Vertrag — ab in die Werbeagentur.</div>';

  return (
    `<div class="board" data-board-day="${day}">` +
    `<div class="board-rows">${rows}</div>` +
    shelfBlock('📼 Programmordner',
      `${p.licences.length} Lizenzen · zum Sendeplatz ziehen`,
      shelf || '<div class="shelf-none">Archiv leer.</div>') +
    shelfBlock('📣 Werbekoffer',
      `${openContracts.length} offen · auf den Werbeplatz ziehen`,
      koffer) +
    '</div>'
  );
}

function shelfBlock(title: string, note: string, inner: string): string {
  return '<div class="shelf">' +
    `<div class="shelf-head">${title} <span>${note}</span>` +
    '<span class="shelf-nav"><button data-rail="-1" aria-label="Ablage nach links">◀</button>' +
    '<button data-rail="1" aria-label="Ablage nach rechts">▶</button></span></div>' +
    `<div class="shelf-rail" data-drop="shelf">${inner}</div></div>`;
}

/* ─────────── Ziehen und Ablegen ─────────── */

interface DragState {
  kind: 'prog' | 'ad';
  licUid?: number;
  contractId?: number;
  /** Herkunft: Sendeplatz-Nummer, oder null für die Ablage. */
  fromBlock: number | null;
  ghost: HTMLElement;
  pointerId: number;
}

let drag: DragState | null = null;
let pending: { x: number; y: number; card: HTMLElement; pointerId: number } | null = null;

export function isDragging(): boolean {
  return drag !== null;
}

function makeGhost(card: HTMLElement, x: number, y: number): HTMLElement {
  const g = card.cloneNode(true) as HTMLElement;
  g.classList.add('drag-ghost');
  g.style.width = `${card.offsetWidth}px`;
  g.style.left = `${x}px`;
  g.style.top = `${y}px`;
  document.body.appendChild(g);
  return g;
}

/**
 * Tafel und Ablage passen auf kleinen Bildschirmen nicht gleichzeitig ins Bild.
 * Wer eine Karte an den oberen oder unteren Rand zieht, schiebt die Ansicht mit.
 */
function scrollEdge(box: HTMLElement, y: number, top: number, bottom: number, zone: number): boolean {
  // Nur schieben, wenn es in die Richtung überhaupt noch weitergeht. Sonst
  // wandern die Zeilen unter dem Zeiger weg, obwohl gar nichts zu holen ist.
  const canUp = box.scrollTop > 1;
  const canDown = box.scrollTop + box.clientHeight < box.scrollHeight - 1;
  if (canUp && y < top + zone) { box.scrollTop -= (top + zone - y) * 0.4; return true; }
  if (canDown && y > bottom - zone) { box.scrollTop += (y - (bottom - zone)) * 0.4; return true; }
  return false;
}

function edgeScroll(x: number, y: number): void {
  const zone = 44;
  // Steht der Zeiger über den Sendeplätzen, wird zuerst diese Liste geschoben
  const rows = document.querySelector<HTMLElement>('.board-rows');
  if (rows) {
    const r = rows.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      if (scrollEdge(rows, y, r.top, r.bottom, zone)) return;
      return;
    }
  }
  const main = document.getElementById('main');
  if (main) scrollEdge(main, y, 0, window.innerHeight, zone + 56);
}

function pocketUnder(x: number, y: number): HTMLElement | null {
  const n = document.elementFromPoint(x, y);
  return (n as HTMLElement | null)?.closest<HTMLElement>('[data-drop]') ?? null;
}

function clearHighlights(): void {
  document.querySelectorAll('.drop-ok, .drop-no').forEach((n) => {
    n.classList.remove('drop-ok', 'drop-no');
  });
}

function accepts(target: HTMLElement, kind: 'prog' | 'ad'): boolean {
  const t = target.dataset.drop;
  if (t === 'shelf') return true;                 // zurücklegen ist immer erlaubt
  if (t === 'prog') return kind === 'prog';
  if (t === 'ad') return true;                    // Werbung oder Trailer
  return false;
}

/** Karte an einem Sendeplatz ablegen. */
function drop(target: HTMLElement | null): void {
  if (!drag) return;
  const g = G();
  const s = S();
  const day = Number(document.querySelector<HTMLElement>('.board')?.dataset.boardDay ?? g.day);
  const slots = getDay(g.player, day);

  const from = drag.fromBlock;
  const kind = drag.kind;

  // Erst die Herkunft räumen, damit ein Umhängen nicht dupliziert
  const clearFrom = () => {
    if (from === null) return;
    const f = slots[from];
    if (!f || f.aired) return;
    if (kind === 'prog') { f.prog = null; f.trailer = null; }
    else f.ad = null;
  };

  if (!target || target.dataset.drop === 'shelf') {
    if (from !== null) {
      clearFrom();
      playSfx('buy');
      toast('info', 'Zurückgelegt', kind === 'prog' ? 'Sendeplatz ist wieder frei.' : 'Werbeplatz ist wieder frei.');
    }
    finishDrag();
    return;
  }

  const b = Number(target.dataset.b);
  const slot = slots[b];
  if (!slot || slot.aired) {
    toast('warn', 'Zu spät', `${String(BLOCK_H[b]).padStart(2, '0')}:00 Uhr läuft bereits.`);
    finishDrag();
    return;
  }

  if (kind === 'prog') {
    const lic = g.player.licences.find((l) => l.uid === drag!.licUid);
    if (!lic) { finishDrag(); return; }
    clearFrom();
    if (target.dataset.drop === 'prog') {
      slot.prog = lic;
    } else {
      // Programm auf einem Werbeplatz wird zum Trailer
      slot.ad = null;
      slot.trailer = lic;
    }
    playSfx('buy');
  } else {
    if (target.dataset.drop !== 'ad') {
      toast('warn', 'Falscher Platz', 'Werbespots gehören auf den Werbeplatz rechts.');
      finishDrag();
      return;
    }
    const ct = g.player.contracts.find((c) => c.id === drag!.contractId);
    if (!ct) { finishDrag(); return; }
    clearFrom();
    slot.trailer = null;
    slot.ad = { id: ct.id, brand: ct.brand };
    playSfx('buy');
  }

  s.viewDay = Math.max(0, Math.min(3, day - g.day));
  markDirty();
  finishDrag();
}

function finishDrag(): void {
  drag?.ghost.remove();
  drag = null;
  pending = null;
  clearHighlights();
  document.body.classList.remove('dragging');
  markDirty();
}

function beginDrag(card: HTMLElement, x: number, y: number, pointerId: number): void {
  const licUid = card.dataset.lic ? Number(card.dataset.lic) : undefined;
  const contractId = card.dataset.ad ? Number(card.dataset.ad) : undefined;
  if (licUid === undefined && contractId === undefined) return;

  const pocket = card.closest<HTMLElement>('.pocket');
  drag = {
    kind: licUid !== undefined ? 'prog' : 'ad',
    licUid,
    contractId,
    fromBlock: pocket ? Number(pocket.dataset.b) : null,
    ghost: makeGhost(card, x, y),
    pointerId,
  };
  document.body.classList.add('dragging');
}

/** Nach jedem Neuzeichnen der Ansicht aufrufen. */
export function bindBoard(root: HTMLElement): void {
  const board = root.querySelector<HTMLElement>('.board');
  if (!board) return;

  // Ablagen lassen sich mit den Pfeilen verschieben; auf Karten ist die
  // Wischgeste fürs Ziehen reserviert.
  board.querySelectorAll<HTMLElement>('[data-rail]').forEach((btn) => {
    const shelf = btn.closest('.shelf');
    const rail = shelf?.querySelector<HTMLElement>('.shelf-rail');
    if (!rail) return;
    const overflow = rail.scrollWidth > rail.clientWidth + 4;
    if (!overflow) btn.setAttribute('disabled', '');
    btn.onclick = () => {
      rail.scrollBy({ left: Number(btn.dataset.rail) * 168, behavior: 'smooth' });
    };
  });

  board.querySelectorAll<HTMLElement>('[data-lic],[data-ad]').forEach((card) => {
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pending = { x: e.clientX, y: e.clientY, card, pointerId: e.pointerId };
    });
  });

  // Bewegung und Loslassen am Dokument, damit der Zeiger die Karte verlassen darf
  if (!boardWired) {
    boardWired = true;

    document.addEventListener('pointermove', (e) => {
      if (!drag && pending && e.pointerId === pending.pointerId) {
        const dx = e.clientX - pending.x;
        const dy = e.clientY - pending.y;
        // Erst ab einer klaren Bewegung ziehen — sonst wäre jeder Klick ein Zug
        if (Math.hypot(dx, dy) > 6) beginDrag(pending.card, e.clientX, e.clientY, e.pointerId);
      }
      if (!drag || e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      drag.ghost.style.left = `${e.clientX}px`;
      drag.ghost.style.top = `${e.clientY}px`;
      edgeScroll(e.clientX, e.clientY);
      clearHighlights();
      const target = pocketUnder(e.clientX, e.clientY);
      if (target && target.dataset.drop !== 'shelf') {
        target.classList.add(accepts(target, drag.kind) ? 'drop-ok' : 'drop-no');
      }
    }, { passive: false });

    document.addEventListener('pointerup', (e) => {
      if (drag && e.pointerId === drag.pointerId) {
        drop(pocketUnder(e.clientX, e.clientY));
        return;
      }
      pending = null;
    });

    document.addEventListener('pointercancel', () => { finishDrag(); });
  }
}

let boardWired = false;
