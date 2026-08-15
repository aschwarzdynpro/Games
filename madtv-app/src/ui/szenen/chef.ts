/**
 * Das Chefbüro.
 *
 * Der einzige Raum im Haus, in dem nicht du der Chef bist, und das soll man
 * sehen: Der Schreibtisch steht quer im Bild, Raffer sitzt dahinter, und man
 * selbst steht davor. Deshalb sind hier auch die Möbel schwerer, das Holz
 * dunkler und die Wand vertäfelt — das Büro nebenan hat Jalousien, dieses hat
 * Vorhänge.
 *
 * Dieselben zwei Linien wie überall: BODEN und PLATTE. Raster 1600×900.
 */
import { G } from '../session';
import type { Raumszene } from '../szene';

const W = 1600;
const H = 900;
const BODEN = 596;
const PLATTE = 648;
const TISCH_L = 420;
const TISCH_R = 1340;

function defs(): string {
  return '<defs>' +
    '<linearGradient id="cWand" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#241a17"/><stop offset="1" stop-color="#33241f"/></linearGradient>' +
    '<linearGradient id="cBoden" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#3a2a20"/><stop offset="1" stop-color="#1c1411"/></linearGradient>' +
    '<linearGradient id="cTisch" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#5a3a24"/><stop offset="1" stop-color="#33200f"/></linearGradient>' +
    '<linearGradient id="cVorhang" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#4a1f24"/><stop offset=".5" stop-color="#6b2f36"/>' +
    '<stop offset="1" stop-color="#3d191d"/></linearGradient>' +
    '<radialGradient id="cLampe">' +
    '<stop offset="0" stop-color="rgba(255,214,140,.26)"/>' +
    '<stop offset="1" stop-color="rgba(255,214,140,0)"/></radialGradient>' +
    '<radialGradient id="cRauch">' +
    '<stop offset="0" stop-color="rgba(226,226,226,.16)"/>' +
    '<stop offset="1" stop-color="rgba(226,226,226,0)"/></radialGradient>' +
    '</defs>';
}

function schatten(cx: number, y: number, rx: number): string {
  return `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${Math.max(5, rx * 0.14)}" ` +
    'fill="#000" opacity=".3"/>';
}

/** Wand mit Vertäfelung, Boden mit Teppich. */
function raum(): string {
  let s = `<rect x="0" y="0" width="${W}" height="${BODEN}" fill="url(#cWand)"/>`;
  // Vertäfelung: senkrechte Felder im unteren Wanddrittel
  s += `<rect x="0" y="${BODEN - 190}" width="${W}" height="190" fill="#2e2019"/>`;
  for (let x = 0; x < W; x += 104) {
    s += `<rect x="${x + 10}" y="${BODEN - 176}" width="84" height="150" rx="3" ` +
      'fill="none" stroke="#3d2b21" stroke-width="4"/>';
  }
  s += `<rect x="0" y="${BODEN - 196}" width="${W}" height="12" fill="#4a3428"/>`;
  s += `<rect x="0" y="${BODEN}" width="${W}" height="${H - BODEN}" fill="url(#cBoden)"/>`;
  // Teppich, der bis an den Bildrand läuft
  s += `<path d="M120 ${H} L300 ${BODEN + 26} H1300 L1480 ${H} Z" fill="#4a2226" opacity=".55"/>`;
  s += `<path d="M190 ${H} L345 ${BODEN + 42} H1255 L1410 ${H} Z" fill="none" ` +
    'stroke="#7a3b3f" stroke-width="5" opacity=".5"/>';
  return s;
}

