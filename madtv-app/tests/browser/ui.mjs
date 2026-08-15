/**
 * Prüfungen, die einen echten Browser brauchen.
 *
 * Alles, was der Spielkern rechnet, prüft Vitest ohne DOM. Was hier steht, ist
 * genau das, was dort nicht messbar ist: ob ein Symbol tatsächlich in seiner
 * Schachtel bleibt, ob eine Regalwand ihre Pfeile bekommt, ob eine Seite auf
 * einem schmalen Gerät seitlich überläuft. Jede einzelne Prüfung hier steht
 * für einen Fehler, der schon einmal da war.
 *
 * Aufruf: `npm run test:ui`. Der Ordner wird vorher frisch gebaut, damit nie
 * ein alter Stand geprüft wird.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = 5599;

/* ─────────── Playwright finden ─────────── */

async function ladePlaywright() {
  // Playwright ist ein CommonJS-Paket; createRequire findet es auch dann, wenn
  // es global statt im Projekt liegt.
  const req = createRequire(import.meta.url);
  const orte = [
    'playwright',
    join(ROOT, 'node_modules/playwright'),
    '/opt/node22/lib/node_modules/playwright',
  ];
  for (const ort of orte) {
    try {
      return req(ort).chromium;
    } catch { /* nächster Ort */ }
  }
  console.error(
    'Playwright ist nicht auffindbar. Diese Prüfung braucht einen Browser:\n' +
    '  npm i -D playwright && npx playwright install chromium\n' +
    'Alle übrigen Prüfungen laufen ohne Browser: npm test',
  );
  process.exit(2);
}

/* ─────────── Winziger Dateiserver ─────────── */

const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
  // Seit die Raumbilder eigene Dateien sind, kommen sie hier durch. Ohne diesen
  // Eintrag gingen sie als application/octet-stream hinaus.
  '.webp': 'image/webp',
};

function serve() {
  const srv = createServer((req, res) => {
    const pfad = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let datei = join(DIST, normalize(pfad).replace(/^(\.\.[/\\])+/, ''));
    if (!existsSync(datei) || statSync(datei).isDirectory()) datei = join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPEN[extname(datei)] ?? 'application/octet-stream' });
    createReadStream(datei).pipe(res);
  });
  return new Promise((ok, fehl) => {
    srv.once('error', (e) => fehl(
      e.code === 'EADDRINUSE'
        ? new Error(`Port ${PORT} ist belegt — läuft noch ein Server aus einem früheren Lauf?`)
        : e,
    ));
    srv.listen(PORT, () => ok(srv));
  });
}

/* ─────────── Kleiner Prüfläufer ─────────── */

const fehler = [];
let zahl = 0;

function pruefe(name, bedingung, detail = '') {
  zahl++;
  if (bedingung) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fehler.push(name + (detail ? ` — ${detail}` : ''));
  }
}

/* ─────────── Ablauf im Browser ─────────── */

/** Startbildschirm überspringen und die Begrüßungsdialoge wegklicken. */
async function starte(seite) {
  await seite.goto(`http://localhost:${PORT}/`);
  await seite.waitForSelector('#gobtn');
  await seite.click('#gobtn');
  for (let i = 0; i < 5; i++) {
    if (await seite.isVisible('#modal.on')) await seite.click('#mbox .mf button:last-child');
    await seite.waitForTimeout(150);
  }
}

/** Wartet, bis der Fahrstuhl steht — die Fahrt kostet Spielminuten. */
async function angekommen(seite) {
  await seite.waitForFunction(() => window.madtv.session().elevBusy === 0, { timeout: 30_000 });
  await seite.waitForTimeout(250);
}

/**
 * Ob der Hintergrund eines Raums wirklich ein geladenes Bild ist.
 *
 * Früher stand hier die Frage, ob die Quelle mit `data:image/` beginnt — damals
 * steckten die Bilder als Daten-URI im Bündel. Seit sie im Ordner-Build eigene
 * Dateien sind, wäre das die falsche Frage; und sie war ohnehin die schwächere.
 * Jetzt wird die Quelle tatsächlich geholt: Ein Verweis, der ins Leere zeigt,
 * fällt damit auf, eine Daten-URI besteht weiterhin.
 */
async function hintergrundBild(seite) {
  return seite.evaluate(async () => {
    const i = document.querySelector('.raum-grund image');
    if (!i) return null;
    const r = i.getBoundingClientRect();
    const quelle = i.getAttribute('href') ?? '';
    let typ = null; let geladen = false;
    try {
      const antwort = await fetch(quelle);
      geladen = antwort.ok;
      typ = antwort.headers.get('content-type');
    } catch (e) { typ = `Fehler: ${e.message}`; }
    return { breit: Math.round(r.width), hoch: Math.round(r.height), geladen, typ };
  });
}

async function raumRundgang(seite, meldungen) {
  const etagen = await seite.evaluate(() => window.madtv.core.FLOORS.map((f) => f.name));
  for (let i = 0; i < etagen.length; i++) {
    await seite.keyboard.press('Escape');
    await seite.waitForTimeout(150);
    await seite.click(`[data-go="${i}"]`);
    await angekommen(seite);
    const zustand = await seite.evaluate(() => ({
      // Ein Raum ist entweder ein Panel oder eine begehbare Szene.
      inhalt: !!document.querySelector('#view .room, #view .raum-szene'),
      ueberlauf: document.body.scrollWidth - document.body.clientWidth,
    }));
    pruefe(`Raum «${etagen[i]}» zeichnet`, zustand.inhalt);
    pruefe(`Raum «${etagen[i]}» läuft nicht seitlich über`, zustand.ueberlauf <= 1,
      `${zustand.ueberlauf} px zu breit`);
  }
  pruefe('Rundgang ohne Konsolenfehler', meldungen.length === 0, meldungen.join(' | '));
}

