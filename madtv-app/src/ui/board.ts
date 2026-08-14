/**
 * Die Sendetafel — das Herzstück des Büros.
 *
 * Der Abend ist ein Raster aus 14 Halbstundenfeldern. Eine Sendung belegt
 * 1 bis 6 davon; ihre Karte zieht sich als Block über so viele Zeilen. Der
 * Werbeplatz bleibt stündlich und steht rechts daneben über zwei Zeilen.
 *
 * Gezeichnet mit HTML und CSS statt SVG oder Canvas: Die Karten tragen
 * Filmtitel, und Text ist genau das, was SVG schlechter kann als DOM — kein
 * Umbruch, kein Auslassungszeichen, keine Vorlesbarkeit.
 *
 * Ziehen ist eine Zugabe, kein Ersatz: Ein Klick auf einen Sendeplatz öffnet
 * weiterhin die Auswahlliste, damit die Tafel mit der Tastatur bedienbar bleibt.
 */
import {
  BLOCKS, GENRES, GROUPS, SLOTS, adSlotOf, clearProgramme, esc, estimateBlock,
  getDay, isPrime, lengthLabel, moneyShort, placeProgramme, slotHour, slotLabel, viewers,
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

/**
 * Eine Programmkassette. Wie viel darauf Platz hat, hängt an der Sendelänge:
 * Ein Halbstundenfeld ist 34 Pixel hoch, da passt eine Zeile — ein Dreistünder
 * hat Raum für Spulen, Untertitel und Frischebalken.
 */
export function progCard(l: Licence, opts: { grabbable?: boolean; span?: number } = {}): string {
  const gd = GENRES[l.genre];
  const wear = Math.round(l.fresh * 100);
  const span = opts.span ?? 2;
  const sz = span <= 1 ? 'sz1' : span === 2 ? 'sz2' : 'sz3';
  const grab = opts.grabbable ? ` data-lic="${l.uid}" tabindex="0" role="button"` : '';
  const title = `title="${esc(l.title)} — ${gd.name}, ${lengthLabel(l.lenSlots)}, Frische ${wear}%"`;

  if (sz === 'sz1') {
    // Eine Zeile: Titel, Freigabe, Länge — mehr ist nicht drin
    return `<div class="cass sz1" style="--h:${hue(l.genre)}"${grab} ${title}>` +
      `<span class="cass-title">${esc(l.title)}</span>` +
      `<span class="cass-fsk${l.fsk >= 18 ? ' hot' : ''}">${l.fsk === 0 ? 'o.A.' : l.fsk}</span>` +
      `<span class="cass-len">${lengthLabel(l.lenSlots)}</span></div>`;
  }

  return `<div class="cass ${sz}" style="--h:${hue(l.genre)}"${grab} ${title}>` +
    (sz === 'sz3' ? '<div class="cass-reels" aria-hidden="true"><i></i><i></i></div>' : '') +
    `<div class="cass-label"><span class="cass-title">${esc(l.title)}</span>` +
    `<span class="cass-meta">${gd.ico} ${gd.name}${l.isSerie ? ` · Folge ${l.ep}/${l.eps}` : ''}</span></div>` +
    '<div class="cass-foot">' +
    `<span class="cass-fsk${l.fsk >= 18 ? ' hot' : ''}">${l.fsk === 0 ? 'o.A.' : l.fsk}</span>` +
    `<span class="cass-len">${lengthLabel(l.lenSlots)}</span>` +
    `<span class="cass-wear"><i style="width:${wear}%"></i></span></div>` +
    '</div>';
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

  let cells = '';

  // Stundenschilder, jeweils über zwei Halbstundenzeilen
  for (let b = 0; b < BLOCKS; b++) {
    cells += `<div class="bhour${isPrime(b * 2) ? ' prime' : ''}" ` +
      `style="grid-row:${b * 2 + 1}/span 2;grid-column:1">` +
      `${String(slotHour(b * 2)).padStart(2, '0')}<small>Uhr</small></div>`;
  }

  // Sendeplätze
  for (let i = 0; i < SLOTS; i++) {
    const s = slots[i]!;
    if (s.prog && !s.start) continue;          // Fortsetzungsfeld, gehört zur Karte darüber
    const span = s.prog ? Math.max(1, s.len) : 1;
    const aired = s.aired;

    let inner: string;
    let cls = 'pocket prog';
    if (s.prog) {
      const est = aired && s.res ? s.res.total : estimateBlock(g, day, i).total;
      const tooEarly = s.prog.fsk >= 18 && slotHour(i) < 22 && slotHour(i) >= 6;
      const endet = i + span >= SLOTS ? '01:00' : slotLabel(i + span);
      // Auf einem einzelnen Halbstundenfeld ist für die Fußzeile kein Platz;
      // ihre Angaben stehen dann im Kurzhinweis der Karte.
      inner = progCard(s.prog, { grabbable: !aired, span }) +
        (span >= 2
          ? `<div class="pocket-note${tooEarly ? ' bad' : ''}">` +
            (tooEarly ? '⚠ zu früh · ' : '') +
            `bis ${endet} · <b>${viewers(est)}</b> ${aired ? 'gesehen' : 'erwartet'}</div>`
          : '');
      cls += aired ? ' aired' : ' filled';
    } else {
      inner = `<div class="pocket-empty">＋ ${slotLabel(i)}</div>`;
      if (aired) cls += ' aired';
    }

    const act = aired
      ? (s.res ? `data-act="showres" data-b="${i}" data-day="${day}"` : '')
      : `data-act="pickprog" data-b="${i}" data-day="${day}" data-drop="prog"`;

    cells += `<div class="${cls}" style="grid-row:${i + 1}/span ${span};grid-column:2" ${act} ` +
      `${aired ? '' : 'role="button" tabindex="0"'} aria-label="${slotLabel(i)}, Sendung">${inner}</div>`;
  }

  // Werbeplätze, stündlich
  for (let b = 0; b < BLOCKS; b++) {
    const i = adSlotOf(b);
    const s = slots[i]!;
    const aired = s.aired;

    let inner: string;
    let cls = 'pocket ad';
    if (s.ad) {
      const ct = p.contracts.find((c) => c.id === s.ad!.id);
      inner = ct
        ? adCard(ct, { grabbable: !aired })
        : `<div class="spot ghost"><div class="spot-brand">${esc(s.ad.brand)}</div>` +
          '<div class="spot-need">Vertrag beendet</div></div>';
      cls += aired ? ' aired' : ' filled';
    } else if (s.trailer) {
      inner = `<div class="trailer">🎞️ Trailer<span>${esc(s.trailer.title)}</span></div>`;
      cls += aired ? ' aired' : ' filled';
    } else {
      inner = '<div class="pocket-empty">＋ Werbung</div>';
      if (aired) cls += ' aired';
    }

    const act = aired ? '' : `data-act="pickad" data-b="${i}" data-day="${day}" data-drop="ad"`;
    cells += `<div class="${cls}" style="grid-row:${b * 2 + 1}/span 2;grid-column:3" ${act} ` +
      `${aired ? '' : 'role="button" tabindex="0"'} aria-label="${slotLabel(i)}, Werbung">${inner}</div>`;
  }

  // Ablagen
  const used = new Set(slots.filter((s) => s.prog).map((s) => s.prog!.uid));
  const shelf = [...p.licences]
    .sort((a, b) => Number(used.has(a.uid)) - Number(used.has(b.uid)) || b.qual - a.qual)
    .map((l) => `<div class="shelf-item${used.has(l.uid) ? ' used' : ''}">` +
      `${progCard(l, { grabbable: true, span: 3 })}</div>`)
    .join('');

  const open = p.contracts.filter((c) => c.done < c.spots);
  const koffer = open.length
    ? open.map((c) => `<div class="shelf-item">${adCard(c, { grabbable: true })}</div>`).join('')
    : '<div class="shelf-none">Kein offener Vertrag — ab in die Werbeagentur.</div>';

  const frei = slots.filter((s) => !s.prog && !s.aired).length;
  const stunden = p.licences.reduce((a, l) => a + l.lenSlots, 0) / 2;

  return (
    `<div class="board" data-board-day="${day}">` +
    `<div class="board-grid">${cells}</div>` +
    '<div class="board-foot">' +
    (frei
      ? `<b class="warn">${frei} × 30 Minuten Testbild</b>`
      : '<b class="ok">Abend vollständig belegt</b>') +
    ` · Archiv reicht für ${stunden.toFixed(1).replace('.', ',')} Sendestunden</div>` +
    shelfBlock('📼 Programmordner', `${p.licences.length} Titel · zum Sendeplatz ziehen`,
      shelf || '<div class="shelf-none">Archiv leer.</div>') +
    shelfBlock('📣 Werbekoffer', `${open.length} offen · auf den Werbeplatz ziehen`, koffer) +
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
  kind: 'prog' | 'ad' | 'news';
  licUid?: number;
  contractId?: number;
  newsId?: number;
  newsRes?: string;
  /** Herkunft: Feldnummer, oder null für die Ablage. */
  fromSlot: number | null;
  ghost: HTMLElement;
  pointerId: number;
}

let drag: DragState | null = null;
let pending: { x: number; y: number; card: HTMLElement; pointerId: number } | null = null;
let boardWired = false;

export function isDragging(): boolean {
  return drag !== null;
}

function makeGhost(card: HTMLElement, x: number, y: number): HTMLElement {
  const g = card.cloneNode(true) as HTMLElement;
  g.classList.add('drag-ghost');
  g.style.width = `${Math.min(200, card.offsetWidth)}px`;
  g.style.left = `${x}px`;
  g.style.top = `${y}px`;
  document.body.appendChild(g);
  return g;
}

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
  const rows = document.querySelector<HTMLElement>('.board-grid');
  if (rows) {
    const r = rows.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      scrollEdge(rows, y, r.top, r.bottom, zone);
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

/** Passt die gezogene Karte auf dieses Ziel? */
function accepts(target: HTMLElement, kind: DragState['kind']): boolean {
  const t = target.dataset.drop;
  if (kind === 'news') return t === 'news';
  if (t === 'news') return false;
  if (t === 'shelf') return true;                 // zurücklegen ist immer erlaubt
  if (t === 'ad') return true;                    // Werbung oder Trailer
  if (t !== 'prog' || kind !== 'prog') return false;
  // Die Sendung muss ab hier noch in den Abend passen
  const at = Number(target.dataset.b);
  const lic = G().player.licences.find((l) => l.uid === drag?.licUid);
  return !lic || at + lic.lenSlots <= SLOTS;
}

/** Meldung auf einen Prompterplatz setzen. */
function placeNews(index: number, id: number, res: string): void {
  const g = G();
  const item = g.newsPool[res as keyof typeof g.newsPool]?.find((n) => n.id === id);
  if (!item) return;
  const show = g.player.newsShow.filter((n) => n.id !== id);
  const at = Math.max(0, Math.min(index, show.length, 2));
  show.splice(at, 0, item);
  g.player.newsShow = show.slice(0, 3);
  playSfx('buy');
  markDirty();
}

function drop(target: HTMLElement | null): void {
  if (!drag) return;
  const g = G();
  const s = S();

  if (drag.kind === 'news') {
    if (target?.dataset.drop === 'news') {
      placeNews(Number(target.dataset.i), drag.newsId!, drag.newsRes!);
    }
    finishDrag();
    return;
  }

  const day = Number(document.querySelector<HTMLElement>('.board')?.dataset.boardDay ?? g.day);
  const slots = getDay(g.player, day);
  const { kind, fromSlot } = drag;

  const clearFrom = () => {
    if (fromSlot === null) return;
    const f = slots[fromSlot];
    if (!f || f.aired) return;
    if (kind === 'prog') { if (f.prog) clearProgramme(slots, f.prog.uid); f.trailer = null; }
    else f.ad = null;
  };

  if (!target || target.dataset.drop === 'shelf') {
    if (fromSlot !== null) {
      clearFrom();
      playSfx('buy');
      toast('info', 'Zurückgelegt',
        kind === 'prog' ? 'Der Sendeplatz ist wieder frei.' : 'Der Werbeplatz ist wieder frei.');
    }
    finishDrag();
    return;
  }

  const at = Number(target.dataset.b);
  const slot = slots[at];
  if (!slot || slot.aired) {
    toast('warn', 'Zu spät', `${slotLabel(at)} läuft bereits.`);
    finishDrag();
    return;
  }

  if (kind === 'prog') {
    const lic = g.player.licences.find((l) => l.uid === drag!.licUid);
    if (!lic) { finishDrag(); return; }

    if (target.dataset.drop === 'ad') {
      clearFrom();
      slot.ad = null;
      slot.trailer = lic;
      playSfx('buy');
    } else {
      if (at + lic.lenSlots > SLOTS) {
        toast('warn', 'Zu lang',
          `${lengthLabel(lic.lenSlots)} passen ab ${slotLabel(at)} nicht mehr in den Abend.`);
        finishDrag();
        return;
      }
      clearFrom();
      const weg = placeProgramme(slots, at, lic);
      if (!slots[at]!.prog) {
        toast('warn', 'Geht nicht', 'In diesem Bereich läuft schon gesendetes Programm.');
        finishDrag();
        return;
      }
      const verdraengt = weg.filter((w) => w.uid !== lic.uid);
      if (verdraengt.length) {
        toast('info', 'Umgeplant',
          `${verdraengt.map((w) => `«${w.title}»`).join(', ')} zurück in den Ordner.`);
      }
      playSfx('buy');
    }
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
  const newsId = card.dataset.news ? Number(card.dataset.news) : undefined;
  if (licUid === undefined && contractId === undefined && newsId === undefined) return;

  const pocket = card.closest<HTMLElement>('.pocket');
  drag = {
    kind: newsId !== undefined ? 'news' : licUid !== undefined ? 'prog' : 'ad',
    licUid,
    contractId,
    newsId,
    newsRes: card.dataset.res,
    fromSlot: pocket ? Number(pocket.dataset.b) : null,
    ghost: makeGhost(card, x, y),
    pointerId,
  };
  document.body.classList.add('dragging');
}

/** Nach jedem Neuzeichnen der Ansicht aufrufen. */
export function bindBoard(root: HTMLElement): void {
  wireGestures();

  // Redaktionstisch: Meldungen lassen sich ziehen oder anklicken
  root.querySelectorAll<HTMLElement>('[data-news]').forEach((item) => {
    item.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pending = { x: e.clientX, y: e.clientY, card: item, pointerId: e.pointerId };
    });
    const go = () => {
      const g = G();
      if (g.player.newsShow.length >= 3) {
        toast('warn', 'Prompter voll', 'Drei Meldungen passen in eine Sendung.');
        return;
      }
      placeNews(g.player.newsShow.length, Number(item.dataset.news), item.dataset.res!);
    };
    item.addEventListener('click', () => { if (!drag) go(); });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });

  const board = root.querySelector<HTMLElement>('.board');
  if (!board) return;

  // Ablagen lassen sich mit den Pfeilen verschieben; auf Karten ist die
  // Wischgeste fürs Ziehen reserviert.
  board.querySelectorAll<HTMLElement>('[data-rail]').forEach((btn) => {
    const rail = btn.closest('.shelf')?.querySelector<HTMLElement>('.shelf-rail');
    if (!rail) return;
    if (rail.scrollWidth <= rail.clientWidth + 4) btn.setAttribute('disabled', '');
    btn.onclick = () => rail.scrollBy({ left: Number(btn.dataset.rail) * 168, behavior: 'smooth' });
  });

  board.querySelectorAll<HTMLElement>('[data-lic],[data-ad]').forEach((card) => {
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pending = { x: e.clientX, y: e.clientY, card, pointerId: e.pointerId };
    });
  });
}

/** Zeigerbehandlung einmalig am Dokument, damit sie Neuzeichnungen übersteht. */
function wireGestures(): void {
  if (boardWired) return;
  boardWired = true;

  document.addEventListener('pointermove', (e) => {
    if (!drag && pending && e.pointerId === pending.pointerId) {
      const d = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      // Erst ab einer klaren Bewegung ziehen — sonst wäre jeder Klick ein Zug
      if (d > 6) beginDrag(pending.card, e.clientX, e.clientY, e.pointerId);
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
    if (drag && e.pointerId === drag.pointerId) { drop(pocketUnder(e.clientX, e.clientY)); return; }
    pending = null;
  });

  document.addEventListener('pointercancel', () => finishDrag());
}
