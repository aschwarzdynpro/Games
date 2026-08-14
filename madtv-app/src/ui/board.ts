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
import { icon } from './icons';
import {
  BLOCKS, GENRES, GROUPS, SLOTS, adSlotOf, clearProgramme, esc, estimateBlock,
  getDay, isPrime, lengthLabel, moneyShort, placeProgramme, slotHour, slotLabel, viewers,
  currentSlot,
} from '../core';
import type { BlockResult, Contract, Licence, Slot } from '../core';
import { G, S, markDirty } from './session';
import { bindDrag, isDragging, registerDrag } from './drag';
import { bindRails, railNav } from './rail';
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
  const grab = opts.grabbable ? ` data-drag="prog" data-lic="${l.uid}" tabindex="0" role="button"` : '';
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
    `<span class="cass-meta">${icon(gd.ico)} ${gd.name}${l.isSerie ? ` · Folge ${l.ep}/${l.eps}` : ''}</span></div>` +
    '<div class="cass-foot">' +
    `<span class="cass-fsk${l.fsk >= 18 ? ' hot' : ''}">${l.fsk === 0 ? 'o.A.' : l.fsk}</span>` +
    `<span class="cass-len">${lengthLabel(l.lenSlots)}</span>` +
    `<span class="cass-wear"><i style="width:${wear}%"></i></span></div>` +
    '</div>';
}

/**
 * Werbekarte. Sobald der Block gelaufen ist, steht dort nicht mehr die
 * Forderung, sondern was daraus geworden ist — vorher wusste man erst am
 * nächsten Tag, ob ein Spot gezählt hat.
 */
function adCard(
  c: Contract,
  opts: { grabbable?: boolean; res?: BlockResult | null; laeuft?: boolean } = {},
): string {
  const left = c.spots - c.done;
  const erreicht = opts.res ? (c.group ? opts.res.groups[c.gi]! : opts.res.total) : null;
  const geschafft = erreicht !== null && erreicht >= c.minAud;

  const fuss = erreicht !== null
    ? `<div class="spot-foot ${geschafft ? 'ok' : 'bad'}">` +
      `<span>${geschafft ? 'gezählt' : 'verfehlt'}</span><b>${viewers(erreicht)}</b></div>`
    : `<div class="spot-foot"><span>${left}× offen</span><b>${moneyShort(c.perSpot)}</b></div>`;

  return (
    `<div class="spot${erreicht !== null ? (geschafft ? ' geschafft' : ' verfehlt') : ''}` +
    `${opts.laeuft ? ' laeuft' : ''}"` +
    `${opts.grabbable ? ` data-drag="ad" data-ad="${c.id}" tabindex="0" role="button"` : ''}` +
    ` title="${esc(c.brand)} — mindestens ${viewers(c.minAud)}">` +
    `<div class="spot-brand">${esc(c.brand)}</div>` +
    `<div class="spot-need">${viewers(c.minAud)}${c.group ? ` · ${icon(GROUPS[c.gi]!.ico)}` : ''}</div>` +
    fuss +
    '</div>'
  );
}

/* ─────────── Gegenüber ─────────── */

/**
 * Was zur selben Halbstunde bei der Konkurrenz läuft.
 *
 * Im Rivalenbüro stand der Hinweis schon lange — gleiches Genre zur gleichen
 * Zeit teilt die Zuschauer —, nur sah man beim Planen nicht, wogegen man
 * plant. Die Spalte steht deshalb direkt neben dem Sendeplan und markiert die
 * Zeile, in der man dem Nachbarn ins selbe Genre läuft.
 */
function gegenspalte(day: number, meine: Slot[]): string {
  const g = G();
  // Gelesen, nicht angelegt: getDay() würde den Tag erzeugen, und Zeichnen
  // soll den Spielstand nicht verändern.
  const rivalen = g.ch.slice(1).map((c, n) => ({ ch: c, slots: c.sched[day], nr: n + 1 }));
  let out = '';

  for (let i = 0; i < SLOTS; i++) {
    const zeilen = rivalen.map(({ ch, slots, nr }) => {
      const prog = slots[i]?.prog;
      if (!prog) {
        return `<div class="gg-z k${nr}" title="${esc(ch.name)}: Testbild">` +
          `<b>${esc(ch.name.slice(0, 2))}</b><span class="dim">Testbild</span></div>`;
      }
      const gd = GENRES[prog.genre];
      const clash = meine[i]?.prog?.genre === prog.genre;
      return `<div class="gg-z k${nr}${clash ? ' clash' : ''}" ` +
        `title="${esc(ch.name)}: ${esc(prog.title)} (${gd.name})` +
        `${clash ? ' — dasselbe Genre wie bei dir' : ''}">` +
        `<b>${esc(ch.name.slice(0, 2))}</b>${icon(gd.ico)}<span>${esc(prog.title)}</span></div>`;
    }).join('');

    out += `<div class="gegen" style="grid-row:${i + 1};grid-column:4" ` +
      `aria-label="${slotLabel(i)}, Konkurrenz">${zeilen}</div>`;
  }
  return out;
}

