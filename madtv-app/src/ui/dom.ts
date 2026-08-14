/** Kleine DOM-Helfer. Bewusst mager — kein Framework in Etappe 1. */

export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Element #${id} fehlt`);
  return n as T;
}

/**
 * Klick und Tastatur an dasselbe Verhalten binden.
 * Elemente, die keine Schaltfläche sind, brauchen Enter und Leertaste selbst.
 */
export function activate(node: HTMLElement, run: () => void): void {
  node.onclick = (ev) => {
    ev.stopPropagation();
    if (node.hasAttribute('disabled')) return;
    run();
  };
  if (node.tagName !== 'BUTTON') {
    node.onkeydown = (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        ev.stopPropagation();
        if (!node.hasAttribute('disabled')) run();
      }
    };
  }
}
