/**
 * Zeichensatz.
 *
 * Bis Etappe 4 war jedes Symbol im Spiel ein Emoji. Das hatte drei Nachteile,
 * die sich mit der gezeichneten Grafik nicht mehr vertrugen: Emoji sehen auf
 * jedem Betriebssystem anders aus, sie lassen sich nicht einfärben — und im
 * SVG-Flur saß eine bunte Farbbitmap mitten in einer Strichzeichnung.
 *
 * Jetzt liegt jedes Symbol als eigene Datei unter `assets/icons/`. Der Build
 * liest sie ein (`?raw`), schneidet den Inhalt heraus und hängt ihn als
 * `<symbol>` in einen einzigen versteckten Sprite. Gezeichnet wird danach nur
 * noch mit `<use>`.
 *
 * Das hält beide Ausgabeformen heil: Es gibt keine Anfrage zur Laufzeit, also
 * funktioniert auch die Einzeldatei per Doppelklick. Und weil alle Symbole
 * `currentColor` benutzen, erben sie die Farbe ihrer Umgebung — ein Symbol,
 * jede Farbe.
 */

const RAW = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

/** Dateiname ohne Endung → Innenleben des SVG. */
const PARTS = new Map<string, string>();
for (const [path, src] of Object.entries(RAW)) {
  const name = path.slice(path.lastIndexOf('/') + 1, -4);
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  PARTS.set(name, inner);
}

export type IconName = string;

let spriteMounted = false;

/**
 * Den Sprite einmalig in die Seite hängen. Er steht ganz vorn im Body und ist
 * für die Vorlesehilfe unsichtbar — er zeichnet nichts, er hält nur Vorlagen.
 */
export function mountSprite(): void {
  if (spriteMounted || typeof document === 'undefined') return;
  spriteMounted = true;
  const holder = document.createElement('div');
  holder.id = 'sprite';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">' +
    [...PARTS.entries()]
      .map(([name, inner]) =>
        `<symbol id="i-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
        `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</symbol>`)
      .join('') +
    '</svg>';
  document.body.prepend(holder);
}

export interface IconOpts {
  /** Zusätzliche Klassen, etwa `big` oder eine Farbklasse. */
  cls?: string;
  /** Beschriftung für die Vorlesehilfe. Ohne sie gilt das Symbol als Schmuck. */
  label?: string;
}

/**
 * Ein Symbol als HTML-Schnipsel. Die Größe kommt aus der Schriftgröße der
 * Umgebung (`1em`), damit Symbol und Text ohne Nachjustieren zusammenpassen.
 */
export function icon(name: IconName, opts: IconOpts = {}): string {
  const known = PARTS.has(name);
  const cls = `ic${opts.cls ? ` ${opts.cls}` : ''}${known ? '' : ' ic-missing'}`;
  const a11y = opts.label
    ? `role="img" aria-label="${opts.label.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true"';
  if (!known) return `<svg class="${cls}" ${a11y} viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>`;
  return `<svg class="${cls}" ${a11y}><use href="#i-${name}"/></svg>`;
}

/**
 * Symbol als echtes Element — für die SVG-Szene, die kein innerHTML nutzt.
 *
 * Die Größe muss ausdrücklich dranstehen: Ein `<use>` auf ein `<symbol>` ohne
 * Maße füllt sonst 100 % des umgebenden Zeichenbereichs — in der Flurszene
 * wuchs das Türschild-Symbol dadurch über den ganzen Flur.
 */
export function iconUse(name: IconName, size = 24): SVGUseElement {
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  use.setAttribute('width', String(size));
  use.setAttribute('height', String(size));
  return use;
}
