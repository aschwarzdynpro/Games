/**
 * Ziehen und Ablegen, für alle Räume.
 *
 * Bis Etappe 5 steckte die gesamte Zeigerbehandlung in `board.ts` und kannte
 * genau drei Kartenarten der Sendetafel. Jeder weitere Raum hätte sie kopiert —
 * samt Ziehschwelle, Geisterkarte, Randscrollen und der Falle mit dem
 * abgebrochenen Fingerzug. Deshalb liegt der Mechanismus jetzt hier, und die
 * Räume steuern nur noch die Regeln bei.
 *
 * Der Vertrag ist bewusst schmal:
 *
 *   - Eine ziehbare Karte trägt `data-drag="<art>"`. Alles Weitere steht in
 *     ihren eigenen `data-*`-Feldern; die Regeln lesen es dort.
 *   - Ein Ziel trägt `data-drop="<name>"`.
 *   - Wer eine Art anmeldet, sagt, welche Ziele sie annimmt (`accepts`) und
 *     was beim Loslassen geschieht (`drop`).
 *
 * Die Zeigerbehandlung hängt am Dokument, nicht an den Karten: Die Panels
 * werden ständig neu gebaut, und ein Zug darf das überleben.
 */
import { markDirty } from './session';

export interface DragRules {
  /** Passt diese Karte auf dieses Ziel? Gilt für die Hervorhebung und den Abwurf. */
  accepts: (target: HTMLElement, card: HTMLElement) => boolean;
  /** Ziel ist null, wenn irgendwo ins Leere losgelassen wurde. */
  drop: (target: HTMLElement | null, card: HTMLElement) => void;
}

const RULES = new Map<string, DragRules>();

/** Eine Kartenart anmelden. Räume rufen das beim Laden ihres Moduls auf. */
export function registerDrag(kind: string, rules: DragRules): void {
  RULES.set(kind, rules);
}

interface Active {
  kind: string;
  card: HTMLElement;
  ghost: HTMLElement;
  pointerId: number;
}

let drag: Active | null = null;
let pending: {
  x: number; y: number; card: HTMLElement; pointerId: number;
  /** Berührung oder Maus — davon hängt ab, wann ein Zug anspringt. */
  tippen: boolean;
  /** Wann der Finger aufsetzte. */
  seit: number;
} | null = null;

/**
 * Wie lange ein Finger liegen bleiben muss, bevor aus dem Wischen ein Zug wird.
 *
 * Ohne diese Wartezeit war der Sendeplan auf einem Tablet nicht zu scrollen:
 * Jede Bewegung über sechs Punkte startete einen Zug, und der ruft
 * `preventDefault()` — womit das Blättern des Browsers unterbunden war. Am
 * Finger ist ein Wisch aber zuerst ein Wisch; ziehen will, wer erst hält.
 * Mit der Maus bleibt es bei den sechs Punkten, dort gibt es kein Scrollen zu
 * verwechseln.
 */
const HALTEN_MS = 320;
let wired = false;

export function isDragging(): boolean {
  return drag !== null;
}

function makeGhost(card: HTMLElement, x: number, y: number): HTMLElement {
  const g = card.cloneNode(true) as HTMLElement;
  g.classList.add('drag-ghost');
  g.style.width = `${Math.min(220, card.offsetWidth)}px`;
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

/**
 * Am Rand mitscrollen. Zuerst der eigene Scrollbereich unter dem Zeiger —
 * ein Raum kann ihn mit `data-scroll` auszeichnen —, sonst die Seite selbst.
 */
function edgeScroll(x: number, y: number): void {
  const zone = 44;
  for (const box of document.querySelectorAll<HTMLElement>('[data-scroll]')) {
    const r = box.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      scrollEdge(box, y, r.top, r.bottom, zone);
      return;
    }
  }
  const main = document.getElementById('main');
  if (main) scrollEdge(main, y, 0, window.innerHeight, zone + 56);
}

