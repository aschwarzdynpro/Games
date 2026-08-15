/**
 * Dein Büro als gezeichneter Raum.
 *
 * Gebaut aus derselben Hand wie der Flur: flächige Vektorformen, dieselbe
 * dunkle Palette, Licht als weicher Verlauf statt als Effekt. Der Raum ist
 * Kulisse und Bedienoberfläche zugleich — was hier steht, entspricht genau dem,
 * was das Büro im Spiel kann, und nicht einem Möbelstück mehr. Ein Telefon, das
 * nichts tut, wäre eine Lüge im Bild.
 *
 * Alles steht auf zwei Linien: Was auf dem Boden steht, endet bei BODEN, was
 * auf dem Schreibtisch steht, bei PLATTE. Ohne diese zwei Zahlen schwebt in
 * einer gezeichneten Szene sofort irgendetwas, und das sieht man dem Bild an.
 *
 * Das Raster ist 1600×900. Wer den gezeichneten Hintergrund später gegen ein
 * gerendertes Bild tauscht, muss nur dieses Raster einhalten — die Klickpunkte
 * unten bleiben, wie sie sind.
 */
import type { Raumszene } from '../szene';

const W = 1600;
const H = 900;
/** Wo die Rückwand auf den Boden trifft. */
const BODEN = 604;
/** Oberkante der Schreibtischplatte — hierauf steht alles, was auf dem Tisch steht. */
const PLATTE = 640;
/** Der Tisch von links nach rechts. */
const TISCH_L = 300;
const TISCH_R = 1400;

/* ─────────── Bausteine ─────────── */

function defs(): string {
  return '<defs>' +
    '<linearGradient id="bWand" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#171e29"/><stop offset="1" stop-color="#222c3b"/></linearGradient>' +
    '<linearGradient id="bBoden" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#2b3546"/><stop offset="1" stop-color="#141a24"/></linearGradient>' +
    '<linearGradient id="bHimmel" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#2b2350"/><stop offset=".45" stop-color="#5a3a63"/>' +
    '<stop offset=".78" stop-color="#c4653f"/><stop offset="1" stop-color="#f0a24d"/></linearGradient>' +
    '<linearGradient id="bTisch" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#7a5636"/><stop offset="1" stop-color="#4a3220"/></linearGradient>' +
    '<linearGradient id="bLicht" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,224,160,.13)"/>' +
    '<stop offset="1" stop-color="rgba(255,224,160,0)"/></linearGradient>' +
    '<radialGradient id="bPfuetze">' +
    '<stop offset="0" stop-color="rgba(255,226,166,.30)"/>' +
    '<stop offset="1" stop-color="rgba(255,226,166,0)"/></radialGradient>' +
    '<linearGradient id="bRegal" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,214,150,.20)"/>' +
    '<stop offset="1" stop-color="rgba(255,214,150,0)"/></linearGradient>' +
    '<linearGradient id="bSchirm" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#1d2735"/><stop offset="1" stop-color="#111823"/></linearGradient>' +
    '</defs>';
}

/** Schatten unter einem Gegenstand — ohne den steht nichts wirklich auf etwas. */
function schatten(cx: number, y: number, rx: number): string {
  return `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${Math.max(5, rx * 0.13)}" ` +
    'fill="#000" opacity=".28"/>';
}

function raum(): string {
  let s = `<rect x="0" y="0" width="${W}" height="${BODEN}" fill="url(#bWand)"/>`;
  s += `<rect x="0" y="${BODEN}" width="${W}" height="${H - BODEN}" fill="url(#bBoden)"/>`;
  s += `<rect x="0" y="${BODEN - 14}" width="${W}" height="14" fill="#2c3646"/>`;
  for (let x = -200; x < W + 400; x += 118) {
    s += `<line x1="${x}" y1="${BODEN}" x2="${x - 150}" y2="${H}" ` +
      'stroke="rgba(255,255,255,.045)" stroke-width="2"/>';
  }
  return s;
}

