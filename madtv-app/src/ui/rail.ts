/**
 * Pfeile für die Regalwände.
 *
 * Mehrere Räume stellen ihre Ware in eine Reihe, die breiter ist als das
 * Fenster: die Kundenkartei, das Drehbuchregal, der Garderobengang, die Tasche
 * mit den Geschenken, die Kioskvitrine. Mit dem Finger wischt man da einfach
 * weiter — mit der Maus sieht man acht von neunzehn Bändern und ahnt nicht,
 * dass es überhaupt weitergeht.
 *
 * Deshalb bekommt jede solche Reihe dieselben zwei Pfeile, die der Sendeplan
 * über seiner Ablage schon hat. Sie schalten sich ab, sobald es in ihre
 * Richtung nichts mehr zu sehen gibt — das ist zugleich die Antwort auf die
 * Frage, ob da noch was kommt.
 */
import { icon } from './icons';

/**
 * Die zwei Knöpfe, gedacht für die Kopfzeile über der Reihe. Der Kasten, der
 * Kopf und Reihe zusammenhält, braucht `data-railbox`.
 */
export function railNav(label: string): string {
  return `<span class="shelf-nav"><button data-rail="-1" aria-label="${label} nach links">${icon('ui-links')}</button>` +
    `<button data-rail="1" aria-label="${label} nach rechts">${icon('ui-rechts')}</button></span>`;
}

/** Der Kasten samt Kennzeichnung, damit Kopf und Reihe zusammenfinden. */
export const RAILBOX = 'data-railbox';

/**
 * Verdrahtet alle Pfeile unterhalb von `root`. Wird nach jedem Neuzeichnen
 * aufgerufen; die Zuhörer hängen an frisch erzeugten Knoten und verschwinden
 * mit ihnen.
 */
export function bindRails(root: ParentNode): void {
  const boxen = new Set<HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-rail]').forEach((btn) => {
    const box = btn.closest<HTMLElement>('.shelf, [data-railbox]');
    if (box) boxen.add(box);
  });

  boxen.forEach((box) => {
    const rail = box.querySelector<HTMLElement>('.shelf-rail, [data-scroll]');
    const knoepfe = box.querySelectorAll<HTMLButtonElement>('[data-rail]');
    if (!rail || !knoepfe.length) return;

    const stand = (): void => {
      const rest = rail.scrollWidth - rail.clientWidth;
      knoepfe.forEach((b) => {
        const links = Number(b.dataset.rail) < 0;
        const aus = rest <= 4 || (links ? rail.scrollLeft <= 2 : rail.scrollLeft >= rest - 2);
        b.disabled = aus;
      });
    };

    knoepfe.forEach((b) => {
      b.onclick = () => {
        // Etwa eine Kartenbreite, aber nie mehr als das Sichtfenster
        const weite = Math.min(rail.clientWidth * 0.8, 200);
        rail.scrollBy({ left: Number(b.dataset.rail) * weite, behavior: 'smooth' });
      };
    });
    rail.addEventListener('scroll', stand, { passive: true });
    stand();
  });
}
