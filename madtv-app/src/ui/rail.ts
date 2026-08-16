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

/* ─────────── Gescrollte Stelle über das Neuzeichnen retten ─────────── */

/**
 * Die Ansicht wird komplett neu geschrieben, sobald sich am Spielstand etwas
 * ändert — spätestens alle dreißig Spielminuten. Bis eben warf das jede
 * gescrollte Reihe an den Anfang zurück: Wer in der Kundenkartei nach hinten
 * blätterte, stand Sekunden später wieder bei der ersten Karte.
 *
 * Der Schlüssel ist Klasse plus laufende Nummer unter Gleichen. Er muss nur
 * innerhalb einer Ansicht eindeutig sein; wechselt der Raum, passt er ohnehin
 * auf nichts mehr.
 */
/**
 * Alles, was in sich scrollt und dessen Stelle das Neuschreiben überleben muss.
 *
 * Anfangs standen hier nur die waagerechten Regalreihen — und genau das war die
 * Lücke: Das Fenster über der Szene scrollt senkrecht, und wer im Sendeplan
 * nach unten sah, stand nach spätestens zwölf Spielminuten wieder ganz oben.
 * Gemerkt werden deshalb beide Richtungen.
 */
function scroller(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(
    '.shelf-rail, [data-scroll], .fenster-inhalt, .board-grid',
  )];
}

function schluessel(el: HTMLElement, alle: HTMLElement[]): string {
  const gleiche = alle.filter((x) => x.className === el.className);
  return `${el.className}#${gleiche.indexOf(el)}`;
}

/** Vor dem Neuschreiben aufrufen und das Ergebnis an `scrollZurueck` geben. */
export function scrollMerken(root: ParentNode): Map<string, [number, number]> {
  const alle = scroller(root);
  const stand = new Map<string, [number, number]>();
  alle.forEach((el) => {
    if (el.scrollLeft > 0 || el.scrollTop > 0) {
      stand.set(schluessel(el, alle), [el.scrollLeft, el.scrollTop]);
    }
  });
  return stand;
}

/** Nach dem Neuschreiben aufrufen. Was nicht mehr passt, fällt weg. */
export function scrollZurueck(root: ParentNode, stand: Map<string, [number, number]>): void {
  if (!stand.size) return;
  const alle = scroller(root);
  alle.forEach((el) => {
    const wert = stand.get(schluessel(el, alle));
    if (!wert) return;
    // Nie über das Ende hinaus: Der Inhalt kann inzwischen kürzer sein.
    if (wert[0]) el.scrollLeft = Math.min(wert[0], el.scrollWidth - el.clientWidth);
    if (wert[1]) el.scrollTop = Math.min(wert[1], el.scrollHeight - el.clientHeight);
  });
}

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