/** Die Tür nach draußen, mit dem Schild, das auch im Flur hängt. */
function tuer(): string {
  const x = 78;
  const y = 132;
  const w = 232;
  const h = BODEN - y;
  return `<rect x="${x - 15}" y="${y - 15}" width="${w + 30}" height="${h + 15}" rx="5" fill="#3a2a1a"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#5d3f26"/>` +
    `<rect x="${x + 22}" y="${y + 30}" width="${w - 44}" height="150" rx="4" ` +
    'fill="none" stroke="#734f30" stroke-width="6"/>' +
    `<rect x="${x + 22}" y="${y + 208}" width="${w - 44}" height="196" rx="4" ` +
    'fill="none" stroke="#734f30" stroke-width="6"/>' +
    `<circle cx="${x + w - 30}" cy="${y + 232}" r="10" fill="#c9a961"/>` +
    `<rect x="${x + 20}" y="${y - 80}" width="${w - 40}" height="58" rx="6" ` +
    'fill="#141a24" stroke="#c9a961" stroke-width="3"/>' +
    `<text x="${x + w / 2}" y="${y - 49}" class="b-schild">DEIN BÜRO</text>` +
    `<text x="${x + w / 2}" y="${y - 31}" class="b-schild-klein">PROGRAMMDIREKTION</text>`;
}

/** Regalwand mit Ordnern und den Preisen, die man schon gewonnen hat. */
function regal(): string {
  const x = 470;
  const y = 96;
  const w = 330;
  const unten = 496;
  let s = `<rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${unten - y + 28}" rx="5" fill="#3d2b1b"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${unten - y}" fill="#1a1420"/>`;

  const boeden = [y + 118, y + 250, unten];
  for (const by of boeden) {
    s += `<rect x="${x}" y="${by}" width="${w}" height="10" fill="#5a4028"/>`;
    s += `<rect x="${x + 6}" y="${by - 60}" width="${w - 12}" height="60" fill="url(#bRegal)"/>`;
  }

  // Ordner in wechselnden Höhen, damit keine gleichmäßige Reihe entsteht
  const reihen = [
    { by: boeden[0]!, farben: ['#3a4b66', '#5a3242', '#2f5548', '#43384f'] },
    { by: boeden[1]!, farben: ['#2f5548', '#43384f', '#3a4b66', '#5c4a2a', '#5a3242'] },
  ];
  for (const r of reihen) {
    let bx = x + 20;
    r.farben.forEach((f, i) => {
      const bw = 24 + ((i * 7) % 14);
      const bh = 74 + ((i * 11) % 22);
      s += `<rect x="${bx}" y="${r.by - bh}" width="${bw}" height="${bh}" rx="2" fill="${f}"/>`;
      s += `<rect x="${bx + 3}" y="${r.by - bh + 12}" width="${bw - 6}" height="6" rx="2" fill="rgba(255,255,255,.22)"/>`;
      bx += bw + 6;
    });
  }

  // Zwei Sammy-Statuetten rechts auf dem obersten Brett
  [x + 236, x + 288].forEach((sx, i) => {
    const fuss = boeden[0]!;
    const hoehe = i ? 62 : 74;
    s += `<rect x="${sx - 13}" y="${fuss - 15}" width="26" height="15" rx="2" fill="#8a6f38"/>`;
    s += `<rect x="${sx - 3}" y="${fuss - hoehe}" width="6" height="${hoehe - 15}" fill="#c9a961"/>`;
    s += `<path d="M${sx} ${fuss - hoehe - 26} l8 17 19 3 -14 13 4 19 -17 -10 -17 10 4 -19 -14 -13 19 -3 z" fill="#e8c05a"/>`;
  });

  // Pflanze auf dem untersten Brett
  const px = x + 62;
  const py = boeden[2]!;
  s += `<path d="M${px - 20} ${py} l4 -30 h32 l4 30 z" fill="#4d5a4a"/>`;
  s += `<path d="M${px} ${py - 30} q-32 -12 -38 -46 q32 6 42 42" fill="#2f6b45"/>`;
  s += `<path d="M${px} ${py - 30} q32 -12 38 -46 q-32 6 -42 42" fill="#357a4f"/>`;
  s += `<path d="M${px} ${py - 30} q-6 -38 3 -55 q12 22 5 55" fill="#2f6b45"/>`;
  return s;
}