/** Die Tür, schwerer als die eigene. */
function tuer(): string {
  const x = 74;
  const y = 118;
  const w = 236;
  const h = BODEN - y;
  return `<rect x="${x - 16}" y="${y - 16}" width="${w + 32}" height="${h + 16}" rx="5" fill="#291a12"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#4a2f1c"/>` +
    `<rect x="${x + 20}" y="${y + 28}" width="${w - 40}" height="160" rx="3" ` +
    'fill="none" stroke="#603d24" stroke-width="7"/>' +
    `<rect x="${x + 20}" y="${y + 216}" width="${w - 40}" height="200" rx="3" ` +
    'fill="none" stroke="#603d24" stroke-width="7"/>' +
    `<circle cx="${x + w - 28}" cy="${y + 240}" r="11" fill="#d8b45c"/>` +
    `<rect x="${x - 6}" y="${y - 86}" width="${w + 12}" height="62" rx="4" ` +
    'fill="#1b120d" stroke="#d8b45c" stroke-width="3"/>' +
    `<text x="${x + w / 2}" y="${y - 54}" class="c-schild">GENERALINTENDANZ</text>` +
    `<text x="${x + w / 2}" y="${y - 36}" class="c-schild-klein">ANKLOPFEN</text>`;
}

/** Fenster mit schweren Vorhängen — der Blick nach draußen ist hier verhängt. */
function vorhang(): string {
  const x = 1080;
  const y = 92;
  const w = 400;
  const h = 300;
  let s = `<rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="4" fill="#241812"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#151a2a"/>`;
  // Ein Streifen Nachthimmel zwischen den Vorhängen
  s += `<rect x="${x + 128}" y="${y}" width="${w - 256}" height="${h}" fill="#2a2140"/>`;
  for (let i = 0; i < 26; i++) {
    const sx = x + 134 + ((i * 53) % (w - 268));
    const sy = y + 18 + ((i * 97) % (h - 60));
    s += `<circle cx="${sx}" cy="${sy}" r="${i % 4 === 0 ? 2.4 : 1.5}" fill="#e8e2ff" opacity=".6"/>`;
  }
  // Vorhänge links und rechts, mit Falten
  for (const [vx, breit] of [[x, 132], [x + w - 132, 132]] as [number, number][]) {
    s += `<rect x="${vx}" y="${y - 8}" width="${breit}" height="${h + 8}" fill="url(#cVorhang)"/>`;
    for (let f = 0; f < 4; f++) {
      s += `<rect x="${vx + 14 + f * 30}" y="${y - 8}" width="7" height="${h + 8}" ` +
        'fill="#2e1216" opacity=".55"/>';
    }
  }
  s += `<rect x="${x - 20}" y="${y - 24}" width="${w + 40}" height="16" rx="8" fill="#5a4028"/>`;
  return s;
}

/** Der Aushang: Kork, Reißnägel, ein Blatt Papier. */
function aushang(): string {
  const x = 470;
  const y = 118;
  const w = 300;
  const h = 234;
  let s = `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="4" fill="#4a3628"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8a6f4a"/>`;
  // Papier leicht schief, wie angeheftet
  s += `<g transform="rotate(-1.4 ${x + w / 2} ${y + h / 2})">` +
    `<rect x="${x + 26}" y="${y + 20}" width="${w - 52}" height="${h - 44}" fill="#efe7d4"/>` +
    `<text x="${x + w / 2}" y="${y + 50}" class="c-aushang">SENDERANKING</text>`;
  for (let i = 0; i < 3; i++) {
    const ly = y + 76 + i * 34;
    s += `<rect x="${x + 44}" y="${ly}" width="${w - 128}" height="7" rx="3" fill="#b9ae95"/>`;
    s += `<rect x="${x + w - 76}" y="${ly}" width="34" height="7" rx="3" fill="#8d8straight"/>`
      .replace('#8d8straight', '#8d8570');
  }
  s += `<rect x="${x + 44}" y="${y + h - 44}" width="${w - 88}" height="6" rx="3" fill="#c6bca4"/>`;
  s += '</g>';
  // Reißnägel
  [[x + 34, y + 30], [x + w - 34, y + 30], [x + 34, y + h - 26], [x + w - 34, y + h - 26]]
    .forEach(([px, py]) => { s += `<circle cx="${px}" cy="${py}" r="7" fill="#c0392b"/>` +
      `<circle cx="${px! - 2}" cy="${py! - 2}" r="2.4" fill="#e8877c"/>`; });
  return s;
}