function targetUnder(x: number, y: number): HTMLElement | null {
  const n = document.elementFromPoint(x, y);
  return (n as HTMLElement | null)?.closest<HTMLElement>('[data-drop]') ?? null;
}

function clearHighlights(): void {
  document.querySelectorAll('.drop-ok, .drop-no').forEach((n) => {
    n.classList.remove('drop-ok', 'drop-no');
  });
}

export function finishDrag(): void {
  // Nur neu zeichnen, wenn wirklich gezogen wurde.
  //
  // `pointercancel` feuert auch dann, wenn der Browser eine Berührung als
  // Blättern übernimmt — und das tut er bei jedem Wisch, der auf einer Karte
  // beginnt. Das Neuzeichnen tauschte dabei mitten in der Bewegung den ganzen
  // Inhalt aus und würgte den Schwung ab: Der Sendeplan sprang nach zwölf
  // Punkten zurück und war auf dem Tablet praktisch nicht zu scrollen.
  const liefWas = drag !== null;
  drag?.ghost.remove();
  drag = null;
  pending = null;
  clearHighlights();
  document.body.classList.remove('dragging');
  if (liefWas) markDirty();
}

function begin(card: HTMLElement, x: number, y: number, pointerId: number): void {
  const kind = card.dataset.drag;
  if (!kind || !RULES.has(kind)) return;
  drag = { kind, card, ghost: makeGhost(card, x, y), pointerId };
  document.body.classList.add('dragging');
}

/**
 * Karten für den Zug scharf schalten. Nach jedem Neuzeichnen aufrufen — die
 * Elemente sind dann neu, die Zeigerbehandlung am Dokument bleibt bestehen.
 */
export function bindDrag(root: HTMLElement): void {
  wireGestures();
  root.querySelectorAll<HTMLElement>('[data-drag]').forEach((card) => {
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pending = {
        x: e.clientX, y: e.clientY, card, pointerId: e.pointerId,
        tippen: e.pointerType !== 'mouse', seit: performance.now(),
      };
    });
  });
}

function wireGestures(): void {
  if (wired) return;
  wired = true;

  document.addEventListener('pointermove', (e) => {
    if (!drag && pending && e.pointerId === pending.pointerId) {
      const d = Math.hypot(e.clientX - pending.x, e.clientY - pending.y);
      const gehalten = performance.now() - pending.seit >= HALTEN_MS;
      // Wer wischt, will blättern. Erst wer hält, will ziehen.
      if (pending.tippen && d > 6 && !gehalten) pending = null;
      // Erst ab einer klaren Bewegung ziehen — sonst wäre jeder Klick ein Zug
      else if (d > 6 && (!pending.tippen || gehalten)) {
        begin(pending.card, e.clientX, e.clientY, e.pointerId);
      }
    }
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    drag.ghost.style.left = `${e.clientX}px`;
    drag.ghost.style.top = `${e.clientY}px`;
    edgeScroll(e.clientX, e.clientY);
    clearHighlights();

    const target = targetUnder(e.clientX, e.clientY);
    const rules = RULES.get(drag.kind);
    // Die Rückgabefläche («zurücklegen») bleibt unmarkiert: Sie nimmt alles an,
    // eine Hervorhebung würde dort nichts aussagen.
    if (target && rules && target.dataset.drop !== 'shelf') {
      target.classList.add(rules.accepts(target, drag.card) ? 'drop-ok' : 'drop-no');
    }
  }, { passive: false });

  document.addEventListener('pointerup', (e) => {
    if (drag && e.pointerId === drag.pointerId) {
      const { kind, card } = drag;
      const target = targetUnder(e.clientX, e.clientY);
      finishDrag();
      RULES.get(kind)?.drop(target, card);
      return;
    }
    pending = null;
  });

  document.addEventListener('pointercancel', () => finishDrag());
}