/** Fenster mit Jalousie und Stadt in der Dämmerung. */
function fenster(): string {
  const x = 1010;
  const y = 78;
  const w = 430;
  const h = 356;
  let s = `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="4" fill="#2b3546"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#bHimmel)"/>`;

  const haeuser = [
    { hx: 12, hw: 52, hh: 142 }, { hx: 70, hw: 38, hh: 92 }, { hx: 114, hw: 64, hh: 182 },
    { hx: 184, hw: 44, hh: 118 }, { hx: 234, hw: 56, hh: 160 }, { hx: 296, hw: 36, hh: 96 },
    { hx: 338, hw: 60, hh: 196 },
  ];
  for (const b of haeuser) {
    const by = y + h - b.hh;
    s += `<rect x="${x + b.hx}" y="${by}" width="${b.hw}" height="${b.hh}" fill="#1a1b2e" opacity=".88"/>`;
    for (let fy = by + 14; fy < y + h - 14; fy += 21) {
      for (let fx = x + b.hx + 8; fx < x + b.hx + b.hw - 9; fx += 15) {
        if ((fx + fy) % 3 === 0) {
          s += `<rect x="${fx}" y="${fy}" width="6" height="9" fill="#ffd98a" opacity=".55"/>`;
        }
      }
    }
  }
  // Zwei Palmen, weil das Sendehochhaus nun einmal nicht in Bochum steht
  [x + 56, x + 318].forEach((tx, i) => {
    const ty = y + h - 6;
    const th = i ? 112 : 88;
    s += `<path d="M${tx} ${ty} q4 -${th / 2} 0 -${th}" stroke="#141628" stroke-width="6" fill="none"/>`;
    for (const d of [-1, 1]) {
      s += `<path d="M${tx} ${ty - th} q${26 * d} -18 ${42 * d} -4" stroke="#141628" stroke-width="5" fill="none"/>`;
      s += `<path d="M${tx} ${ty - th} q${32 * d} 2 ${40 * d} 20" stroke="#141628" stroke-width="5" fill="none"/>`;
    }
  });

  for (let ly = y + 6; ly < y + h - 6; ly += 16) {
    s += `<rect x="${x}" y="${ly}" width="${w}" height="8" fill="#243040" opacity=".7"/>`;
  }
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#3b4757" stroke-width="7"/>`;
  return s;
}

/** Der Schreibtisch. Die Platte liegt auf PLATTE, alles andere richtet sich danach. */
function schreibtisch(): string {
  const w = TISCH_R - TISCH_L;
  return `<path d="M${TISCH_L - 40} ${PLATTE} h${w + 80} l-28 24 h-${w + 24} z" fill="#8a6440"/>` +
    `<rect x="${TISCH_L - 12}" y="${PLATTE + 24}" width="${w + 24}" height="20" fill="#3d2a19"/>` +
    `<rect x="${TISCH_L + 8}" y="${PLATTE + 44}" width="${w - 16}" height="${H - PLATTE - 44}" fill="url(#bTisch)"/>` +
    `<rect x="${TISCH_L + 40}" y="${PLATTE + 66}" width="188" height="150" rx="4" fill="#3b2917"/>` +
    [0, 1, 2].map((i) =>
      `<rect x="${TISCH_L + 54}" y="${PLATTE + 80 + i * 44}" width="160" height="30" rx="3" fill="#4d3722"/>` +
      `<rect x="${TISCH_L + 114}" y="${PLATTE + 91 + i * 44}" width="40" height="6" rx="3" fill="#8d6b45"/>`).join('') +
    `<rect x="${TISCH_L + 260}" y="${PLATTE - 5}" width="640" height="29" rx="4" fill="#19202a" opacity=".85"/>`;
}

/** Telefon, ganz links auf der Platte. */
function telefon(): string {
  const x = 400;
  return schatten(x, PLATTE, 68) +
    `<rect x="${x - 60}" y="${PLATTE - 40}" width="120" height="40" rx="6" fill="#232b38"/>` +
    `<rect x="${x - 46}" y="${PLATTE - 62}" width="92" height="24" rx="10" fill="#39434f"/>` +
    `<rect x="${x - 30}" y="${PLATTE - 28}" width="60" height="16" rx="3" fill="#3f6ea8" opacity=".6"/>`;
}