/** Das Kalenderblatt an der Wand — der Sammy-Termin. */
function kalender(): string {
  // Die Zahl ist gerechnet, nicht gemalt: Ein Kalender an der Wand, der immer
  // dasselbe zeigt, wäre eine Lüge im Bild.
  const g = G();
  const bis = 7 - (g.day % 7 || 7) + (g.day % 7 === 0 ? 7 : 0);
  const x = 856;
  const y = 150;
  const w = 148;
  const h = 176;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#efe7d4"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="46" rx="4" fill="#8a2f2f"/>`;
  s += `<rect x="${x}" y="${y + 38}" width="${w}" height="8" fill="#6e2424"/>`;
  s += `<text x="${x + w / 2}" y="${y + 31}" class="c-kal-kopf">SAMMY</text>`;
  s += `<text x="${x + w / 2}" y="${y + 116}" class="c-kal-tag">${bis}</text>`;
  s += `<rect x="${x + 24}" y="${y + 136}" width="${w - 48}" height="7" rx="3" fill="#b9ae95"/>`;
  s += `<rect x="${x + 40}" y="${y + 152}" width="${w - 80}" height="7" rx="3" fill="#cfc5b0"/>`;
  // Aufhängung
  s += `<circle cx="${x + w / 2}" cy="${y - 10}" r="6" fill="#8a6f38"/>`;
  s += `<path d="M${x + w / 2} ${y - 6} v10" stroke="#5a4028" stroke-width="4"/>`;
  return s;
}

/** Der Schreibtisch, quer im Bild — er trennt dich von ihm. */
function schreibtisch(): string {
  const w = TISCH_R - TISCH_L;
  return schatten((TISCH_L + TISCH_R) / 2, H - 26, w * 0.56) +
    `<path d="M${TISCH_L - 52} ${PLATTE} h${w + 104} l-34 26 h-${w + 36} z" fill="#6b4527"/>` +
    `<rect x="${TISCH_L - 18}" y="${PLATTE + 26}" width="${w + 36}" height="22" fill="#2c1c10"/>` +
    `<rect x="${TISCH_L}" y="${PLATTE + 48}" width="${w}" height="164" fill="url(#cTisch)"/>` +
    // Zierleisten auf der Blende
    `<rect x="${TISCH_L + 44}" y="${PLATTE + 72}" width="${w - 88}" height="112" rx="4" ` +
    'fill="none" stroke="#7a5230" stroke-width="5" opacity=".7"/>' +
    // Lederauflage
    `<rect x="${TISCH_L + 96}" y="${PLATTE - 6}" width="${w - 192}" height="30" rx="4" ` +
    'fill="#2a1a22" opacity=".85"/>' +
    // Das Namensschild auf der Vorderkante. Wer hier sitzt, hängt es sich hin.
    `<rect x="${TISCH_L + 330}" y="${PLATTE + 96}" width="260" height="62" rx="4" fill="#1b120d"/>` +
    `<rect x="${TISCH_L + 336}" y="${PLATTE + 102}" width="248" height="50" rx="3" ` +
    'fill="none" stroke="#d8b45c" stroke-width="2"/>' +
    `<text x="${TISCH_L + 460}" y="${PLATTE + 128}" class="c-schild">R. RAFFER</text>` +
    `<text x="${TISCH_L + 460}" y="${PLATTE + 146}" class="c-schild-klein">GENERALINTENDANT</text>`;
}

/**
 * Herr Raffer, sitzend.
 *
 * Dieselbe reduzierte Bauweise wie die Figur im Flur: runde Rechtecke, flache
 * Farben, kein Gesicht außer dem Nötigsten. Er sitzt hinter der Platte, also
 * wird er von ihr überschnitten — gezeichnet wird er deshalb vor dem Tisch.
 */