/* ─────────── Tafel ─────────── */

export function renderBoard(day: number): string {
  const g = G();
  const p = g.player;
  const slots = getDay(p, day);

  // Welches Feld gerade auf Sendung ist — nur für den heutigen Plan
  const jetzt = day === g.day ? currentSlot(g.time) : null;

  let cells = '';

  // Stundenschilder, jeweils über zwei Halbstundenzeilen
  for (let b = 0; b < BLOCKS; b++) {
    const laeuft = jetzt !== null && Math.floor(jetzt / 2) === b;
    cells += `<div class="bhour${isPrime(b * 2) ? ' prime' : ''}${laeuft ? ' jetzt' : ''}" ` +
      `style="grid-row:${b * 2 + 1}/span 2;grid-column:1">` +
      `${String(slotHour(b * 2)).padStart(2, '0')}<small>Uhr</small></div>`;
  }

  // Sendeplätze
  for (let i = 0; i < SLOTS; i++) {
    const s = slots[i]!;
    if (s.prog && !s.start) continue;          // Fortsetzungsfeld, gehört zur Karte darüber
    const span = s.prog ? Math.max(1, s.len) : 1;
    const aired = s.aired;

    // Läuft dieses Feld gerade? Bei einer langen Sendung auch jedes Folgefeld.
    const laeuft = jetzt !== null && jetzt >= i && jetzt < i + span;

    let inner: string;
    let cls = 'pocket prog';
    if (s.prog) {
      // Läuft die Sendung gerade, zählt das Feld, das *jetzt* auf Sendung ist —
      // sonst stünde auf der Karte die erste halbe Stunde und in der Kopfzeile
      // die laufende, und beide Zahlen widersprächen sich.
      const jetztRes = laeuft && jetzt !== null ? slots[jetzt]?.res : null;
      const est = jetztRes ? jetztRes.total
        : aired && s.res ? s.res.total : estimateBlock(g, day, i).total;
      const tooEarly = s.prog.fsk >= 18 && slotHour(i) < 22 && slotHour(i) >= 6;
      const endet = i + span >= SLOTS ? '01:00' : slotLabel(i + span);
      // Auf einem einzelnen Halbstundenfeld ist für die Fußzeile kein Platz;
      // ihre Angaben stehen dann im Kurzhinweis der Karte.
      inner = (laeuft ? '<div class="onair-pip">auf Sendung</div>' : '') +
        progCard(s.prog, { grabbable: !aired, span }) +
        (span >= 2
          ? `<div class="pocket-note${tooEarly ? ' bad' : ''}">` +
            (tooEarly ? `${icon('ui-warnung')} zu früh · ` : '') +
            `bis ${endet} · <b>${viewers(est)}</b> ` +
            (laeuft ? 'schauen zu' : aired ? 'gesehen' : 'erwartet') + '</div>'
          : '');
      cls += aired ? ' aired' : ' filled';
    } else {
      inner = (laeuft ? '<div class="onair-pip">auf Sendung</div>' : '') +
        `<div class="pocket-empty">${icon('ui-plus')} ${slotLabel(i)}</div>`;
      if (aired) cls += ' aired';
    }
    if (laeuft) cls += ' jetzt';

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

    const laeuft = jetzt === i;

    let inner: string;
    let cls = 'pocket ad';
    if (s.ad) {
      const ct = p.contracts.find((c) => c.id === s.ad!.id);
      inner = ct
        ? adCard(ct, { grabbable: !aired, res: aired ? s.res : null, laeuft })
        : `<div class="spot ghost"><div class="spot-brand">${esc(s.ad.brand)}</div>` +
          '<div class="spot-need">Vertrag beendet</div></div>';
      cls += aired ? ' aired' : ' filled';
    } else if (s.trailer) {
      inner = `<div class="trailer">${icon('ui-trailer')} Trailer<span>${esc(s.trailer.title)}</span></div>`;
      cls += aired ? ' aired' : ' filled';
    } else {
      inner = `<div class="pocket-empty">${icon('ui-plus')} Werbung</div>`;
      if (aired) cls += ' aired';
    }

    if (laeuft) cls += ' jetzt';

    const act = aired ? '' : `data-act="pickad" data-b="${i}" data-day="${day}" data-drop="ad"`;
    cells += `<div class="${cls}" style="grid-row:${b * 2 + 1}/span 2;grid-column:3" ${act} ` +
      `${aired ? '' : 'role="button" tabindex="0"'} aria-label="${slotLabel(i)}, Werbung">${inner}</div>`;
  }

  cells += gegenspalte(day, slots);

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
  // Was der Abend bisher gebracht hat — Summe über die gelaufenen Felder
  const bisher = slots.reduce((a, s) => a + (s.aired && s.res ? s.res.total : 0), 0);
  const gelaufen = slots.filter((s) => s.aired && s.ad);
  const spotsOk = gelaufen.filter((s) => {
    const ct = p.contracts.find((c) => c.id === s.ad!.id);
    if (!ct || !s.res) return false;
    return (ct.group ? s.res.groups[ct.gi]! : s.res.total) >= ct.minAud;
  }).length;
  const stunden = p.licences.reduce((a, l) => a + l.lenSlots, 0) / 2;

  return (
    `<div class="board" data-board-day="${day}">` +
    '<div class="board-kopf"><span></span><span>Sendeplatz</span><span>Werbung</span>' +
    `<span>Gegenüber <i>${esc(g.ch[1]!.name)} · ${esc(g.ch[2]!.name)}</i></span></div>` +
    `<div class="board-grid" data-scroll>${cells}</div>` +
    '<div class="board-foot">' +
    (frei
      ? `<b class="warn">${frei} × 30 Minuten Testbild</b>`
      : '<b class="ok">Abend vollständig belegt</b>') +
    ` · Archiv reicht für ${stunden.toFixed(1).replace('.', ',')} Sendestunden` +
    (bisher > 0
      ? ` · <b>${viewers(bisher)}</b> Zuschauer bisher` +
        (gelaufen.length ? ` · ${spotsOk}/${gelaufen.length} Spots gezählt` : '')
      : '') +
    '</div>' +
    shelfBlock(`${icon('ui-kassette')} Programmordner`, `${p.licences.length} Titel · zum Sendeplatz ziehen`,
      shelf || '<div class="shelf-none">Archiv leer.</div>') +
    shelfBlock(`${icon('flr-werbe')} Werbekoffer`, `${open.length} offen · auf den Werbeplatz ziehen`, koffer) +
    '</div>'
  );
}