/** Kaffeebecher. */
function becher(): string {
  const x = 520;
  return schatten(x, PLATTE, 34) +
    `<path d="M${x + 28} ${PLATTE - 44} q24 4 24 16 t-24 16" fill="none" stroke="#dfe5ee" stroke-width="8"/>` +
    `<rect x="${x - 28}" y="${PLATTE - 56}" width="56" height="56" rx="6" fill="#e8ecf2"/>` +
    `<rect x="${x - 28}" y="${PLATTE - 32}" width="56" height="14" fill="#c8341f"/>`;
}

/** Der Laptop: hier wird der Sendeplan gemacht. */
function laptop(): string {
  const x = 700;
  return schatten(x, PLATTE + 2, 150) +
    `<path d="M${x - 116} ${PLATTE} h232 l26 22 h-284 z" fill="#39434f"/>` +
    `<rect x="${x - 110}" y="${PLATTE - 9}" width="220" height="10" rx="4" fill="#4a5563"/>` +
    `<path d="M${x - 102} ${PLATTE - 9} l15 -138 h174 l15 138 z" fill="#2b3341"/>` +
    `<path d="M${x - 90} ${PLATTE - 19} l12 -118 h156 l12 118 z" fill="url(#bSchirm)"/>` +
    [0, 1, 2, 3, 4, 5].map((i) =>
      `<rect x="${x - 72 + (i % 2) * 74}" y="${PLATTE - 124 + Math.floor(i / 2) * 30}" width="64" height="22" rx="3" ` +
      `fill="${i % 3 === 0 ? '#3f6ea8' : '#232d3c'}"/>`).join('') +
    `<rect x="${x - 72}" y="${PLATTE - 36}" width="138" height="8" rx="4" fill="#2f3c4d"/>`;
}

/** Schreibtischlampe. Ihr Kegel liegt über der Platte, nicht darunter. */
function lampe(): string {
  const x = 900;
  return schatten(x, PLATTE, 46) +
    `<rect x="${x - 42}" y="${PLATTE - 12}" width="84" height="12" rx="6" fill="#2b3546"/>` +
    `<rect x="${x - 4}" y="${PLATTE - 158}" width="8" height="146" fill="#3b4757"/>` +
    `<rect x="${x - 86}" y="${PLATTE - 176}" width="172" height="19" rx="9" fill="#2b3546"/>` +
    `<rect x="${x - 78}" y="${PLATTE - 158}" width="156" height="7" rx="3" fill="#ffe9b8" opacity=".92"/>`;
}

/**
 * Das Licht der Lampe: ein schmaler Kegel in der Luft und eine warme Pfütze auf
 * der Platte. Beides wird vor den Gegenständen gezeichnet — läge der Kegel über
 * dem Laptop, sähe er aus wie ein graues Brett und nicht wie Licht.
 */
function licht(): string {
  const x = 900;
  return `<ellipse cx="${x}" cy="${PLATTE + 4}" rx="330" ry="46" fill="url(#bPfuetze)"/>` +
    `<path d="M${x - 74} ${PLATTE - 151} L${x - 210} ${PLATTE + 16} L${x + 210} ${PLATTE + 16} ` +
    `L${x + 74} ${PLATTE - 151} Z" fill="url(#bLicht)"/>`;
}

/** Notizblock mit Stift. */
function notizblock(): string {
  const x = 1060;
  return schatten(x, PLATTE + 1, 72) +
    `<path d="M${x - 64} ${PLATTE - 2} h128 l6 22 h-140 z" fill="#efe7d4"/>` +
    `<path d="M${x - 52} ${PLATTE + 5} h104 M${x - 52} ${PLATTE + 13} h78" stroke="#b9ae95" stroke-width="3"/>` +
    `<path d="M${x + 32} ${PLATTE - 14} l34 -9 5 11 -34 10 z" fill="#2b3546"/>`;
}