function raffer(): string {
  const x = 880;
  const sitz = PLATTE + 30;
  return (
    // Sessel
    `<rect x="${x - 96}" y="${sitz - 250}" width="192" height="230" rx="26" fill="#2e1a1e"/>` +
    `<rect x="${x - 82}" y="${sitz - 236}" width="164" height="200" rx="20" fill="#43272c"/>` +
    // Körper
    `<rect x="${x - 62}" y="${sitz - 168}" width="124" height="150" rx="26" fill="#1f2733"/>` +
    // Hemd und Krawatte
    `<path d="M${x - 20} ${sitz - 168} h40 l-6 60 -14 16 -14 -16 z" fill="#e8ecf2"/>` +
    `<path d="M${x} ${sitz - 152} l11 12 -7 46 -4 8 -4 -8 -7 -46 z" fill="#8a2f2f"/>` +
    // Arme auf der Platte
    `<rect x="${x - 108}" y="${sitz - 136}" width="56" height="104" rx="26" fill="#28313f"/>` +
    `<rect x="${x + 52}" y="${sitz - 136}" width="56" height="104" rx="26" fill="#28313f"/>` +
    // Kopf
    `<circle cx="${x}" cy="${sitz - 206}" r="42" fill="#e2b48c"/>` +
    // Kranz statt Haar, Koteletten
    `<path d="M${x - 42} ${sitz - 212} a42 42 0 0 1 84 0 a42 30 0 0 0 -84 0 z" fill="#3a3a3a" opacity=".25"/>` +
    `<path d="M${x - 43} ${sitz - 208} q6 -30 20 -34 M${x + 43} ${sitz - 208} q-6 -30 -20 -34" ` +
    'stroke="#6b6b6b" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    // Brille
    `<circle cx="${x - 15}" cy="${sitz - 210}" r="12" fill="none" stroke="#2b3546" stroke-width="3"/>` +
    `<circle cx="${x + 15}" cy="${sitz - 210}" r="12" fill="none" stroke="#2b3546" stroke-width="3"/>` +
    `<path d="M${x - 3} ${sitz - 210} h6" stroke="#2b3546" stroke-width="3"/>` +
    // Schnauzer und Mundlinie
    `<path d="M${x - 16} ${sitz - 186} h32" stroke="#6b6b6b" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M${x - 11} ${sitz - 174} q11 6 22 0" stroke="#a97a5c" stroke-width="3" fill="none" stroke-linecap="round"/>`
  );
}

/** Zigarre im Aschenbecher, dazu der Rauch. */
function zigarre(): string {
  const x = 1180;
  return schatten(x, PLATTE + 2, 44) +
    `<ellipse cx="${x}" cy="${PLATTE - 8}" rx="40" ry="14" fill="#2b3546"/>` +
    `<ellipse cx="${x}" cy="${PLATTE - 12}" rx="30" ry="9" fill="#151b24"/>` +
    `<rect x="${x - 6}" y="${PLATTE - 26}" width="54" height="11" rx="5" ` +
    'fill="#6b4a2c" transform="rotate(-12 ' + `${x} ${PLATTE - 20})"/>` +
    `<circle cx="${x + 48}" cy="${PLATTE - 34}" r="5" fill="#e2703a"/>` +
    `<ellipse cx="${x + 60}" cy="${PLATTE - 120}" rx="72" ry="96" fill="url(#cRauch)"/>`;
}