function shelfBlock(title: string, note: string, inner: string): string {
  return '<div class="shelf">' +
    `<div class="shelf-head">${title} <span>${note}</span>${railNav('Ablage')}</div>` +
    `<div class="shelf-rail" data-drop="shelf">${inner}</div></div>`;
}

/* ─────────── Ziehen und Ablegen ─────────── */

/** Feldnummer, aus der die Karte stammt — oder null, wenn aus der Ablage. */
function slotOf(card: HTMLElement): number | null {
  const pocket = card.closest<HTMLElement>('.pocket');
  return pocket ? Number(pocket.dataset.b) : null;
}

/** Der Sendeplan, den die gerade sichtbare Tafel zeigt. */
function shownDay(): number {
  const g = G();
  return Number(document.querySelector<HTMLElement>('.board')?.dataset.boardDay ?? g.day);
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

/**
 * Das Feld räumen, aus dem die Karte kam. Muss vor dem Neuplatzieren
 * geschehen, sonst verdrängt sich eine Sendung beim Umhängen selbst.
 */
function clearOrigin(slots: Slot[], card: HTMLElement, kind: 'prog' | 'ad'): void {
  const from = slotOf(card);
  if (from === null) return;
  const f = slots[from];
  if (!f || f.aired) return;
  if (kind === 'prog') { if (f.prog) clearProgramme(slots, f.prog.uid); f.trailer = null; }
  else f.ad = null;
}

/** Zurücklegen: gilt für die Ablage genauso wie für den Wurf ins Leere. */
function putBack(card: HTMLElement, kind: 'prog' | 'ad'): void {
  if (slotOf(card) === null) return;
  clearOrigin(getDay(G().player, shownDay()), card, kind);
  playSfx('buy');
  toast('info', 'Zurückgelegt',
    kind === 'prog' ? 'Der Sendeplatz ist wieder frei.' : 'Der Werbeplatz ist wieder frei.');
  markDirty();
}

registerDrag('prog', {
  accepts: (target, card) => {
    const t = target.dataset.drop;
    if (t === 'shelf') return true;                 // zurücklegen ist immer erlaubt
    if (t === 'ad') return true;                    // wird dann zum Trailer
    if (t !== 'prog') return false;
    // Die Sendung muss ab hier noch in den Abend passen
    const at = Number(target.dataset.b);
    const lic = G().player.licences.find((l) => l.uid === Number(card.dataset.lic));
    return !lic || at + lic.lenSlots <= SLOTS;
  },
  drop: (target, card) => {
    const g = G();
    const s = S();
    if (!target || target.dataset.drop === 'shelf') { putBack(card, 'prog'); return; }
    if (target.dataset.drop === 'news') return;

    const day = shownDay();
    const slots = getDay(g.player, day);
    const at = Number(target.dataset.b);
    const slot = slots[at];
    if (!slot || slot.aired) {
      toast('warn', 'Zu spät', `${slotLabel(at)} läuft bereits.`);
      return;
    }
    const lic = g.player.licences.find((l) => l.uid === Number(card.dataset.lic));
    if (!lic) return;

    if (target.dataset.drop === 'ad') {
      clearOrigin(slots, card, 'prog');
      slot.ad = null;
      slot.trailer = lic;
      playSfx('buy');
    } else {
      if (at + lic.lenSlots > SLOTS) {
        toast('warn', 'Zu lang',
          `${lengthLabel(lic.lenSlots)} passen ab ${slotLabel(at)} nicht mehr in den Abend.`);
        return;
      }
      clearOrigin(slots, card, 'prog');
      const weg = placeProgramme(slots, at, lic);
      if (!slots[at]!.prog) {
        toast('warn', 'Geht nicht', 'In diesem Bereich läuft schon gesendetes Programm.');
        return;
      }
      const verdraengt = weg.filter((w) => w.uid !== lic.uid);
      if (verdraengt.length) {
        toast('info', 'Umgeplant',
          `${verdraengt.map((w) => `«${w.title}»`).join(', ')} zurück in den Ordner.`);
      }
      playSfx('buy');
    }
    s.viewDay = Math.max(0, Math.min(3, day - g.day));
    markDirty();
  },
});

registerDrag('ad', {
  accepts: (target) => target.dataset.drop === 'ad' || target.dataset.drop === 'shelf',
  drop: (target, card) => {
    const g = G();
    const s = S();
    if (!target || target.dataset.drop === 'shelf') { putBack(card, 'ad'); return; }
    if (target.dataset.drop !== 'ad') {
      toast('warn', 'Falscher Platz', 'Werbespots gehören auf den Werbeplatz rechts.');
      return;
    }
    const day = shownDay();
    const slots = getDay(g.player, day);
    const at = Number(target.dataset.b);
    const slot = slots[at];
    if (!slot || slot.aired) {
      toast('warn', 'Zu spät', `${slotLabel(at)} läuft bereits.`);
      return;
    }
    const ct = g.player.contracts.find((c) => c.id === Number(card.dataset.ad));
    if (!ct) return;
    clearOrigin(slots, card, 'ad');
    slot.trailer = null;
    slot.ad = { id: ct.id, brand: ct.brand };
    playSfx('buy');
    s.viewDay = Math.max(0, Math.min(3, day - g.day));
    markDirty();
  },
});

registerDrag('news', {
  accepts: (target) => target.dataset.drop === 'news',
  drop: (target, card) => {
    if (target?.dataset.drop !== 'news') return;
    placeNews(Number(target.dataset.i), Number(card.dataset.news), card.dataset.res!);
  },
});

/** Nach jedem Neuzeichnen der Ansicht aufrufen. */
export function bindBoard(root: HTMLElement): void {
  bindDrag(root);

  // Redaktionstisch: Meldungen lassen sich ziehen — oder anklicken, dann
  // landen sie auf dem nächsten freien Platz.
  root.querySelectorAll<HTMLElement>('[data-news]').forEach((item) => {
    const go = () => {
      const g = G();
      if (g.player.newsShow.length >= 3) {
        toast('warn', 'Prompter voll', 'Drei Meldungen passen in eine Sendung.');
        return;
      }
      placeNews(g.player.newsShow.length, Number(item.dataset.news), item.dataset.res!);
    };
    item.addEventListener('click', () => { if (!isDragging()) go(); });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });

  // Ablagen lassen sich mit den Pfeilen verschieben; auf Karten ist die
  // Wischgeste fürs Ziehen reserviert.
  bindRails(root);
}