async function main() {
  const chromium = await ladePlaywright();

  console.log('Baue den Ordner …');
  const bau = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8' });
  if (bau.status !== 0) {
    console.error(bau.stdout + bau.stderr);
    process.exit(1);
  }

  /* ── Die Einzeldatei muss eine Datei bleiben ──
     Sie ist zum Verschicken da. Ein eingebettetes Raumbild wiegt als Daten-URI
     rund ein Drittel mehr als die Datei selbst; drei davon trieben sie von 271
     auf 913 KB. Deshalb lässt `ohneRaumbilder()` die Bilder dort weg und die
     betroffenen Räume fallen auf ihr Panel zurück. Geprüft wird beides: dass
     kein Bild drinsteckt und dass auch keins von außen nachgeladen wird. */
  console.log('\nEinzeldatei');
  {
    const einzel = spawnSync('npm', ['run', 'build:single'], { cwd: ROOT, encoding: 'utf8' });
    if (einzel.status !== 0) {
      console.error(einzel.stdout + einzel.stderr);
      process.exit(1);
    }
    const ordner = join(ROOT, 'dist-single');
    const dateien = readdirSync(ordner);
    const html = readFileSync(join(ordner, 'index.html'), 'utf8');
    const kb = Math.round(Buffer.byteLength(html) / 1024);

    pruefe('sie besteht aus genau einer Datei', dateien.length === 1, dateien.join(', '));
    pruefe('ohne eingebettetes Raumbild', !html.includes('data:image/webp'));
    pruefe('und ohne Verweis auf eine Bilddatei', !/["'(][^"'()]*\.webp/.test(html));
    // Der Deckel ist großzügig gesetzt: Er soll das Wiedereinwandern eines
    // Bildes melden, nicht jedes Kilobyte Spielinhalt.
    pruefe('sie bleibt unter 400 KB', kb < 400, `${kb} KB`);
  }

  const srv = await serve();
  const browser = await chromium.launch();

  /* ── Weite Ansicht: Inhalte und Bedienung ── */
  console.log('\nWeite Ansicht (1240×950)');
  const meldungen = [];
  const seite = await browser.newPage({ viewport: { width: 1240, height: 950 } });
  seite.on('pageerror', (e) => meldungen.push('Ausnahme: ' + e.message));
  seite.on('console', (m) => { if (m.type() === 'error') meldungen.push('Konsole: ' + m.text()); });

  await starte(seite);

  // Symbole. Ein <use> ohne Größe füllte einmal die ganze Szene.
  const symbole = await seite.evaluate(() => {
    const fehlend = [];
    let zuGross = 0;
    for (const u of document.querySelectorAll('use')) {
      const id = (u.getAttribute('href') ?? u.getAttribute('xlink:href') ?? '').slice(1);
      if (id && !document.getElementById(id)) fehlend.push(id);
      const r = u.getBoundingClientRect();
      if (r.width > 200 || r.height > 200) zuGross++;
    }
    return { fehlend, zuGross, gesamt: document.querySelectorAll('use').length };
  });
  pruefe('jedes Symbol hat sein <symbol>', symbole.fehlend.length === 0, symbole.fehlend.join(','));
  pruefe('kein Symbol sprengt seine Schachtel', symbole.zuGross === 0,
    `${symbole.zuGross} von ${symbole.gesamt}`);

  // Kopfzeile. Hier stand einmal «8,1 Mio € €».
  const kopf = await seite.evaluate(() => document.getElementById('topbar').innerText);
  pruefe('Kopfzeile ohne doppeltes Währungszeichen', !/€\s*€/.test(kopf), kopf.replace(/\n/g, ' '));
  pruefe('Kopfzeile zeigt die Uhr', /\d\d:\d\d/.test(kopf));

  // Lesbarkeit. Kleine Schrift braucht nach WCAG AA 4,5:1, ab 18px reichen 3:1.
  const kontrast = await seite.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // Der Untergrund ist die erste gefüllte Fläche darüber. Elemente über einem
    // Farbverlauf werden übersprungen: Deren Grundfarbe steht nirgends als
    // einzelner Wert, und geraten wäre schlimmer als nicht geprüft.
    const grund = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const st = getComputedStyle(n);
        if (st.backgroundImage !== 'none') return null;
        const c = st.backgroundColor;
        if (c && !/rgba?\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      }
      return 'rgb(14,17,22)';
    };

    const schlecht = [];
    for (const el of document.querySelectorAll('#view *, #topbar *, #bottom *')) {
      if (!el.innerText?.trim() || el.children.length || el.offsetParent === null) continue;
      const st = getComputedStyle(el);
      const bg = grund(el);
      if (!bg) continue;
      const px = parseFloat(st.fontSize);
      const noetig = px >= 18 || (px >= 14 && Number(st.fontWeight) >= 700) ? 3 : 4.5;
      const a = lum(st.color), b = lum(bg);
      const k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (k < noetig) {
        schlecht.push(`${k.toFixed(2)}:1 bei ${Math.round(px)}px — «${el.innerText.trim().slice(0, 24)}»`);
      }
    }
    return [...new Set(schlecht)];
  });
  pruefe('alle Texte erreichen den Kontrastwert AA', kontrast.length === 0,
    kontrast.slice(0, 5).join(' | '));

  // Landmarken und Meldungen — ohne die findet ein Vorleseprogramm nichts.
  const struktur = await seite.evaluate(() => ({
    lang: document.documentElement.lang,
    landmarks: ['header', 'main', 'nav'].filter((t) => document.querySelector(t)),
    live: !!document.querySelector('#toasts[aria-live]'),
    ohneNamen: [...document.querySelectorAll('button,[role="button"],[tabindex="0"]')]
      .filter((e) => !(e.innerText || '').trim() && !e.getAttribute('aria-label') && !e.title)
      .map((e) => e.className || e.tagName),
  }));
  pruefe('Seite ist als deutsch ausgezeichnet', struktur.lang === 'de', struktur.lang);
  pruefe('Kopf, Inhalt und Etagenleiste sind Landmarken', struktur.landmarks.length === 3,
    struktur.landmarks.join(','));
  pruefe('Meldungen werden vorgelesen', struktur.live);
  pruefe('jedes bedienbare Element hat einen Namen', struktur.ohneNamen.length === 0,
    struktur.ohneNamen.slice(0, 5).join(','));

  // Die Steckwand. Seit das Büro eine begehbare Szene ist, liegt sie im Fenster
  // hinter dem Laptop — geprüft wird sie dort, wo der Spieler sie auch findet.
  await seite.click('[data-f="sendeplan"].hs');
  await seite.waitForTimeout(350);
  const tafel = await seite.evaluate(() => ({
    felder: document.querySelectorAll('.pocket.prog').length,
    werbung: document.querySelectorAll('.pocket.ad').length,
    gegen: document.querySelectorAll('.gegen').length,
    stunden: document.querySelectorAll('.bhour').length,
  }));
  pruefe('Sendeplan hat 7 Werbeplätze', tafel.werbung === 7, String(tafel.werbung));
  pruefe('Sendeplan hat 7 Stundenschilder', tafel.stunden === 7, String(tafel.stunden));
  pruefe('Gegenüber-Spalte hat 14 Halbstunden', tafel.gegen === 14, String(tafel.gegen));
  pruefe('Sendeplan hat Felder', tafel.felder > 0, String(tafel.felder));

  // Alle vier Sendeplan-Reiter, weiterhin im offenen Fenster. Der vierte reicht
  // einen Tag weiter, als die Konkurrenz plant — genau dort hat die
  // Gegenüber-Spalte einmal geworfen.
  for (const reiter of ['Morgen', 'Mittwoch', 'Donnerstag']) {
    const vorher = meldungen.length;
    await seite.click(`button:has-text("${reiter}")`);
    await seite.waitForTimeout(400);
    const zeilen = await seite.evaluate(() => document.querySelectorAll('.gegen').length);
    pruefe(`Reiter «${reiter}» zeichnet vollständig`, zeilen === 14, `${zeilen} Zeilen`);
    pruefe(`Reiter «${reiter}» wirft nicht`, meldungen.length === vorher,
      meldungen.slice(vorher, vorher + 1).join(''));
  }
  await seite.click('button:has-text("Heute")');
  await seite.waitForTimeout(300);
  await seite.click('.fenster-zu');
  await seite.waitForTimeout(250);

  // Tastatur. Jede Station muss sichtbar umrandet sein, sonst weiß niemand,
  // wo er gerade steht.
  const ohneRahmen = [];
  const stationen = [];
  for (let i = 0; i < 20; i++) {
    await seite.keyboard.press('Tab');
    const f = await seite.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const st = getComputedStyle(a);
      // Klickpunkte in der Raumszene sind SVG-Gruppen; ihre Fokusanzeige sitzt
      // auf dem Rechteck darin, das die gestrichelte Linie gegen eine volle
      // tauscht. Ein outline am <g> gäbe es dort nicht zu sehen.
      const feld = a.classList?.contains('hs') ? a.querySelector('.hs-feld') : null;
      const rahmen = feld
        ? getComputedStyle(feld).strokeDasharray === 'none'
        : st.outlineStyle !== 'none' && st.outlineWidth !== '0px';
      return {
        name: (a.innerText || a.getAttribute('aria-label') || a.className?.baseVal
          || a.className || a.tagName).toString().trim().slice(0, 24),
        rahmen,
      };
    });
    if (!f) continue;
    stationen.push(f.name);
    if (!f.rahmen) ohneRahmen.push(f.name);
  }
  pruefe('Tabulator erreicht mindestens 15 Stationen', stationen.length >= 15, String(stationen.length));
  pruefe('jede Tabulatorstation ist sichtbar umrandet', ohneRahmen.length === 0,
    [...new Set(ohneRahmen)].slice(0, 5).join(','));

  // Regalwände: was überläuft, braucht Pfeile, und die schalten am Rand ab.
  await seite.keyboard.press('Escape');
  await seite.waitForTimeout(150);
  await seite.click('[data-go="5"]');                      // Werbeagentur
  await angekommen(seite);
  // Seit der Raum eine Szene ist, liegt die Kartei im Karteikasten und nicht
  // mehr offen im Panel — der Weg dorthin ist einen Klick länger.
  await seite.click('[data-f="kartei"].hs');
  await seite.waitForTimeout(350);
  const regal = await seite.evaluate(() => {
    const r = document.querySelector('.kartei');
    const kasten = r?.closest('[data-railbox]');
    const knoepfe = [...(kasten?.querySelectorAll('[data-rail]') ?? [])];
    return {
      ueberlauf: r ? r.scrollWidth > r.clientWidth + 4 : false,
      knoepfe: knoepfe.length,
      linksAus: knoepfe[0]?.disabled === true,
      rechtsAn: knoepfe[1]?.disabled === false,
    };
  });
  pruefe('Kundenkartei läuft über', regal.ueberlauf);
  pruefe('Kundenkartei hat zwei Pfeile', regal.knoepfe === 2, String(regal.knoepfe));
  pruefe('linker Pfeil ist am Anfang aus', regal.linksAus);
  pruefe('rechter Pfeil ist am Anfang an', regal.rechtsAn);

  await seite.click('[data-railbox]:has(.kartei) [data-rail="1"]');
  await seite.waitForTimeout(700);
  const nachher = await seite.evaluate(() => ({
    pos: document.querySelector('.kartei').scrollLeft,
    linksAn: document.querySelector('[data-railbox]:has(.kartei) [data-rail="-1"]').disabled === false,
  }));
  pruefe('rechter Pfeil scrollt', nachher.pos > 20, `scrollLeft ${nachher.pos}`);
  pruefe('linker Pfeil schaltet sich danach frei', nachher.linksAn);

  // Die Ansicht wird bei jeder Zustandsänderung neu geschrieben. Vorher warf
  // das die gescrollte Reihe an den Anfang zurück, mitten im Blättern.
  await seite.evaluate(() => { window.madtv.session().dirty = true; });
  await seite.waitForTimeout(600);
  const ueberlebt = await seite.evaluate(() => document.querySelector('.kartei').scrollLeft);
  pruefe('die gescrollte Stelle überlebt das Neuzeichnen', Math.abs(ueberlebt - nachher.pos) < 5,
    `${nachher.pos} → ${ueberlebt}`);

  // Das Fenster steht noch offen. Escape räumt seit dem Umbau von innen nach
  // außen ab — der Rundgang beginnt aber im Flur, also erst zumachen.
  await seite.click('.fenster-zu');
  await seite.waitForTimeout(200);

  await raumRundgang(seite, meldungen);
  await seite.close();

  /* ── Schmale Ansichten: nichts darf seitlich überlaufen ── */
  for (const [name, breite, hoehe] of [['schmal', 500, 800], ['Telefon', 390, 844]]) {
    console.log(`\n${name} (${breite}×${hoehe})`);
    const mm = [];
    const s = await browser.newPage({ viewport: { width: breite, height: hoehe } });
    s.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    s.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(s);

    const lage = await s.evaluate(() => {
      const knoepfe = [...document.querySelectorAll('#bottom button')];
      return {
        ueberlauf: document.body.scrollWidth - document.body.clientWidth,
        gegenSichtbar: [...document.querySelectorAll('.gegen')].some((x) => x.offsetParent !== null),
        knoepfe: knoepfe.length,
        // Math.min() ohne Werte wäre Infinity und damit ein stillschweigendes Bestanden
        knopfHoehe: knoepfe.length
          ? Math.min(...knoepfe.map((b) => b.getBoundingClientRect().height)) : 0,
      };
    });
    pruefe(`${name}: kein seitlicher Überlauf`, lage.ueberlauf <= 1, `${lage.ueberlauf} px`);
    pruefe(`${name}: Gegenüber-Spalte weicht dem eigenen Plan`, lage.gegenSichtbar === (breite > 520));
    pruefe(`${name}: Etagenleiste ist da`, lage.knoepfe > 0);
    pruefe(`${name}: Schaltflächen sind mindestens 32 px hoch`, lage.knopfHoehe >= 32,
      `${Math.round(lage.knopfHoehe)} px`);
    pruefe(`${name}: keine Konsolenfehler`, mm.length === 0, mm.join(' | '));
    await s.close();
  }

  /* ── Der begehbare Raum ── */
  console.log('\nDein Büro als Szene');
  {
    const mm = [];
    const r = await browser.newPage({ viewport: { width: 1320, height: 980 } });
    r.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    r.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(r);
    await r.keyboard.press(' ');            // Uhr anhalten, sonst zeichnet es dazwischen
    await r.waitForTimeout(250);

    const sz = await r.evaluate(() => ({
      szene: !!document.querySelector('.raum-svg'),
      punkte: document.querySelectorAll('.hs').length,
      knoepfe: document.querySelectorAll('.raum-knopf').length,
      ohneNamen: [...document.querySelectorAll('.hs')].filter((x) => !x.getAttribute('aria-label')).length,
    }));
    pruefe('Dein Büro ist eine Szene', sz.szene);
    // Auch dieser Raum ist inzwischen ein Bild — dasselbe Argument wie beim
    // Chefbüro: Ein Bild, das nicht lädt, fällt sonst nicht auf.
    const grundBuero = await hintergrundBild(r);
    pruefe('sein Hintergrund ist ein aufgezogenes Bild',
      !!grundBuero?.geladen && grundBuero.breit > 300 && grundBuero.hoch > 300,
      JSON.stringify(grundBuero));
    // Stehendes Bild: Konsole und Leiste gehören daneben, nicht darunter.
    pruefe('bei stehendem Bild steht die Konsole daneben',
      await r.evaluate(() => {
        const sz2 = document.querySelector('.raum-bild').getBoundingClientRect();
        const se = document.querySelector('.raum-seite').getBoundingClientRect();
        return se.left >= sz2.right - 2;
      }));
    pruefe('sie hat sechs Klickpunkte', sz.punkte === 6, String(sz.punkte));
    pruefe('und dieselbe Zahl Knöpfe in der Leiste', sz.knoepfe === sz.punkte,
      `${sz.knoepfe} zu ${sz.punkte}`);
    pruefe('jeder Klickpunkt ist benannt', sz.ohneNamen === 0, String(sz.ohneNamen));

    // Jeder Punkt muss ein Fenster mit Inhalt öffnen — ein leeres wäre kaputt.
    for (const [f, erwartet] of [['sendeplan', 'Sendeplan'], ['koffer', 'Werbekoffer'],
      ['quote', 'Wer hat zugesehen'], ['bilanz', 'Bilanz des Tages'], ['lage', 'Marktlage']]) {
      await r.click(`[data-f="${f}"].hs`);
      await r.waitForTimeout(300);
      const w = await r.evaluate(() => ({
        titel: document.querySelector('.fenster-kopf h2')?.textContent ?? '',
        zeichen: (document.querySelector('.fenster-inhalt')?.textContent ?? '').trim().length,
        szeneBleibt: !!document.querySelector('.raum-svg'),
      }));
      pruefe(`«${erwartet}» öffnet sich mit Inhalt`,
        w.titel === erwartet && w.zeichen > 20 && w.szeneBleibt,
        `${w.titel} · ${w.zeichen} Zeichen`);
      await r.click('.fenster-zu');
      await r.waitForTimeout(200);
    }
    pruefe('geschlossen ist geschlossen',
      !(await r.evaluate(() => !!document.querySelector('.fenster'))));

    // Im Raum ist der Flur überflüssig — man steht ja drin.
    pruefe('der Flur weicht dem Raum',
      !(await r.evaluate(() => document.getElementById('world').offsetParent !== null)));

    // Die Konsole unter dem Bild: fünf Anzeigen, gefüllt
    const ko = await r.evaluate(() => ({
      da: !!document.querySelector('.konsole'),
      uhr: document.getElementById('k-uhr')?.textContent ?? '',
      quote: document.getElementById('k-quote')?.textContent ?? '',
      geld: document.getElementById('k-geld')?.textContent ?? '',
      tv: document.getElementById('k-tv-titel')?.textContent ?? '',
      couch: document.getElementById('k-couch')?.textContent ?? '',
    }));
    pruefe('die Sendekonsole steht unter dem Raum', ko.da);
    pruefe('ihre Uhr geht', /^\d\d:\d\d$/.test(ko.uhr), ko.uhr);
    pruefe('Marktanteil und Konto stehen darin',
      /%$/.test(ko.quote) && ko.geld.length > 1, `${ko.quote} · ${ko.geld}`);
    pruefe('der Vorschaumonitor sagt, was läuft', ko.tv.length > 3, ko.tv);
    pruefe('die Couch ist beschriftet', ko.couch.length > 0, ko.couch);

    // Der Sendeplan im Fenster ist derselbe wie vorher — samt Steckwand
    await r.click('[data-f="sendeplan"].hs');
    await r.waitForTimeout(350);
    const tafel = await r.evaluate(() => {
      const f = document.querySelector('.fenster');
      const i = document.querySelector('.fenster-inhalt');
      const m = document.getElementById('main').getBoundingClientRect();
      const fr = f.getBoundingClientRect();
      return {
        werbung: document.querySelectorAll('.fenster .pocket.ad').length,
        gegen: document.querySelectorAll('.fenster .gegen').length,
        breitAnteil: fr.width / m.width,
        hochAnteil: fr.height / m.height,
        scrollWeg: i.scrollHeight - i.clientHeight,
        tafelEigenerLauf: (() => {
          const g = document.querySelector('.fenster .board-grid');
          return g.scrollHeight > g.clientHeight + 2;
        })(),
      };
    });
    pruefe('die Steckwand im Fenster ist vollständig',
      tafel.werbung === 7 && tafel.gegen === 14,
      `${tafel.werbung} Werbeplätze, ${tafel.gegen} Gegenüber-Zeilen`);
    pruefe('das Fenster füllt die Inhaltsfläche',
      tafel.breitAnteil > 0.9 && tafel.hochAnteil > 0.9,
      `${Math.round(tafel.breitAnteil * 100)}×${Math.round(tafel.hochAnteil * 100)} %`);
    pruefe('und es lässt sich scrollen', tafel.scrollWeg > 40, `${tafel.scrollWeg} px Weg`);
    pruefe('nur eine Bildlaufleiste, nicht zwei', !tafel.tafelEigenerLauf);

    await r.evaluate(() => { document.querySelector('.fenster-inhalt').scrollTop = 99999; });
    await r.waitForTimeout(200);
    pruefe('das Scrollen kommt auch an',
      (await r.evaluate(() => document.querySelector('.fenster-inhalt').scrollTop)) > 40);
    await r.click('.fenster-zu');
    await r.waitForTimeout(200);

    // Die Tür führt zurück in den Flur
    await r.click('[aria-label^="Tür"].hs');
    await r.waitForTimeout(400);
    pruefe('die Tür führt in den Flur',
      (await r.evaluate(() => window.madtv.session().room)) === null);
    pruefe('Szene ohne Konsolenfehler', mm.length === 0, mm.join(' | '));
    await r.close();
  }

  /* ── Chefbüro: der zweite begehbare Raum ── */
  console.log('\nChefbüro');
  {
    const mm = [];
    const c = await browser.newPage({ viewport: { width: 1320, height: 980 } });
    c.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    c.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(c);
    await c.keyboard.press('Escape');
    await c.waitForTimeout(200);
    await c.click('[data-go="11"]');
    await angekommen(c);

    pruefe('das Chefbüro ist eine Szene',
      await c.evaluate(() => !!document.querySelector('.raum-svg')));
    pruefe('mit vier Klickpunkten',
      (await c.evaluate(() => document.querySelectorAll('.hs').length)) === 4);

    for (const [f, erwartet] of [['raffer', 'Herr Raffer'], ['ranking', 'Senderanking'],
      ['sammy', 'Sammy-Verleihung']]) {
      await c.click(`[data-f="${f}"].hs`);
      await c.waitForTimeout(300);
      const w = await c.evaluate(() => ({
        titel: document.querySelector('.fenster-kopf h2')?.textContent ?? '',
        zeichen: (document.querySelector('.fenster-inhalt')?.textContent ?? '').trim().length,
      }));
      pruefe(`«${erwartet}» öffnet sich mit Inhalt`,
        w.titel === erwartet && w.zeichen > 20, `${w.titel} · ${w.zeichen} Zeichen`);
      await c.click('.fenster-zu');
      await c.waitForTimeout(180);
    }

    // Der Raum ist der erste mit einem Bild statt einer Zeichnung. Ein Bild, das
    // nicht lädt, fällt sonst nicht auf: Die Klickpunkte lägen weiter da, nur
    // eben über einer leeren Fläche.
    const grund = await hintergrundBild(c);
    pruefe('der Hintergrund ist ein Bild', grund !== null);
    pruefe('und die Bildquelle lässt sich wirklich holen',
      grund?.geladen === true, JSON.stringify(grund));
    pruefe('und es ist tatsächlich aufgezogen',
      (grund?.breit ?? 0) > 300 && (grund?.hoch ?? 0) > 250,
      `${grund?.breit}×${grund?.hoch}`);
    pruefe('Chefbüro ohne Konsolenfehler', mm.length === 0, mm.join(' | '));
    await c.close();
  }

  /* ── Filmagentur ── */
  console.log('\nFilmagentur');
  {
    const mm = [];
    const f = await browser.newPage({ viewport: { width: 1320, height: 980 } });
    f.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    f.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(f);
    await f.keyboard.press('Escape');
    await f.waitForTimeout(200);
    await f.click('[data-go="4"]');
    await angekommen(f);

    pruefe('die Filmagentur ist eine Szene',
      await f.evaluate(() => !!document.querySelector('.raum-svg')));
    pruefe('mit fünf Klickpunkten',
      (await f.evaluate(() => document.querySelectorAll('.hs').length)) === 5);

    // Überlappungsfrei, damit die Leiste unter dem Bild nach Wichtigkeit
    // sortiert werden darf, ohne dass ein Punkt einen anderen verdeckt.
    const doppelt = await f.evaluate(() => {
      const r = [...document.querySelectorAll('.hs-feld')].map((e) => ({
        n: e.parentElement.getAttribute('aria-label').split(' —')[0],
        x: +e.getAttribute('x'), y: +e.getAttribute('y'),
        w: +e.getAttribute('width'), h: +e.getAttribute('height'),
      }));
      const treffer = [];
      for (let i = 0; i < r.length; i++) {
        for (let j = i + 1; j < r.length; j++) {
          const a = r[i]; const b = r[j];
          if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
            treffer.push(`${a.n}/${b.n}`);
          }
        }
      }
      return treffer;
    });
    pruefe('keine zwei Klickpunkte überlappen sich', doppelt.length === 0, doppelt.join(', '));

    // Auktion und Paket dürfen leer sein — es läuft nicht immer eine
    // Versteigerung. Leer heißt hier trotzdem: ein Fenster mit einer Erklärung
    // darin, nicht eine weiße Fläche.
    for (const [welches, erwartet, mindestens] of [
      ['katalog', 'Filmkatalog', 200],
      ['auktion', 'Auktion', 20],
      ['paket', 'Exklusivpaket', 20],
      ['trend', 'Genre-Konjunktur', 20],
    ]) {
      await f.click(`[data-f="${welches}"].hs`);
      await f.waitForTimeout(300);
      const w = await f.evaluate(() => ({
        titel: document.querySelector('.fenster-kopf h2')?.textContent ?? '',
        zeichen: (document.querySelector('.fenster-inhalt')?.textContent ?? '').trim().length,
      }));
      pruefe(`«${erwartet}» öffnet sich mit Inhalt`,
        w.titel === erwartet && w.zeichen >= mindestens, `${w.titel} · ${w.zeichen} Zeichen`);
      await f.click('.fenster-zu');
      await f.waitForTimeout(180);
    }

    // Der Katalog ist der Grund, warum es diesen Raum gibt: Ohne die Schachteln
    // im Fenster kann man nichts kaufen.
    await f.click('[data-f="katalog"].hs');
    await f.waitForTimeout(300);
    pruefe('im Katalog stehen Filmschachteln',
      (await f.evaluate(() => document.querySelectorAll('.fenster .boxcase').length)) > 3);
    pruefe('und der Genre-Filter ist dabei',
      (await f.evaluate(() => document.querySelectorAll('.fenster [data-act="filmfilter"]').length)) > 1);

    // Das Filmregal ist die längste Reihe im Haus und hatte als einzige keine
    // Pfeile — mit der Maus sah man acht Abendfüller von neunzehn.
    const bretter = await f.evaluate(() => [...document.querySelectorAll('.wall-shelf')].map((s) => {
      const r = s.querySelector('.wall-row');
      const kn = [...s.querySelectorAll('[data-rail]')];
      return { ueber: r.scrollWidth > r.clientWidth + 4, pfeile: kn.length, rechtsAn: !kn[1]?.disabled };
    }));
    pruefe('jedes Regalbrett hat zwei Pfeile',
      bretter.length > 0 && bretter.every((b) => b.pfeile === 2), JSON.stringify(bretter));
    pruefe('ein überlaufendes Brett bietet den rechten Pfeil an',
      bretter.filter((b) => b.ueber).every((b) => b.rechtsAn), JSON.stringify(bretter));
    pruefe('ein Brett, das hineinpasst, schaltet beide ab',
      bretter.filter((b) => !b.ueber).every((b) => !b.rechtsAn), JSON.stringify(bretter));

    const langes = bretter.findIndex((b) => b.ueber);
    if (langes >= 0) {
      await f.evaluate((i) => document.querySelectorAll('.wall-shelf')[i]
        .querySelector('[data-rail="1"]').click(), langes);
      await f.waitForTimeout(700);
      const nach = await f.evaluate((i) => {
        const s = document.querySelectorAll('.wall-shelf')[i];
        return { pos: Math.round(s.querySelector('.wall-row').scrollLeft),
          linksAn: !s.querySelector('[data-rail="-1"]').disabled };
      }, langes);
      pruefe('der rechte Pfeil schiebt das Filmregal', nach.pos > 20, `scrollLeft ${nach.pos}`);
      pruefe('und der linke schaltet sich danach frei', nach.linksAn);
    }

    // Escape ging vorher eine Stufe zu weit: Bei offenem Fenster warf es einen
    // gleich aus dem Raum in den Flur.
    await f.keyboard.press('Escape');
    await f.waitForTimeout(250);
    const nachEsc = await f.evaluate(() => ({
      raum: window.madtv.session().room,
      fenster: !!document.querySelector('.fenster'),
    }));
    pruefe('Escape schließt erst das Fenster', !nachEsc.fenster && nachEsc.raum === 'film',
      `Raum ${nachEsc.raum}, Fenster ${nachEsc.fenster}`);
    await f.keyboard.press('Escape');
    await f.waitForTimeout(250);
    pruefe('und erst das zweite verlässt den Raum',
      (await f.evaluate(() => window.madtv.session().room)) === null);

    await f.click('[data-go="4"]');
    await angekommen(f);
    const grundF = await hintergrundBild(f);
    pruefe('die Bildquelle lässt sich wirklich holen',
      grundF?.geladen === true, JSON.stringify(grundF));
    pruefe('und es ist tatsächlich aufgezogen',
      (grundF?.breit ?? 0) > 300 && (grundF?.hoch ?? 0) > 300,
      `${grundF?.breit}×${grundF?.hoch}`);
    pruefe('Filmagentur ohne Konsolenfehler', mm.length === 0, mm.join(' | '));
    await f.close();
  }

  /* ── Freier Aufbau: die Uhr darf einen nicht mehr festhalten ── */
  console.log('\nFreier Aufbau');
  {
    const mm = [];
    const s = await browser.newPage({ viewport: { width: 1240, height: 950 } });
    s.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    s.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });

    // Erst die Gegenprobe: ohne den Schalter bleibt der Fahrstuhl stehen.
    await starte(s);
    pruefe('Freier Aufbau ist nicht vorbelegt',
      !(await s.evaluate(() => window.madtv.session().g.opt.godMode)));
    pruefe('ohne ihn bleibt die Kopfzeile still',
      !(await s.evaluate(() => document.querySelector('#t-freibau')?.offsetParent !== null)));
    await s.keyboard.press(' ');
    await s.waitForTimeout(250);
    await s.keyboard.press('Escape');
    await s.waitForTimeout(200);
    await s.click('[data-go="4"]');
    await s.waitForTimeout(1200);
    pruefe('bei stehender Uhr fährt der Fahrstuhl sonst nicht',
      (await s.evaluate(() => window.madtv.session().elevBusy)) > 0);
    await s.close();

    const t = await browser.newPage({ viewport: { width: 1240, height: 950 } });
    t.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    t.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await t.goto(`http://localhost:${PORT}/`);
    await t.waitForSelector('#gobtn');
    pruefe('der Schalter steht auf dem Startbildschirm', await t.isVisible('[data-o="godMode"]'));
    await t.click('[data-o="godMode"]');
    await t.click('#gobtn');
    await t.waitForTimeout(400);
    for (let i = 0; i < 5; i++) {
      if (await t.isVisible('#modal.on')) await t.click('#mbox .mf button:last-child');
      await t.waitForTimeout(150);
    }
    pruefe('die Kopfzeile sagt, dass er an ist',
      await t.evaluate(() => document.querySelector('#t-freibau')?.offsetParent !== null));

    await t.keyboard.press(' ');
    await t.waitForTimeout(250);
    const vorher = await t.evaluate(() => window.madtv.session().g.time);
    pruefe('die Uhr steht', await t.evaluate(() => window.madtv.session().paused));

    await t.keyboard.press('Escape');
    await t.waitForTimeout(200);
    await t.click('[data-go="4"]');
    let kam = true;
    await t.waitForFunction(() => window.madtv.session().elevBusy === 0, { timeout: 8000 })
      .catch(() => { kam = false; });
    await t.waitForTimeout(300);
    pruefe('man kommt trotzdem an', kam
      && (await t.evaluate(() => window.madtv.session().room)) === 'film');
    pruefe('die Uhr steht danach immer noch',
      await t.evaluate(() => window.madtv.session().paused));
    pruefe('die Fahrt kostet keine Sendezeit',
      (await t.evaluate(() => window.madtv.session().g.time)) === vorher);

    // Seit die Filmagentur eine Szene ist, liegen die Schachteln nicht mehr
    // offen im Panel, sondern im Laptop. Der Weg zum Kauf ist damit einen
    // Klick länger — und genau der muss bei stehender Uhr auch gehen.
    await t.click('[data-f="katalog"].hs');
    await t.waitForTimeout(300);
    const lizenzen = await t.evaluate(() => {
      const vor = window.madtv.session().g.player.licences.length;
      document.querySelector('.fenster .boxcase:not(.owned)')?.click();
      return vor;
    });
    await t.waitForTimeout(500);
    if (await t.isVisible('#modal.on')) { await t.click('#mbox .mf button:first-child'); await t.waitForTimeout(400); }
    pruefe('und organisieren geht bei stehender Uhr auch',
      (await t.evaluate(() => window.madtv.session().g.player.licences.length)) > lizenzen);
    pruefe('Freier Aufbau ohne Konsolenfehler', mm.length === 0, mm.join(' | '));
    await t.close();
  }

  /* ── Werbeagentur ── */
  console.log('\nWerbeagentur');
  {
    const mm = [];
    const w = await browser.newPage({ viewport: { width: 1320, height: 1600 } });
    w.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    w.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(w);
    await w.keyboard.press('Escape');
    await w.waitForTimeout(200);
    await w.click('[data-go="5"]');
    await angekommen(w);

    pruefe('die Werbeagentur ist eine Szene',
      await w.evaluate(() => !!document.querySelector('.raum-svg')));
    pruefe('mit fünf Klickpunkten',
      (await w.evaluate(() => document.querySelectorAll('.hs').length)) === 5);
    const wDoppelt = await w.evaluate(() => {
      const r = [...document.querySelectorAll('.hs-feld')].map((e) => ({
        n: e.parentElement.getAttribute('aria-label').split(' —')[0],
        x: +e.getAttribute('x'), y: +e.getAttribute('y'),
        w: +e.getAttribute('width'), h: +e.getAttribute('height'),
      }));
      const t = [];
      for (let i = 0; i < r.length; i++) {
        for (let j = i + 1; j < r.length; j++) {
          const a = r[i]; const b = r[j];
          if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
            t.push(`${a.n}/${b.n}`);
          }
        }
      }
      return t;
    });
    pruefe('keine zwei Klickpunkte überlappen sich', wDoppelt.length === 0, wDoppelt.join(', '));

    // Kartei und Koffer öffnen dasselbe Fenster — sonst wäre die Ziehgeste
    // zwischen ihnen nicht mehr fahrbar.
    for (const welches of ['kartei', 'koffer']) {
      const knopf = await w.$(`[data-f="kartei"].hs`);
      pruefe(`«${welches}» führt zur Kundenkartei`, knopf !== null);
    }
    await w.click('[data-f="kartei"].hs');
    await w.waitForTimeout(350);
    const arbeit = await w.evaluate(() => ({
      titel: document.querySelector('.fenster-kopf h2')?.textContent ?? '',
      karten: document.querySelectorAll('.fenster [data-drag="kunde"]').length,
      faecher: document.querySelectorAll('.fenster [data-drop="koffer"]').length,
    }));
    pruefe('Kundenkartei öffnet sich', arbeit.titel === 'Kundenkartei', arbeit.titel);
    pruefe('Karten und Kofferfächer liegen im selben Fenster',
      arbeit.karten > 0 && arbeit.faecher > 0, JSON.stringify(arbeit));

    // Der Kern des Raums: eine Karte in ein Fach ziehen.
    const karte = await w.$('.fenster [data-drag="kunde"]');
    const fach = await w.$('.fenster [data-drop="koffer"]');
    if (karte && fach) {
      await karte.scrollIntoViewIfNeeded();
      await w.waitForTimeout(200);
      const ka = await karte.boundingBox();
      const fa = await fach.boundingBox();
      const vertraege = () => w.evaluate(() => window.madtv.session().g.player.contracts.length);
      const vorher = await vertraege();
      pruefe('Karte und Fach sind gleichzeitig sichtbar', ka.y > 60 && fa.y > 60,
        `Karte y=${Math.round(ka.y)}, Fach y=${Math.round(fa.y)}`);
      await w.mouse.move(ka.x + ka.width / 2, ka.y + ka.height / 2);
      await w.mouse.down();
      await w.mouse.move(ka.x + ka.width / 2 + 30, ka.y + ka.height / 2 + 10, { steps: 8 });
      await w.mouse.move(fa.x + fa.width / 2, fa.y + fa.height / 2, { steps: 14 });
      pruefe('das Kofferfach meldet sich als Ziel',
        (await w.evaluate(() => document.querySelectorAll('.drop-ok').length)) > 0);
      await w.mouse.up();
      await w.waitForTimeout(600);
      pruefe('und der Vertrag liegt danach im Koffer',
        (await vertraege()) > vorher, `Verträge ${vorher} → ${await vertraege()}`);
    }
    await w.click('.fenster-zu');
    await w.waitForTimeout(200);

    await w.click('[data-f="zielgruppen"].hs');
    await w.waitForTimeout(350);
    const zg = await w.evaluate(() => ({
      titel: document.querySelector('.fenster-kopf h2')?.textContent ?? '',
      zeilen: document.querySelectorAll('.fenster .zg-zeile').length,
      werte: [...document.querySelectorAll('.fenster .zg-wert')].map((e) => e.textContent),
    }));
    pruefe('der Monitor zeigt alle sechs Zielgruppen', zg.zeilen === 6, String(zg.zeilen));
    pruefe('und für jede eine Zuschauerzahl',
      zg.werte.length === 6 && zg.werte.every((t) => /\d/.test(t)), zg.werte.join(' · '));
    await w.click('.fenster-zu');
    await w.waitForTimeout(200);

    const grundW = await hintergrundBild(w);
    pruefe('die Bildquelle lässt sich wirklich holen',
      grundW?.geladen === true, JSON.stringify(grundW));
    pruefe('Werbeagentur ohne Konsolenfehler', mm.length === 0, mm.join(' | '));
    await w.close();
  }

  /* ── Ziehen im Fenster ──
     Für die Räume, die noch Szenen werden sollen, hängt der Zuschnitt daran:
     Die Werbeagentur lebt davon, eine Karte aus der Kartei in den Koffer zu
     ziehen. Lägen die beiden in getrennten Fenstern, wäre die Geste kaputt —
     und die Frage, ob sie im Fenster überhaupt geht, war unbeantwortet.

     Das Fenster ist hier absichtlich hoch: Quelle und Ziel müssen gleichzeitig
     sichtbar sein, sonst misst man das Scrollen statt des Ziehens. */
  console.log('\nZiehen im Fenster');
  {
    const mm = [];
    const d = await browser.newPage({ viewport: { width: 1320, height: 1600 } });
    d.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    d.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(d);

    // Eine Lizenz besorgen — ohne Kassette gibt es nichts zu ziehen.
    await d.keyboard.press('Escape');
    await d.waitForTimeout(200);
    await d.click('[data-go="4"]');
    await angekommen(d);
    await d.click('[data-f="katalog"].hs');
    await d.waitForTimeout(350);
    await d.click('.fenster .boxcase:not(.owned)');
    await d.waitForTimeout(400);
    if (await d.isVisible('#modal.on')) {
      await d.click('#mbox .mf button:first-child');
      await d.waitForTimeout(400);
    }
    pruefe('eine Lizenz liegt im Regal',
      (await d.evaluate(() => window.madtv.session().g.player.licences.length)) > 0);

    await d.keyboard.press('Escape');
    await d.waitForTimeout(200);
    await d.click('#bottom [data-f="6"]');
    await angekommen(d);
    await d.click('[data-f="sendeplan"].hs');
    await d.waitForTimeout(400);

    const quelle = await d.$('.fenster [data-drag="prog"]');
    const ziel = await d.$('.fenster [data-drop="prog"]');
    pruefe('im Sendeplan-Fenster liegt eine Kassette', quelle !== null);
    pruefe('und ein freier Sendeplatz', ziel !== null);

    if (quelle && ziel) {
      await quelle.scrollIntoViewIfNeeded();
      await d.waitForTimeout(250);
      const a = await quelle.boundingBox();
      const z = await ziel.boundingBox();
      const belegt = () => d.evaluate(() => window.madtv.core
        .getDay(window.madtv.session().g.player, window.madtv.session().g.day)
        .filter((f) => f.prog).length);
      const vorher = await belegt();

      // Beide müssen im Bild sein, sonst prüft man die eigene Messung.
      pruefe('Kassette und Sendeplatz sind gleichzeitig sichtbar',
        a.y > 60 && z.y > 60, `Kassette y=${Math.round(a.y)}, Platz y=${Math.round(z.y)}`);

      await d.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await d.mouse.down();
      // Erst ein Stück, damit der Zug überhaupt anspringt (er braucht > 6 px),
      // dann zum Ziel.
      await d.mouse.move(a.x + a.width / 2 + 30, a.y + a.height / 2 + 10, { steps: 8 });
      pruefe('der Zug springt an',
        await d.evaluate(() => document.body.classList.contains('dragging')));
      await d.mouse.move(z.x + z.width / 2, z.y + z.height / 2, { steps: 14 });
      pruefe('der Sendeplatz meldet sich als gültiges Ziel',
        (await d.evaluate(() => document.querySelectorAll('.drop-ok').length)) > 0);
      await d.mouse.up();
      await d.waitForTimeout(600);

      pruefe('und die Sendung liegt danach im Plan',
        (await belegt()) > vorher, `belegt ${vorher} → ${await belegt()}`);
      pruefe('der Geist ist wieder weg',
        await d.evaluate(() => !document.querySelector('.drag-ghost')
          && !document.body.classList.contains('dragging')));
    }
    pruefe('Ziehen im Fenster ohne Konsolenfehler', mm.length === 0, mm.join(' | '));
    await d.close();
  }

  /* ── Hoch- und Querformat ──
     Der begehbare Raum ordnet sich nach der Form des Fensters: quer wandern
     Konsole und Knopfleiste neben das Bild, hochkant darunter. Beide Male gilt
     dasselbe Versprechen — nichts läuft seitlich hinaus, und die Knöpfe der
     Szene bleiben ohne Umweg erreichbar. Die Werte stehen hier als Messung,
     nicht als Wunsch: Sie sind an echten Geräteformaten abgenommen. */
  console.log('\nHoch- und Querformat');
  for (const [name, breite, hoehe, daneben] of [
    ['Schreibtisch quer', 1320, 980, true],
    ['Tablet quer', 1024, 768, true],
    ['Telefon quer', 844, 390, true],
    ['Tablet hoch', 834, 1112, false],
    ['Telefon hoch', 390, 844, false],
  ]) {
    const mm = [];
    const o = await browser.newPage({ viewport: { width: breite, height: hoehe } });
    o.on('pageerror', (e) => mm.push('Ausnahme: ' + e.message));
    o.on('console', (m) => { if (m.type() === 'error') mm.push('Konsole: ' + m.text()); });
    await starte(o);
    // Ohne das bliebe der Zeiger auf einem Klickpunkt stehen und dessen
    // Schildchen verfälschte die Messung.
    await o.mouse.move(3, 3);
    await o.waitForTimeout(250);

    const lage = await o.evaluate(() => {
      const kasten = document.querySelector('.raum-bild')?.getBoundingClientRect();
      const seite = document.querySelector('.raum-seite')?.getBoundingClientRect();
      const knopf = [...document.querySelectorAll('.raum-knopf')].pop();
      const spalte = document.querySelector('.raum-seite');
      const nav = document.getElementById('bottom').getBoundingClientRect();
      const main = document.getElementById('main');
      return {
        bild: !!kasten,
        // Rechts vom Bild statt darunter — das unterscheidet die beiden Lagen.
        daneben: kasten && seite ? seite.left >= kasten.right - 2 : null,
        ueberlauf: document.body.scrollWidth - document.body.clientWidth,
        // Der Raum selbst soll nie die ganze Seite scrollen lassen.
        seiteScrollt: main.scrollHeight > main.clientHeight + 2,
        // Erreichbar heißt: sichtbar, oder in der Spalte daneben erscrollbar.
        knopfFrei: knopf
          ? knopf.getBoundingClientRect().bottom <= nav.top + 1
            || (!!spalte && spalte.scrollHeight > spalte.clientHeight + 2)
          : false,
      };
    });

    pruefe(`${name}: der Raum ist eine Szene`, lage.bild);
    pruefe(`${name}: Konsole ${daneben ? 'neben' : 'unter'} dem Bild`,
      lage.daneben === daneben, `daneben=${lage.daneben}`);
    pruefe(`${name}: kein seitlicher Überlauf`, lage.ueberlauf <= 1, `${lage.ueberlauf} px`);
    pruefe(`${name}: die Seite scrollt nicht als Ganzes`, !lage.seiteScrollt);
    pruefe(`${name}: die Knöpfe der Szene sind erreichbar`, lage.knopfFrei);
    pruefe(`${name}: keine Konsolenfehler`, mm.length === 0, mm.join(' | '));
    await o.close();
  }

  await browser.close();
  srv.close();

  console.log(`\n${zahl - fehler.length}/${zahl} Prüfungen bestanden.`);
  if (fehler.length) {
    console.error('\nFehlgeschlagen:\n  ' + fehler.join('\n  '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