/** Schreibtischlampe mit grünem Glasschirm. */
function lampe(): string {
  const x = 590;
  return schatten(x, PLATTE + 2, 52) +
    `<ellipse cx="${x}" cy="${PLATTE - 8}" rx="44" ry="13" fill="#3a2a18"/>` +
    `<rect x="${x - 5}" y="${PLATTE - 92}" width="10" height="84" fill="#8a6f38"/>` +
    `<path d="M${x - 66} ${PLATTE - 92} q66 -34 132 0 z" fill="#1f6b45"/>` +
    `<path d="M${x - 66} ${PLATTE - 92} h132 v9 h-132 z" fill="#164e33"/>` +
    `<ellipse cx="${x}" cy="${PLATTE + 4}" rx="200" ry="40" fill="url(#cLampe)"/>`;
}

/** Aktenstapel und Telefon — das Handwerkszeug eines Intendanten. */
function kleinkram(): string {
  return schatten(1290, PLATTE + 2, 52) +
    `<rect x="1244" y="${PLATTE - 16}" width="92" height="16" rx="3" fill="#d8cfb8"/>` +
    `<rect x="1250" y="${PLATTE - 30}" width="92" height="16" rx="3" fill="#efe7d4"/>` +
    `<rect x="1246" y="${PLATTE - 44}" width="92" height="16" rx="3" fill="#e2dac9"/>` +
    schatten(500, PLATTE + 2, 58) +
    `<rect x="452" y="${PLATTE - 40}" width="106" height="40" rx="6" fill="#1b120d"/>` +
    `<rect x="464" y="${PLATTE - 60}" width="82" height="22" rx="10" fill="#2e1f16"/>` +
    `<rect x="476" y="${PLATTE - 28}" width="58" height="16" rx="3" fill="#8a2f2f" opacity=".7"/>`;
}

/** Zwei Besucherstühle, halb angeschnitten — hier sitzt man, wenn man gerufen wird. */
function stuehle(): string {
  // Angeschnitten am unteren Rand: Sie stehen zwischen Betrachter und Tisch und
  // machen aus der Rückwand einen Raum, in dem man selbst steht.
  const stuhl = (x: number): string =>
    `<rect x="${x - 104}" y="806" width="208" height="120" rx="16" fill="#33191d"/>` +
    `<rect x="${x - 92}" y="770" width="184" height="74" rx="14" fill="#4a2a2f"/>` +
    `<rect x="${x - 118}" y="812" width="34" height="88" rx="14" fill="#2a1418"/>` +
    `<rect x="${x + 84}" y="812" width="34" height="88" rx="14" fill="#2a1418"/>`;
  return schatten(452, 900, 138) + schatten(1156, 900, 138) + stuhl(452) + stuhl(1156);
}

function malen(): string {
  return defs() + raum() + tuer() + aushang() + kalender() + vorhang() +
    schreibtisch() + raffer() + lampe() + zigarre() + kleinkram() + stuehle();
}

export const CHEF: Raumszene = {
  viewBox: `0 0 ${W} ${H}`,
  beschreibung: 'Chefbüro: Herr Raffer hinter einem schweren Schreibtisch, an der Wand der Aushang mit dem Senderanking und ein Kalenderblatt',
  malen,
  punkte: [
    {
      x: 762, y: 396, w: 240, h: 260,
      titel: 'Herr Raffer', hinweis: 'Was er dir zu sagen hat', ico: 'flr-chef',
      act: 'fenster', daten: { f: 'raffer' },
    },
    {
      x: 452, y: 100, w: 336, h: 272,
      titel: 'Aushang', hinweis: 'Senderanking der Intendanz', ico: 'ui-diagramm',
      act: 'fenster', daten: { f: 'ranking' },
    },
    {
      x: 844, y: 136, w: 172, h: 204,
      titel: 'Kalenderblatt', hinweis: 'Wann die Sammys verliehen werden', ico: 'ui-pokal',
      act: 'fenster', daten: { f: 'sammy' },
    },
    {
      x: 58, y: 104, w: 268, h: 494,
      titel: 'Tür', hinweis: 'Zurück in den Flur', ico: 'ui-hochhaus',
      act: 'back',
    },
  ],
};