/** Der Kontrollmonitor: was gerade läuft und wer zuschaut. */
function monitor(): string {
  const x = 1270;
  return schatten(x, PLATTE + 2, 110) +
    `<rect x="${x - 58}" y="${PLATTE - 14}" width="116" height="14" rx="5" fill="#39434f"/>` +
    `<rect x="${x - 10}" y="${PLATTE - 68}" width="20" height="56" fill="#39434f"/>` +
    `<rect x="${x - 132}" y="${PLATTE - 244}" width="264" height="180" rx="9" fill="#2b3341"/>` +
    `<rect x="${x - 120}" y="${PLATTE - 232}" width="240" height="156" rx="5" fill="#0d1219"/>` +
    `<text x="${x}" y="${PLATTE - 142}" class="b-mark">MADTV</text>` +
    `<rect x="${x - 76}" y="${PLATTE - 124}" width="152" height="7" rx="3" fill="#2f3c4d"/>` +
    `<rect x="${x - 48}" y="${PLATTE - 108}" width="96" height="7" rx="3" fill="#243040"/>`;
}

/** Der Werbekoffer steht auf dem Boden neben dem Schreibtisch. */
function koffer(): string {
  const x = 1500;
  const fuss = 858;
  return schatten(x, fuss + 4, 88) +
    `<rect x="${x - 74}" y="${fuss - 112}" width="148" height="112" rx="7" fill="#4a3420"/>` +
    `<rect x="${x - 64}" y="${fuss - 103}" width="128" height="94" rx="5" fill="#5d4227"/>` +
    `<rect x="${x - 74}" y="${fuss - 70}" width="148" height="10" fill="#332310"/>` +
    `<rect x="${x - 17}" y="${fuss - 124}" width="34" height="16" rx="7" fill="none" stroke="#332310" stroke-width="8"/>` +
    `<rect x="${x - 12}" y="${fuss - 76}" width="24" height="22" rx="3" fill="#c9a961"/>`;
}

/** Der Besuchersessel, ganz vorn links — er rahmt das Bild nach unten. */
function sessel(): string {
  return schatten(170, 872, 156) +
    '<rect x="44" y="736" width="212" height="112" rx="16" fill="#4a3428"/>' +
    '<rect x="58" y="700" width="184" height="76" rx="14" fill="#5c4133"/>' +
    '<rect x="30" y="748" width="40" height="92" rx="12" fill="#3d2a20"/>' +
    '<rect x="230" y="748" width="40" height="92" rx="12" fill="#3d2a20"/>';
}

function malen(): string {
  // Reihenfolge ist hier Bildaufbau: Wand, Möbel, dann das Licht auf der
  // Platte, und erst darauf, was auf dem Tisch steht.
  return defs() + raum() + tuer() + regal() + fenster() + schreibtisch() + licht() +
    telefon() + becher() + laptop() + lampe() + notizblock() + monitor() +
    koffer() + sessel();
}

/* ─────────── Was man anfassen kann ─────────── */

export const BUERO: Raumszene = {
  viewBox: `0 0 ${W} ${H}`,
  beschreibung: 'Dein Büro: Schreibtisch mit Laptop und Kontrollmonitor, Regalwand, Fenster zur Stadt, Tür zum Flur',
  malen,
  punkte: [
    {
      x: 584, y: 494, w: 232, h: 158,
      titel: 'Laptop', hinweis: 'Sendeplan füllen', ico: 'flr-office',
      act: 'fenster', daten: { f: 'sendeplan' },
    },
    {
      x: 1130, y: 388, w: 280, h: 190,
      titel: 'Kontrollmonitor', hinweis: 'Wer heute zugesehen hat', ico: 'ui-antenne',
      act: 'fenster', daten: { f: 'quote' },
    },
    {
      x: 1414, y: 730, w: 172, h: 132,
      titel: 'Werbekoffer', hinweis: 'Laufende Verträge', ico: 'flr-werbe',
      act: 'fenster', daten: { f: 'koffer' },
    },
    {
      x: 986, y: 608, w: 150, h: 62,
      titel: 'Notizblock', hinweis: 'Bilanz des Tages', ico: 'ui-buch',
      act: 'fenster', daten: { f: 'bilanz' },
    },
    {
      x: 452, y: 78, w: 366, h: 436,
      titel: 'Regalwand', hinweis: 'Konjunktur, Verlauf, Protokoll', ico: 'flr-archiv',
      act: 'fenster', daten: { f: 'lage' },
    },
    {
      x: 62, y: 118, w: 264, h: 486,
      titel: 'Tür', hinweis: 'Zurück in den Flur', ico: 'ui-hochhaus',
      act: 'back',
    },
  ],
};
